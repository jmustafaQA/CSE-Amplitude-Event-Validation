// <reference types="cypress" />

/**
 * Reliable Amplitude capture:
 * - Patch window.fetch and navigator.sendBeacon in cy.visit(onBeforeLoad)
 * - When URL matches Amplitude HTTP API (/2/httpapi), parse JSON body and store:
 *   - __capturedAmplitudePayloads
 *   - __capturedAmplitudeEvents (flattened)
 *
 * Then we "wait/poll" for events using cy.wait() loops (instead of .should({timeout})).
 */

const AMPLITUDE_HTTPAPI_PATH = '/2/httpapi';

function looksLikeAmplitudeHttpApi(url) {
  if (!url) return false;
  const u = String(url);
  return u.includes('amplitude.com') && u.includes(AMPLITUDE_HTTPAPI_PATH);
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch (e) {
    return null;
  }
}

function tryExtractEventsFromPayload(payload) {
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.events)) return payload.events;
  return [];
}

function normalizeFetchArgs(input, init) {
  let url = '';
  let body = undefined;

  if (typeof input === 'string') {
    url = input;
    body = init && init.body;
  } else if (input && typeof input === 'object') {
    url = input.url || '';
    body = (init && init.body) || undefined;
  }

  return { url, body };
}

function coerceBodyToString(body) {
  if (!body) return null;

  if (typeof body === 'string') return body;

  // In some cases body might be an object (rare) — try stringify
  if (typeof body === 'object') {
    try {
      return JSON.stringify(body);
    } catch (e) {
      return null;
    }
  }

  return null;
}

Cypress.Commands.add('visitWithAmplitudeCapture', (path, options = {}) => {
  const visitOptions = {
    ...options,
    onBeforeLoad(win) {
      // Reset capture store for each visit
      win.__capturedAmplitudePayloads = [];
      win.__capturedAmplitudeEvents = [];

      // Patch fetch
      const originalFetch = win.fetch;
      win.fetch = function patchedFetch(input, init) {
        const { url, body } = normalizeFetchArgs(input, init);

        if (looksLikeAmplitudeHttpApi(url)) {
          const bodyStr = coerceBodyToString(body);
          const parsed = bodyStr ? safeJsonParse(bodyStr) : null;

          if (parsed) {
            win.__capturedAmplitudePayloads.push(parsed);

            const events = tryExtractEventsFromPayload(parsed);
            if (events.length) {
              win.__capturedAmplitudeEvents.push(...events);
            }
          }
        }

        return originalFetch.apply(this, arguments);
      };

      // Patch sendBeacon (best-effort)
      const originalBeacon = win.navigator.sendBeacon?.bind(win.navigator);
      if (typeof originalBeacon === 'function') {
        win.navigator.sendBeacon = function patchedSendBeacon(url, data) {
          if (looksLikeAmplitudeHttpApi(url)) {
            let bodyStr = null;

            if (typeof data === 'string') {
              bodyStr = data;
            }

            const parsed = bodyStr ? safeJsonParse(bodyStr) : null;
            if (parsed) {
              win.__capturedAmplitudePayloads.push(parsed);

              const events = tryExtractEventsFromPayload(parsed);
              if (events.length) {
                win.__capturedAmplitudeEvents.push(...events);
              }
            }
          }

          return originalBeacon(url, data);
        };
      }

      // If caller provided onBeforeLoad, run it too
      if (typeof options.onBeforeLoad === 'function') {
        options.onBeforeLoad(win);
      }
    },
  };

  return cy.visit(path, visitOptions);
});

Cypress.Commands.add('getCapturedAmplitudePayloads', () => {
  return cy.window({ log: false }).then((win) => win.__capturedAmplitudePayloads || []);
});

Cypress.Commands.add('getCapturedAmplitudeEvents', () => {
  return cy.window({ log: false }).then((win) => win.__capturedAmplitudeEvents || []);
});

/**
 * Poll until we have at least 1 captured event (or timeout).
 */
Cypress.Commands.add('waitForAmplitudeEvents', (options = {}) => {
  const timeout = options.timeout ?? 60000;
  const interval = options.interval ?? 500;
  const startedAt = Date.now();

  const check = () => {
    return cy.getCapturedAmplitudeEvents().then((events) => {
      if (events && events.length > 0) return events;

      const elapsed = Date.now() - startedAt;
      if (elapsed >= timeout) {
        throw new Error(`Amplitude events not captured within ${timeout}ms (still 0).`);
      }

      return cy.wait(interval, { log: false }).then(check);
    });
  };

  return check();
});

Cypress.Commands.add('assertAmplitudeEvent', (eventType, options = {}) => {
  const timeout = options.timeout ?? 60000;
  const interval = options.interval ?? 500;
  const predicate = typeof options.predicate === 'function' ? options.predicate : () => true;

  return cy.waitForAmplitudeEvents({ timeout, interval }).then((events) => {
    const matches = (events || []).filter((ev) => {
      if (!ev) return false;
      if (ev.event_type !== eventType) return false;
      return predicate(ev);
    });

    expect(matches.length, `Amplitude event fired: ${eventType}`).to.be.greaterThan(0);
  });
});

Cypress.Commands.add('logCapturedAmplitudeEventTypes', () => {
  return cy.getCapturedAmplitudeEvents().then((events) => {
    const names = [...new Set((events || []).map((e) => e?.event_type).filter(Boolean))];
    cy.log(`Captured event types: ${names.join(', ')}`);
  });
});










