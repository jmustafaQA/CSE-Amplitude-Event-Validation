// cypress/e2e/amplitude_tier1.cy.js

describe("Amplitude Tier-1 Analytics", () => {
  beforeEach(() => {
    cy.setOneTrustAnalyticsConsent();
  });

  const logMatchedEvent = (label, evt) => {
    if (!evt) {
      return cy.task("log", `[AMP-DEBUG] Matched event payload (${label}): (none)`);
    }

    return cy
      .task("log", `[AMP-DEBUG] Matched event payload (${label})`)
      .then(() => cy.task("logJson", evt));
  };

  const getClickEventTypes = () => {
    const envVal = Cypress.env("AMP_CLICK_EVENT_TYPES");

    if (Array.isArray(envVal)) return envVal;

    if (typeof envVal === "string") {
      return envVal
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    return [
      "Clicked CTA",
      "Clicked Link",
      "Clicked Button",
      "Clicked Homepage CTA",
      "Clicked Home Page CTA",
      "[Amplitude] Dead Click",
    ];
  };

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

    {
      name: "Viewed Edu Home Page",
      path: "/education",
      eventType: "Viewed Edu Home Page",
      assert: (evt) => {
        const props = evt.event_properties || {};

        return (
          props.page_url_path === "/education" &&
          props.page_url_full === "https://qa.commonsense.org/education" &&
          props.page_title === "Common Sense Education" &&
          props.cse_content_type === "homepage" &&
          props.cse_content_title === "Homepage" &&
          props.cse_entity_group === "node" &&
          props.cse_entity_id === 5118191 &&
          props.page_http_status_code === 200 &&
          props.page_language === "en" &&
          props.source_org === "Common Sense Education"
        );
      },
    },

    {
      name: "Clicked EDU Homepage Hero CTA",
      path: "/education",
      eventType: null,
      run: () => {
        const selector = ".home-marketing-block a.btn";

        // Prevent navigation so the page doesn't unload before we assert.
        cy.get(selector)
          .contains("See the lessons!")
          .then(($a) => {
            const el = $a[0];
            el.addEventListener(
              "click",
              (e) => {
                e.preventDefault();
                e.stopPropagation();
              },
              { once: true }
            );
          });

        cy.get(selector).contains("See the lessons!").click({ force: true });
      },
      assert: (evt) => {
        const props = evt.event_properties || {};

        const values = Object.values(props)
          .filter((v) => typeof v === "string" || typeof v === "number")
          .map((v) => String(v));

        const allText = values.join(" ").toLowerCase();

        const pageOk =
          String(props.page_url_path || "").startsWith("/education") ||
          String(props.page_url || props.page_url_full || "").includes("/education");

        const textOk =
          allText.includes("see the lessons") || allText.includes("see the lessons!");

        const urlOk = allText.includes("/education/digital-literacy");

        return pageOk && textOk && urlOk;
      },
    },

    {
      name: "Viewed Lesson Plan (What Is Media?)",
      path: "/education/digital-literacy/what-is-media",
      eventType: "Viewed Lesson Plan",
      assert: (evt) => {
        const props = evt.event_properties || {};

        return (
          props.page_url_path === "/education/digital-literacy/what-is-media" &&
          props.cse_content_type === "lesson_plan" &&
          props.content_type === "lesson_plan" &&
          props.cse_entity_group === "node" &&
          props.cse_entity_id === 5123210 &&
          props.page_http_status_code === 200 &&
          props.source_org === "Common Sense Education"
        );
      },
    },
  ];

  cases.forEach(({ name, path, eventType, assert, run }) => {
    const expectedLabel = eventType || "Click Event";

    it(`fires "${expectedLabel}" on ${path} (${name})`, () => {
      cy.visitWithAmplitudeCapture(path);

      // Debug snapshot (helps when things fail)
      cy.dumpAmplitudeDebug();

      if (typeof run === "function") {
        run();
      }

      // A) Print the exact matched event payload when a test passes
      if (eventType) {
        cy.waitForAmplitudeEvent(eventType, assert).then((evt) => {
          return logMatchedEvent(eventType, evt);
        });
      } else {
        cy.waitForAnyAmplitudeEvent(getClickEventTypes(), assert).then((evt) => {
          return logMatchedEvent("Click Event", evt);
        });
      }

      // Helpful summary in terminal
      cy.logCapturedAmplitudeEventTypes();
    });
  });
});





















































