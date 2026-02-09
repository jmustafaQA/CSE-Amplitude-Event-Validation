// cypress/e2e/amplitude_tier1.cy.js

describe("Amplitude Tier-1 Analytics", () => {
  beforeEach(() => {
    cy.setOneTrustAnalyticsConsent();
  });

  const cases = [
    {
      name: "Viewed Search",
      path: "/education/search?keywords=privacy",
      eventType: "Viewed Search",
      assert: (evt) => {
        const props = evt.event_properties || {};
        return (
          props.page_url_path === "/education/search" &&
          props.search_type === "full_results" &&
          props.search_term === "privacy"
        );
      },
    },
    {
      name: "Viewed Lesson Info (Digital Literacy)",
      path: "/education/digital-literacy",
      eventType: "Viewed Lesson Info",
      assert: (evt) => {
        const props = evt.event_properties || {};
        // Keep this minimal so it’s stable across content changes
        return props.page_url_path === "/education/digital-literacy";
      },
    },
    {
      name: "Viewed Lesson Info (Digital Citizenship)",
      path: "/education/digital-citizenship",
      eventType: "Viewed Lesson Info",
      assert: (evt) => {
        const props = evt.event_properties || {};
        return props.page_url_path === "/education/digital-citizenship";
      },
    },
    {
      name: "Viewed Lesson Info (UK Digital Citizenship)",
      path: "/education/uk/digital-citizenship",
      eventType: "Viewed Lesson Info",
      assert: (evt) => {
        const props = evt.event_properties || {};
        return props.page_url_path === "/education/uk/digital-citizenship";
      },
    },
  ];

  cases.forEach(({ name, path, eventType, assert }) => {
    it(`fires "${eventType}" on ${path} (${name})`, () => {
      cy.visitWithAmplitudeCapture(path);

      // Debug snapshot (helps when things fail)
      cy.dumpAmplitudeDebug();

      // Wait for the expected event
      cy.waitForAmplitudeEvent(eventType, assert);

      // Helpful summary in terminal
      cy.logCapturedAmplitudeEventTypes();
    });
  });
});

















