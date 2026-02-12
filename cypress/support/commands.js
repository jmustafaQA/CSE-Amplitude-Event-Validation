// cypress/support/commands.js

// Safely attempts to parse JSON without throwing.
// Used when intercepting Amplitude request payloads.
function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// Returns true if the request URL matches Amplitude HTTP API endpoints.
function isAmplitudeHttpApi(url) {
  return typeof url === "string" && url.includes("api2.amplitude.com/2/");
}

// Pushes captured Amplitude payloads into a shared in-memory store
// attached to the window object during the test run.
function pushCapturedEvents(win, payload) {
  win.__capturedAmplitude = win.__capturedAmplitude || {
    requests: [],
    events: [],
  };

  // Store full request payload for debugging if needed
  win.__capturedAmplitude.requests.push(payload);

  // Extract individual events from payload.events array
  if (payload && Array.isArray(payload.events)) {
    payload.events.forEach((evt) => {
      win.__capturedAmplitude.events.push(evt);
    });
  }
}

// Installs network interception hooks BEFORE the page loads.
// Wraps fetch and sendBeacon to capture outbound Amplitude traffic.
function installAmplitudeNetworkCapture(win) {
  // Reset storage for each visit
  win.__capturedAmplitude = { requests: [], events: [] };

  // Patch window.fetch
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

  // Patch navigator.sendBeacon
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
}

// Sets OneTrust consent cookies so analytics events are not blocked.
// Required before visiting pages.
Cypress.Commands.add("setOneTrustAnalyticsConsent", () => {
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

// Visits a page and installs network capture before load.
// Also asserts that at least one Amplitude request occurred.
Cypress.Commands.add("visitWithAmplitudeCapture", (path) => {
  cy.intercept(
    {
      method: "POST",
      url: /https:\/\/api2\.amplitude\.com\/2\/.*/,
    }
  ).as("amplitudeHttpApi");

  cy.visit(path, {
    onBeforeLoad: (win) => {
      installAmplitudeNetworkCapture(win);
    },
  });

  // Ensures real Amplitude traffic occurred in this run
  cy.wait("@amplitudeHttpApi", { timeout: 60000 });
});

// Returns all captured Amplitude events for this page session.
Cypress.Commands.add("getCapturedAmplitudeEvents", () => {
  return cy.window({ log: false }).then((win) => {
    const cap = win.__capturedAmplitude || { events: [] };
    return cap.events || [];
  });
});

// Produces a minimal debug summary of an event.
// Used only in error output when predicates fail.
function summarizeEvent(evt) {
  const p = evt?.event_properties || {};
  return {
    event_type: evt?.event_type,
    page_url_path: p.page_url_path,
    page_url_full: p.page_url_full,
    element_text: p.element_text || p["[Amplitude] Element Text"],
    interaction_type: p.interaction_type,
    video_title: p.video_title,
    video_url: p.video_url,
    player_state: p.player_state,
    play_reason: p.play_reason,
    play_initiator: p.play_initiator,
  };
}

// Polls captured events until a matching eventType is found.
// Optionally validates against a predicate.
// Throws detailed error if event is missing or predicate fails.
Cypress.Commands.add(
  "waitForAmplitudeEvent",
  (eventType, predicate = null, timeoutMs = 60000) => {
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

        if (filtered.length > 0) return filtered[0];

        if (Date.now() - start > timeoutMs) {
          const seen = [...new Set(events.map((e) => e?.event_type).filter(Boolean))];

          if (matches.length > 0 && typeof predicate === "function") {
            const summary = summarizeEvent(matches[0]);
            throw new Error(
              `Amplitude event captured but predicate did not match: ${eventType}. ` +
                `Captured ${matches.length} ${eventType} event(s). ` +
                `Seen: ${seen.join(", ") || "(none)"} ` +
                `First ${eventType} summary: ${JSON.stringify(summary)}`
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
  }
);




































