// cypress/support/commands.js

// Safely parses JSON strings without throwing.
function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// Matches any Amplitude ingestion endpoint (US, EU, and /batch variants).
function isAmplitudeHttpApi(url) {
  return (
    typeof url === "string" &&
    url.includes("amplitude.com") &&
    (url.includes("/2/") || url.includes("/batch"))
  );
}

// Stores captured Amplitude requests and individual events on window.
function pushCapturedEvents(win, payload) {
  win.__capturedAmplitude = win.__capturedAmplitude || { requests: [], events: [], urls: [], fetchCalls: [] };
  win.__capturedAmplitude.requests.push(payload);
  if (payload && Array.isArray(payload.events)) {
    payload.events.forEach((evt) => win.__capturedAmplitude.events.push(evt));
  }
}

// Reads a ReadableStream, optionally decompressing gzip, and returns the text.
// Used to extract the request body when the Amplitude SDK compresses it before sending.
async function readStream(win, stream, encoding) {
  let readable = stream;
  if (encoding === "gzip" && win.DecompressionStream) {
    readable = stream.pipeThrough(new win.DecompressionStream("gzip"));
  }
  return new win.Response(readable).text();
}

// Installs network interception for fetch, sendBeacon, and XMLHttpRequest.
// Handles both plain JSON bodies and gzip-compressed ReadableStream bodies (Amplitude SDK v2+).
function installAmplitudeNetworkCapture(win) {
  win.__capturedAmplitude = { requests: [], events: [], urls: [], fetchCalls: [] };

  const originalFetch = win.fetch;
  if (typeof originalFetch === "function") {
    win.fetch = function (...args) {
      try {
        const [input, init] = args;
        const url = typeof input === "string" ? input : input?.url;

        // Record all amplitude.com fetch calls for diagnostics
        if (typeof url === "string" && url.includes("amplitude.com")) {
          const bodyVal = init?.body;
          const _isStream = !!(bodyVal && typeof bodyVal === "object" && typeof bodyVal.tee === "function");
          const _isBytes = !!(bodyVal && typeof bodyVal === "object" && !_isStream &&
            (bodyVal instanceof win.ArrayBuffer ||
             (win.ArrayBuffer && win.ArrayBuffer.isView && win.ArrayBuffer.isView(bodyVal))));
          const _enc = (init?.headers && typeof init.headers.get === "function"
            ? init.headers.get("content-encoding")
            : init?.headers?.["content-encoding"]) || "";
          win.__capturedAmplitude.fetchCalls.push({
            url,
            bodyType: bodyVal === null ? "null" : typeof bodyVal,
            bodyIsStream: _isStream,
            bodyIsBytes: _isBytes,
            encoding: _enc,
          });
        }

        if (isAmplitudeHttpApi(url)) {
          win.__capturedAmplitude.urls.push(url);
          const body = init?.body;
          const encoding =
            (init?.headers && typeof init.headers.get === "function"
              ? init.headers.get("content-encoding")
              : init?.headers?.["content-encoding"]) || "";

          if (body && typeof body === "object" && typeof body.tee === "function") {
            // ReadableStream — tee so the real fetch still receives the data.
            const [ourStream, theirStream] = body.tee();
            ;(async () => {
              try {
                const text = await readStream(win, ourStream, encoding);
                const parsed = tryParseJson(text);
                if (parsed) pushCapturedEvents(win, parsed);
              } catch {}
            })();
            return originalFetch.call(this, input, { ...init, body: theirStream });

          } else if (body && typeof body === "object" &&
                     (body instanceof win.ArrayBuffer ||
                      (win.ArrayBuffer && win.ArrayBuffer.isView && win.ArrayBuffer.isView(body)))) {
            // Uint8Array / ArrayBuffer: Amplitude SDK compressed bytes. Always try gzip — the SDK
            // may not set Content-Encoding even when the body is compressed.
            ;(async () => {
              try {
                const chunk = body instanceof win.ArrayBuffer
                  ? new win.Uint8Array(body)
                  : body;
                const readable = new win.ReadableStream({
                  start(controller) { controller.enqueue(chunk); controller.close(); }
                });
                let text;
                if (win.DecompressionStream) {
                  const [s1, s2] = readable.tee();
                  try {
                    text = await new win.Response(s1.pipeThrough(new win.DecompressionStream("gzip"))).text();
                  } catch {
                    win.__capturedAmplitude._bytesNote = "gzip-fallback";
                    text = await new win.Response(s2).text();
                  }
                } else {
                  win.__capturedAmplitude._bytesNote = "no-DecompressionStream";
                  text = await new win.Response(readable).text();
                }
                const parsed = tryParseJson(text);
                if (parsed) {
                  pushCapturedEvents(win, parsed);
                } else {
                  win.__capturedAmplitude._bytesNote = (win.__capturedAmplitude._bytesNote || "") + "|json-null:" + (text || "").slice(0, 40);
                }
              } catch (err) {
                win.__capturedAmplitude._bytesNote = "catch:" + String(err);
              }
            })();

          } else if (win.Blob && body instanceof win.Blob) {
            ;(async () => {
              try {
                const bytes = new win.Uint8Array(await body.arrayBuffer());
                const readable = new win.ReadableStream({
                  start(controller) { controller.enqueue(bytes); controller.close(); }
                });
                const text = await readStream(win, readable, encoding);
                const parsed = tryParseJson(text);
                if (parsed) pushCapturedEvents(win, parsed);
              } catch {}
            })();

          } else if (typeof body === "string") {
            const parsed = tryParseJson(body);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              pushCapturedEvents(win, parsed);
            }
          }
        }
      } catch {}
      return originalFetch.apply(this, args);
    };
  }

  const originalBeacon = win.navigator?.sendBeacon;
  if (typeof originalBeacon === "function") {
    win.navigator.sendBeacon = function (url, data) {
      try {
        if (isAmplitudeHttpApi(url)) {
          win.__capturedAmplitude.urls.push(url);
          const parsed = typeof data === "string" ? tryParseJson(data) : data;
          if (parsed) pushCapturedEvents(win, parsed);
        }
      } catch {}
      return originalBeacon.apply(this, arguments);
    };
  }

  const OriginalXHR = win.XMLHttpRequest;
  if (typeof OriginalXHR === "function") {
    function PatchedXHR() {
      const xhr = new OriginalXHR();
      let requestUrl = "";
      let requestMethod = "";
      const originalOpen = xhr.open;
      const originalSend = xhr.send;

      xhr.open = function (method, url, ...rest) {
        requestMethod = method;
        requestUrl = url;
        return originalOpen.call(this, method, url, ...rest);
      };

      xhr.send = function (body) {
        try {
          if (
            String(requestMethod).toUpperCase() === "POST" &&
            isAmplitudeHttpApi(requestUrl)
          ) {
            win.__capturedAmplitude.urls.push(requestUrl);
            const parsed = typeof body === "string" ? tryParseJson(body) : body;
            if (parsed) pushCapturedEvents(win, parsed);
          }
        } catch {}
        return originalSend.call(this, body);
      };

      return xhr;
    }
    win.XMLHttpRequest = PatchedXHR;
  }
}

// Returns hostname from Cypress baseUrl if defined.
function getBaseUrlHost() {
  try {
    const baseUrl = Cypress.config("baseUrl");
    if (!baseUrl) return null;
    return new URL(baseUrl).hostname;
  } catch {
    return null;
  }
}

// Returns domains where OneTrust consent cookies should be applied.
function getConsentDomains() {
  const domains = new Set(["qa.commonsense.org", "www.commonsense.org"]);
  const baseHost = getBaseUrlHost();
  if (baseHost) domains.add(baseHost);
  return Array.from(domains);
}

// Sets OneTrust cookies to enable analytics tracking before page load.
Cypress.Commands.add("setOneTrustAnalyticsConsent", () => {
  const now = new Date();
  const domains = getConsentDomains();

  const consentValue =
    "isIABGlobal=false" +
    "&datestamp=" +
    encodeURIComponent(now.toString()) +
    "&version=202401.1.0" +
    "&consentId=cypress-consent" +
    "&interactionCount=1" +
    "&groups=" +
    encodeURIComponent("C0001:1,C0002:1") +
    "&AwaitingReconsent=false";

  domains.forEach((domain) => {
    cy.setCookie("OptanonAlertBoxClosed", "true", { domain, secure: true });
    cy.setCookie("OptanonConsent", consentValue, { domain, secure: true });
    cy.setCookie("OptanonActiveGroups", ",C0001,C0002,", { domain, secure: true });
  });
});

// Module-level buffer for proxy-level intercept (backup for non-stream bodies).
const _ampBuffer = { events: [], urls: [], debug: [] };

// Visits a page, installs Amplitude capture, and sets up a proxy-level backup intercept.
Cypress.Commands.add("visitWithAmplitudeCapture", (path, visitOptions = {}) => {
  _ampBuffer.events.length = 0;
  _ampBuffer.urls.length = 0;
  _ampBuffer.debug.length = 0;

  // Proxy-level intercept: backup for non-stream requests; also records debug info.
  cy.intercept("POST", /amplitude\.com/, (req) => {
    try {
      _ampBuffer.urls.push(req.url);
      _ampBuffer.debug.push({
        url: req.url,
        bodyType: req.body === null ? "null" : typeof req.body,
        bodyKeys:
          typeof req.body === "object" && req.body !== null && !Array.isArray(req.body)
            ? Object.keys(req.body).join(",")
            : "",
        bodyPreview:
          req.body === null
            ? "NULL"
            : typeof req.body === "string"
            ? req.body.slice(0, 100)
            : JSON.stringify(req.body).slice(0, 100),
        encoding: (req.headers && req.headers["content-encoding"]) || "",
      });

      // Only attempt body parse if Cypress decoded a non-empty object
      const body = req.body;
      if (body && typeof body === "object" && !Array.isArray(body) && Object.keys(body).length > 0) {
        const events = body.events || body.e;
        if (Array.isArray(events)) {
          events.forEach((evt) => _ampBuffer.events.push(evt));
        }
      }
    } catch {}
    req.continue();
  });

  const userOnBeforeLoad = visitOptions.onBeforeLoad;
  cy.visit(path, {
    ...visitOptions,
    onBeforeLoad(win) {
      installAmplitudeNetworkCapture(win);
      if (typeof userOnBeforeLoad === "function") {
        userOnBeforeLoad(win);
      }
    },
  });
});

// Returns captured Amplitude events, merging window-level and proxy-level captures.
Cypress.Commands.add("getCapturedAmplitudeEvents", (eventType = null, newestFirst = false) => {
  return cy.window({ log: false }).then((win) => {
    const fromWindow = (win.__capturedAmplitude || {}).events || [];

    const seen = new Set();
    const combined = [];
    for (const evt of [...fromWindow, ..._ampBuffer.events]) {
      const key = evt?.insert_id;
      if (key) {
        if (seen.has(key)) continue;
        seen.add(key);
      }
      combined.push(evt);
    }

    let events = combined;
    if (eventType) {
      events = events.filter((e) => e?.event_type === eventType);
    }
    if (newestFirst) {
      events = [...events].sort((a, b) => {
        const at = typeof a?.time === "number" ? a.time : 0;
        const bt = typeof b?.time === "number" ? b.time : 0;
        return bt - at;
      });
    }
    return events;
  });
});

// Provides a minimal event summary for debug output.
function summarizeEvent(evt) {
  const p = evt?.event_properties || {};
  return {
    event_type: evt?.event_type,
    page_url_path: p.page_url_path,
    interaction_type: p.interaction_type,
  };
}

// Builds the diagnostic footer appended to timeout error messages.
function buildDiagnostics(win) {
  const amp = win.__capturedAmplitude || {};
  const allUrls = [...new Set([...(amp.urls || []), ..._ampBuffer.urls])];
  const urlHint = allUrls.length
    ? `\n  Amplitude URLs : ${allUrls.join(", ")}`
    : "\n  Amplitude URLs : (none)";

  const fetchCalls = amp.fetchCalls || [];
  const streamCalls = fetchCalls.filter((c) => c.bodyIsStream);
  const bytesCalls = fetchCalls.filter((c) => c.bodyIsBytes);
  const bytesNote = amp._bytesNote || "";
  const fetchHint =
    streamCalls.length > 0
      ? `\n  Stream fetch   : ${streamCalls.length} gzip-stream call(s) to ${streamCalls[0].url}`
      : bytesCalls.length > 0
      ? `\n  Bytes fetch    : ${bytesCalls.length} call(s) to ${bytesCalls[0].url} [enc:${bytesCalls[0].encoding || "none"}]${bytesNote ? " | " + bytesNote : ""}`
      : fetchCalls.length > 0
      ? `\n  Window fetch() : ${fetchCalls.map((c) => `${c.url} [${c.bodyType}]`).join(" | ")}`
      : "\n  Window fetch() : (none for amplitude.com)";

  return urlHint + fetchHint;
}

// Waits for a specific Amplitude event.
Cypress.Commands.add("waitForAmplitudeEvent", (eventType, predicate = null, timeoutMs = 60000) => {
  const start = Date.now();

  const poll = () => {
    return cy.getCapturedAmplitudeEvents().then((events) => {
      const matches = events.filter((e) => e?.event_type === eventType);
      const filtered =
        typeof predicate === "function"
          ? matches.filter((e) => {
              try {
                return !!predicate(e);
              } catch {
                return false;
              }
            })
          : matches;

      if (filtered.length > 0) {
        return filtered[filtered.length - 1];
      }

      if (Date.now() - start > timeoutMs) {
        return cy.window({ log: false }).then((win) => {
          const seen = [...new Set(events.map((e) => e?.event_type).filter(Boolean))];
          const diag = buildDiagnostics(win);

          if (matches.length > 0 && typeof predicate === "function") {
            const summary = summarizeEvent(matches[matches.length - 1]);
            throw new Error(
              `Amplitude event captured but predicate did not match: ${eventType}. ` +
                `Captured ${matches.length} event(s). Seen: ${seen.join(", ") || "(none)"}` +
                diag +
                `\n  Last event     : ${JSON.stringify(summary)}`
            );
          }

          throw new Error(
            `Amplitude event not captured: ${eventType}. ` +
              `Seen: ${seen.join(", ") || "(none)"}` +
              diag
          );
        });
      }

      return cy.wait(500, { log: false }).then(poll);
    });
  };

  return poll();
});
