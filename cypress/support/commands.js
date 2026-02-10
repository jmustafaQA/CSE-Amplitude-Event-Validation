// cypress/support/commands.js

/**
 * Capture strategy (reliable):
 * - Capture Amplitude events from network calls:
 *   - fetch() POST to https://api2.amplitude.com/2/httpapi
 *   - navigator.sendBeacon() to same endpoint (best-effort parsing)
 *
 * Why: In your run, amplitude.track is READ-ONLY, so we cannot monkey-patch it.
 * Network capture is the most stable verification method for Amplitude browser SDK.
 */

function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isAmplitudeHttpApi(url) {
  return typeof url === "string" && url.includes("api2.amplitude.com/2/httpapi");
}

function isAmplitudeApi2(url) {
  return typeof url === "string" && url.includes("api2.amplitude.com/2/");
}

function pushCapturedEvents(win, payload) {
  win.__capturedAmplitude = win.__capturedAmplitude || {
    requests: [],
    events: [],
    notes: [],
  };

  win.__capturedAmplitude.requests.push(payload);

  // Amplitude HTTP API typically looks like: { api_key, events: [...] }
  if (payload && Array.isArray(payload.events)) {
    payload.events.forEach((evt) => {
      win.__capturedAmplitude.events.push(evt);
    });
  }
}

function installAmplitudeNetworkCapture(win) {
  win.__capturedAmplitude = { requests: [], events: [], notes: [] };

  // ---- fetch() capture ----
  const originalFetch = win.fetch;
  if (typeof originalFetch === "function") {
    win.fetch = function (...args) {
      try {
        const [input, init] = args;
        const url = typeof input === "string" ? input : input?.url;

        if (isAmplitudeHttpApi(url)) {
          // init.body is usually a JSON string
          const body = init?.body;
          const parsed = typeof body === "string" ? tryParseJson(body) : null;

          win.__capturedAmplitude.notes.push(
            `fetch -> amplitude httpapi (parsed=${!!parsed})`
          );

          if (parsed) pushCapturedEvents(win, parsed);
        }
      } catch (e) {
        win.__capturedAmplitude.notes.push(
          `fetch capture error: ${String(e?.message || e)}`
        );
      }

      return originalFetch.apply(this, args);
    };
  } else {
    win.__capturedAmplitude.notes.push("No window.fetch available to patch");
  }

  // ---- sendBeacon() capture (best effort) ----
  const originalBeacon = win.navigator?.sendBeacon;
  if (typeof originalBeacon === "function") {
    win.navigator.sendBeacon = function (url, data) {
      try {
        if (isAmplitudeHttpApi(url)) {
          // data might be string, Blob, ArrayBufferView, etc.
          // We can reliably parse ONLY if it's a string.
          if (typeof data === "string") {
            const parsed = tryParseJson(data);
            win.__capturedAmplitude.notes.push(
              `sendBeacon -> amplitude httpapi (parsed=${!!parsed})`
            );
            if (parsed) pushCapturedEvents(win, parsed);
          } else {
            win.__capturedAmplitude.notes.push(
              `sendBeacon -> amplitude httpapi (non-string payload, not parsed)`
            );
          }
        }
      } catch (e) {
        win.__capturedAmplitude.notes.push(
          `sendBeacon capture error: ${String(e?.message || e)}`
        );
      }

      return originalBeacon.apply(this, arguments);
    };
  } else {
    win.__capturedAmplitude.notes.push(
      "No navigator.sendBeacon available to patch"
    );
  }

  // Track amplitude presence (debug only)
  try {
    win.__capturedAmplitude.notes.push(
      `typeof window.amplitude at onBeforeLoad: ${typeof win.amplitude}`
    );
  } catch {
    // ignore
  }
}

/**
 * OneTrust consent helper (cookies) - keep this; it's useful.
 * Note: window.OnetrustActiveGroups is a runtime variable; cookie setting doesn't guarantee it exists.
 */
Cypress.Commands.add("setOneTrustAnalyticsConsent", () => {
  cy.task("log", "[AMP-DEBUG] Setting OneTrust analytics consent");

  const now = new Date();

  cy.setCookie("OptanonAlertBoxClosed", "true", {
    domain: "qa.commonsense.org",
    secure: true,
  });

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

  cy.setCookie("OptanonConsent", consentValue, {
    domain: "qa.commonsense.org",
    secure: true,
  });

  cy.setCookie("OptanonActiveGroups", ",C0001,C0002,", {
    domain: "qa.commonsense.org",
    secure: true,
  });
});

/**
 * Visit wrapper: install capture BEFORE any app JS runs
 */
Cypress.Commands.add("visitWithAmplitudeCapture", (path) => {
  cy.task("log", `[AMP-DEBUG] Visiting ${path}`);

  // B) Assert outbound endpoint once:
  // Confirm at least one request hit the Amplitude API endpoint during this visit.
  // This prevents false positives from stale in-memory event arrays.
  // Note: intercept catches fetch/XHR. sendBeacon may not always be intercepted,
  // but our network-patch capture still records those events separately.
  Cypress.env("__AMP_HTTPAPI_HITS__", 0);

  cy.intercept(
    {
      method: "POST",
      url: /https:\/\/api2\.amplitude\.com\/2\/.*/,
    },
    (req) => {
      const hits = (Cypress.env("__AMP_HTTPAPI_HITS__") || 0) + 1;
      Cypress.env("__AMP_HTTPAPI_HITS__", hits);
      Cypress.env("__AMP_LAST_HTTPAPI_URL__", req.url);
    }
  ).as("amplitudeHttpApi");

  cy.visit(path, {
    onBeforeLoad: (win) => {
      installAmplitudeNetworkCapture(win);
    },
  });

  // Wait for at least one Amplitude request to be observed.
  // If this times out, it means we did not actually send anything to Amplitude.
  cy.wait("@amplitudeHttpApi", { timeout: 60000 }).then((interception) => {
    const url =
      interception?.request?.url ||
      Cypress.env("__AMP_LAST_HTTPAPI_URL__") ||
      "(unknown)";
    cy.task("log", `[AMP-DEBUG] Observed Amplitude POST: ${url}`);
  });
});

Cypress.Commands.add("dumpAmplitudeDebug", () => {
  return cy.window({ log: false }).then((win) => {
    const cap = win.__capturedAmplitude || { requests: [], events: [], notes: [] };
    const types = [
      ...new Set((cap.events || []).map((e) => e?.event_type).filter(Boolean)),
    ];

    const debug = {
      href: win.location.href,
      readyState: win.document.readyState,
      amplitudeType: typeof win.amplitude,
      amplitudeKeys: win.amplitude ? Object.keys(win.amplitude) : [],
      hasFetch: typeof win.fetch,
      hasSendBeacon: typeof win.navigator?.sendBeacon,
      requestCount: cap.requests.length,
      eventCount: cap.events.length,
      eventTypes: types,
      notes: cap.notes || [],
      OnetrustActiveGroups: win.OnetrustActiveGroups ?? null,
      OptanonActiveGroups: win.OptanonActiveGroups ?? null,
    };

    return cy.task("log", "[AMP-DEBUG] dumpAmplitudeDebug()").then(() =>
      cy.task("logJson", debug)
    );
  });
});

Cypress.Commands.add("getCapturedAmplitudeEvents", () => {
  return cy.window({ log: false }).then((win) => {
    const cap = win.__capturedAmplitude || { events: [] };
    return cap.events || [];
  });
});

Cypress.Commands.add(
  "waitForAmplitudeEvent",
  (eventType, predicate = null, timeoutMs = 60000) => {
    const start = Date.now();

    const poll = () => {
      return cy.getCapturedAmplitudeEvents().then((events) => {
        const matches = events.filter((e) => e && e.event_type === eventType);

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

        if (filtered.length > 0) return filtered[0];

        const elapsed = Date.now() - start;
        if (elapsed > timeoutMs) {
          const seen = [
            ...new Set(events.map((e) => e?.event_type).filter(Boolean)),
          ];
          throw new Error(
            `Amplitude event not captured within ${timeoutMs}ms: ${eventType}. Seen: ${
              seen.join(", ") || "(none)"
            }`
          );
        }

        return cy.wait(500, { log: false }).then(poll);
      });
    };

    return poll();
  }
);

Cypress.Commands.add(
  "waitForAnyAmplitudeEvent",
  (eventTypes, predicate = null, timeoutMs = 60000) => {
    const types = Array.isArray(eventTypes) ? eventTypes : [eventTypes];
    const start = Date.now();

    const poll = () => {
      return cy.getCapturedAmplitudeEvents().then((events) => {
        const matches = events.filter(
          (e) =>
            e &&
            typeof e.event_type === "string" &&
            types.includes(e.event_type)
        );

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

        if (filtered.length > 0) return filtered[0];

        const elapsed = Date.now() - start;
        if (elapsed > timeoutMs) {
          const seen = [
            ...new Set(events.map((e) => e?.event_type).filter(Boolean)),
          ];
          throw new Error(
            `Amplitude event not captured within ${timeoutMs}ms. Expected one of: ${types.join(
              ", "
            )}. Seen: ${seen.join(", ") || "(none)"}`
          );
        }

        return cy.wait(500, { log: false }).then(poll);
      });
    };

    return poll();
  }
);

Cypress.Commands.add("logCapturedAmplitudeEventTypes", () => {
  cy.getCapturedAmplitudeEvents().then((events) => {
    const types = [...new Set(events.map((e) => e?.event_type).filter(Boolean))];
    cy.task(
      "log",
      `[AMP-DEBUG] Captured event types: ${types.join(", ") || "(none)"}`
    );
  });
});

































