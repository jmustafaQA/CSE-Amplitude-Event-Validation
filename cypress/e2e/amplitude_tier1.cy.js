// cypress/e2e/amplitude_tier1.cy.js
//
// This spec is built to work in environments where Cypress may not reliably see the
// Amplitude network flush timing. We capture at TWO levels:
// - event payloads leaving the browser (fetch/sendBeacon to /2/httpapi)
// - direct SDK calls (amplitude.track/logEvent and instance methods)
//
// Keep the debug dumps until you see stable captures, then you can remove or reduce logging.

describe('Amplitude Tier-1 Analytics', () => {
  // IMPORTANT:
  // Use a real search term so the search page behaves like production
  const SEARCH_PATH = '/education/search?keywords=privacy';

  const TESTS = [
    {
      name: 'fires "Viewed Page" on /education/search full results page view',
      path: SEARCH_PATH,
      expectedEvent: 'Viewed Page',
      validate: (e) => {
        // from your expected spec:
        // search_type: full_results, search_term: privacy
        const props = e?.event_properties || {};
        return props.page_url_path === '/education/search'
          && props.search_type === 'full_results'
          && String(props.search_term || '').toLowerCase() === 'privacy';
      },
    },
    {
      name: 'fires "Viewed Page" on /education/digital-literacy',
      path: '/education/digital-literacy',
      expectedEvent: 'Viewed Page',
      validate: (e) => {
        const props = e?.event_properties || {};
        return props.page_url_path === '/education/digital-literacy';
      },
    },
    {
      name: 'fires "Viewed Page" on /education/digital-citizenship',
      path: '/education/digital-citizenship',
      expectedEvent: 'Viewed Page',
      validate: (e) => {
        const props = e?.event_properties || {};
        return props.page_url_path === '/education/digital-citizenship';
      },
    },
    {
      name: 'fires "Viewed Page" on /education/uk/digital-citizenship',
      path: '/education/uk/digital-citizenship',
      expectedEvent: 'Viewed Page',
      validate: (e) => {
        const props = e?.event_properties || {};
        return props.page_url_path === '/education/uk/digital-citizenship';
      },
    },
  ];

  TESTS.forEach(({ name, path, expectedEvent, validate }) => {
    it(name, () => {
      cy.visitWithAmplitudeCapture(path);

      // Give loader time to init (OneTrust + analytics boot can be async)
      cy.wait(1500, { log: false });

      // Debug snapshot (keep until stable)
      cy.dumpAmplitudeDebug();

      // Helpful: print all captured event types for this test
      cy.logCapturedAmplitudeEventTypes();

      // Assert the event is captured (via SDK wrappers OR network payload)
      cy.waitForAmplitudeEvent(expectedEvent, validate, 60000).then((evt) => {
        // Optional: dump the matched event for quick troubleshooting
        cy.log(`Matched ${expectedEvent} on ${path}`);
        expect(evt, `matched amplitude event ${expectedEvent}`).to.exist;
      });
    });
  });
});













