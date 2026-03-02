// cypress/support/commands.js

// Safely parses JSON strings without throwing.
function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// Determines whether a request URL is the Amplitude HTTP v2 ingestion endpoint.
function isAmplitudeHttpApi(url) {
  return typeof url === "string" && url.includes("api2.amplitude.com/2/");
}

// Stores captured Amplitude requests and individual events on window.
function pushCapturedEvents(win, payload) {
  win.__capturedAmplitude = win.__capturedAmplitude || { requests: [], events: [] };

  win.__capturedAmplitude.requests.push(payload);

  if (payload && Array.isArray(payload.events)) {
    payload.events.forEach((evt) => {
      win.__capturedAmplitude.events.push(evt);
    });
  }
}

// Installs network interception for fetch, sendBeacon, and XMLHttpRequest.
// This ensures Amplitude events are captured regardless of transport mechanism.
function installAmplitudeNetworkCapture(win) {
  win.__capturedAmplitude = { requests: [], events: [] };

  const originalFetch = win.fetch;

  if (typeof originalFetch === "function") {
    win.fetch = function (...args) {
      try {
        const [input, init] = args;
        const url = typeof input === "string" ? input : input?.url;

        if (isAmplitudeHttpApi(url)) {
          const body = init?.body;
          const parsed = typeof body === "string" ? tryParseJson(body) : null;

          if (parsed) pushCapturedEvents(win, parsed);
        }
      } catch {}

      return originalFetch.apply(this, args);
    };
  }

  const originalBeacon = win.navigator?.sendBeacon;

  if (typeof originalBeacon === "function") {
    win.navigator.sendBeacon = function (url, data) {
      try {
        if (isAmplitudeHttpApi(url) && typeof data === "string") {
          const parsed = tryParseJson(data);
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
            requestMethod &&
            String(requestMethod).toUpperCase() === "POST" &&
            isAmplitudeHttpApi(requestUrl) &&
            typeof body === "string"
          ) {
            const parsed = tryParseJson(body);
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
// Supports qa, www, and any configured baseUrl host.
function getConsentDomains() {
  const domains = new Set(["qa.commonsense.org", "www.commonsense.org"]);
  const baseHost = getBaseUrlHost();

  if (baseHost) domains.add(baseHost);

  return Array.from(domains);
}

// Sets OneTrust cookies to enable analytics tracking before page load.
// Prevents Amplitude events from being blocked by consent gating.
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

// Visits a page and installs Amplitude capture before any scripts execute.
Cypress.Commands.add("visitWithAmplitudeCapture", (path, visitOptions = {}) => {
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

// Returns captured Amplitude events.
// Can optionally filter by eventType and sort newest-first.
Cypress.Commands.add("getCapturedAmplitudeEvents", (eventType = null, newestFirst = false) => {
  return cy.window({ log: false }).then((win) => {
    const cap = win.__capturedAmplitude || { events: [] };
    let events = cap.events || [];

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
    time: evt?.time,
    page_url_path: p.page_url_path,
    page_url_full: p.page_url_full,
    interaction_type: p.interaction_type,
  };
}

// Waits for a specific Amplitude event.
// Returns the most recent matching event when multiple exist.
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
        const seen = [...new Set(events.map((e) => e?.event_type).filter(Boolean))];

        if (matches.length > 0 && typeof predicate === "function") {
          const summary = summarizeEvent(matches[matches.length - 1]);

          throw new Error(
            `Amplitude event captured but predicate did not match: ${eventType}. ` +
              `Captured ${matches.length} event(s). ` +
              `Seen: ${seen.join(", ") || "(none)"} ` +
              `Last summary: ${JSON.stringify(summary)}`
          );
        }

        throw new Error(
          `Amplitude event not captured: ${eventType}. Seen: ${seen.join(", ") || "(none)"}`
        );
      }

      return cy.wait(500, { log: false }).then(poll);
    });
  };

  return poll();
});




































