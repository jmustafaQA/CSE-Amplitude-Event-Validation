// cypress/support/commands.js
// Amplitude capture + debug instrumentation (Cypress)
//
// Strategy:
// 1) Capture events at the SOURCE (window.amplitude.track / logEvent / instance.track / instance.logEvent)
// 2) ALSO capture network payloads to Amplitude HTTP API (fetch + sendBeacon)
// 3) Provide debug helpers to quickly see why "0 captured" happens

const AMP_DEBUG = true; // flip to false once stable

function dbg(win, msg, data) {
  if (!AMP_DEBUG) return;
  try {
    win.console.log(`[AMP-DEBUG] ${msg}`, data ?? '');
  } catch {
    // ignore
  }
}

function safeJsonParse(value) {
  try {
    if (typeof value === 'string') return JSON.parse(value);
    return value;
  } catch {
    return null;
  }
}

function normalizeHttpApiPayload(body) {
  // body can be string | object
  const parsed = safeJsonParse(body);
  if (!parsed) return null;

  // amplitude httpapi typically: { api_key, events: [...], options? }
  if (Array.isArray(parsed.events)) return parsed;

  // sometimes nested / wrapped
  if (parsed.data && Array.isArray(parsed.data.events)) return parsed.data;
  return parsed;
}

function pushCapturedEvent(win, event) {
  win.__capturedAmplitudeEvents = win.__capturedAmplitudeEvents || [];
  win.__capturedAmplitudeEvents.push(event);
}

function tryWrapFn(win, obj, fnName, wrapperFlag) {
  if (!obj) return false;
  const original = obj[fnName];
  if (typeof original !== 'function') return false;
  if (obj[wrapperFlag]) return true;

  obj[fnName] = function (...args) {
    // Support both Amplitude JS styles:
    // 1) track(eventName, properties?, options?)
    // 2) logEvent(eventName, properties?)
    const eventName = args[0];
    const props = args[1] || {};
    const options = args[2] || {};

    // Capture "track" style into a normalized event shape
    pushCapturedEvent(win, {
      captured_via: `amplitude.${fnName}`,
      event_type: eventName,
      event_properties: props || {},
      options: options || {},
      capturedAt: Date.now(),
    });

    dbg(win, `${fnName}() captured`, {
      eventName,
      propsKeys: props ? Object.keys(props) : [],
    });

    return original.apply(this, args);
  };

  obj[wrapperFlag] = true;
  return true;
}

function wrapAmplitudeGlobal(win, amp) {
  if (!amp) return;

  // Wrap top-level functions (common patterns)
  tryWrapFn(win, amp, 'track', '__cse_wrapped_track');
  tryWrapFn(win, amp, 'logEvent', '__cse_wrapped_logEvent');

  // Wrap instance methods (legacy getInstance pattern)
  try {
    if (typeof amp.getInstance === 'function') {
      const inst = amp.getInstance();
      if (inst) {
        tryWrapFn(win, inst, 'track', '__cse_wrapped_inst_track');
        tryWrapFn(win, inst, 'logEvent', '__cse_wrapped_inst_logEvent');
      }
    }
  } catch (e) {
    dbg(win, 'wrapAmplitudeGlobal() getInstance ERROR', e?.message || e);
  }
}

function installAmplitudeAssignmentHook(win) {
  // always reset per test
  win.__capturedAmplitudeEvents = [];

  dbg(win, 'installAmplitudeAssignmentHook() called', {
    href: win.location?.href,
    readyState: win.document?.readyState,
    hasAmplitude: !!win.amplitude,
    hasFetch: typeof win.fetch,
    hasBeacon: typeof win.navigator?.sendBeacon,
  });

  // If amplitude already exists, wrap immediately
  if (win.amplitude) {
    dbg(win, 'window.amplitude already exists - wrapping immediately', {
      keys: Object.keys(win.amplitude || {}),
    });
    wrapAmplitudeGlobal(win, win.amplitude);
    return;
  }

  // Otherwise intercept future assignment to window.amplitude
  let _ampValue;

  Object.defineProperty(win, 'amplitude', {
    configurable: true,
    enumerable: true,
    get() {
      return _ampValue;
    },
    set(val) {
      _ampValue = val;

      dbg(win, 'window.amplitude assigned', {
        type: typeof val,
        keys: val ? Object.keys(val) : [],
        hasGetInstance: typeof val?.getInstance,
      });

      try {
        wrapAmplitudeGlobal(win, _ampValue);
        dbg(win, 'wrapAmplitudeGlobal() complete', {
          wrappedTrack: !!_ampValue?.__cse_wrapped_track,
          wrappedLogEvent: !!_ampValue?.__cse_wrapped_logEvent,
        });
      } catch (e) {
        dbg(win, 'wrapAmplitudeGlobal() ERROR', e?.message || e);
      }
    },
  });
}

function installAmplitudeNetworkCapture(win) {
  // Capture HTTP API network payloads (fetch + sendBeacon)
  // Works even if track wrappers aren't hit (SDK internal pipeline)

  // --- fetch ---
  if (typeof win.fetch === 'function') {
    const originalFetch = win.fetch.bind(win);

    win.fetch = async function (input, init = {}) {
      const url = typeof input === 'string' ? input : input?.url || '';

      const isAmpHttpApi =
        url.includes('api2.amplitude.com/2/httpapi') ||
        url.includes('api.amplitude.com/2/httpapi') ||
        url.includes('/2/httpapi');

      if (!isAmpHttpApi) {
        return originalFetch(input, init);
      }

      // Attempt to read body
      const body = init?.body;
      const parsed = normalizeHttpApiPayload(body);

      if (parsed?.events?.length) {
        parsed.events.forEach((e) => pushCapturedEvent(win, e));
      }

      dbg(win, 'FETCH Amplitude HTTPAPI captured', {
        url,
        method: init?.method,
        eventsCount: parsed?.events?.length || 0,
        eventTypes: (parsed?.events || []).map((e) => e?.event_type).filter(Boolean),
      });

      return originalFetch(input, init);
    };
  }

  // --- sendBeacon ---
  if (typeof win.navigator?.sendBeacon === 'function') {
    const originalBeacon = win.navigator.sendBeacon.bind(win.navigator);

    win.navigator.sendBeacon = function (url, data) {
      const isAmpHttpApi =
        String(url).includes('api2.amplitude.com/2/httpapi') ||
        String(url).includes('api.amplitude.com/2/httpapi') ||
        String(url).includes('/2/httpapi');

      if (isAmpHttpApi) {
        const parsed = normalizeHttpApiPayload(data);

        if (parsed?.events?.length) {
          parsed.events.forEach((e) => pushCapturedEvent(win, e));
        }

        dbg(win, 'BEACON Amplitude HTTPAPI captured', {
          url,
          dataType: typeof data,
          eventsCount: parsed?.events?.length || 0,
          eventTypes: (parsed?.events || []).map((e) => e?.event_type).filter(Boolean),
        });
      }

      return originalBeacon(url, data);
    };
  }
}

function installAmplitudeCapture(win) {
  // Install both assignment hook and network capture
  installAmplitudeAssignmentHook(win);
  installAmplitudeNetworkCapture(win);
}

Cypress.Commands.add('visitWithAmplitudeCapture', (path, options = {}) => {
  const visitOptions = {
    ...options,
    onBeforeLoad: (win) => {
      installAmplitudeCapture(win);

      if (typeof options.onBeforeLoad === 'function') {
        options.onBeforeLoad(win);
      }
    },
  };

  cy.visit(path, visitOptions);
});

Cypress.Commands.add('getCapturedAmplitudeEvents', () => {
  return cy.window({ log: false }).then((win) => win.__capturedAmplitudeEvents || []);
});

Cypress.Commands.add('dumpAmplitudeDebug', () => {
  cy.window({ log: false }).then((win) => {
    const events = win.__capturedAmplitudeEvents || [];
    const types = [...new Set(events.map((e) => e?.event_type).filter(Boolean))];

    cy.log(`DEBUG: readyState=${win.document?.readyState}`);
    cy.log(`DEBUG: typeof window.amplitude=${typeof win.amplitude}`);
    cy.log(
      `DEBUG: amplitude keys=${win.amplitude ? Object.keys(win.amplitude).join(', ') : '(none)'}`
    );
    cy.log(`DEBUG: typeof fetch=${typeof win.fetch}`);
    cy.log(`DEBUG: typeof sendBeacon=${typeof win.navigator?.sendBeacon}`);
    cy.log(`DEBUG: capturedCount=${events.length}`);
    cy.log(`DEBUG: capturedTypes=${types.join(', ') || '(none)'}`);

    // Consent (OneTrust) hints
    cy.log(`DEBUG: OnetrustActiveGroups=${win.OnetrustActiveGroups || '(none)'}`);
    cy.log(`DEBUG: OptanonActiveGroups=${win.OptanonActiveGroups || '(none)'}`);
  });
});

// Wait for a specific event_type to appear in captured events
Cypress.Commands.add('waitForAmplitudeEvent', (eventType, predicate = null, timeoutMs = 60000) => {
  const start = Date.now();

  const check = () => {
    return cy.getCapturedAmplitudeEvents().then((events) => {
      const matches = events.filter((e) => e && e.event_type === eventType);

      const filtered = typeof predicate === 'function'
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
        const seen = [...new Set(events.map((e) => e?.event_type).filter(Boolean))];
        throw new Error(
          `Amplitude event not captured within ${timeoutMs}ms: ${eventType}. Seen types: ${seen.join(', ') || '(none)'}`
        );
      }

      return cy.wait(500, { log: false }).then(check);
    });
  };

  return check();
});

// Quick helper: show event types captured (useful during debugging)
Cypress.Commands.add('logCapturedAmplitudeEventTypes', () => {
  cy.getCapturedAmplitudeEvents().then((events) => {
    const names = [...new Set(events.map((e) => e?.event_type).filter(Boolean))];
    cy.log(`Captured event types: ${names.join(', ') || '(none)'}`);
  });
});







