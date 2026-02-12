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

    // Default click-ish event types we accept across pages.
    // "Clicked Element" is especially important because some pages emit this instead of "Clicked Link/CTA".
    return [
      "Clicked CTA",
      "Clicked Link",
      "Clicked Button",
      "Clicked Homepage CTA",
      "Clicked Home Page CTA",
      "Clicked Element",
      "[Amplitude] Dead Click",
    ];
  };

  // ---------------------------
  // Viewed (page view) events
  // ---------------------------
  const viewedCases = [
    {
      name: "Viewed Search",
      path: "/education/search?keywords=privacy",
      eventType: "Viewed Search",
      assert: (evt) => {
        const props = evt.event_properties || {};

        return (
          props.ampl_page_view === true &&
          props.page_url_path === "/education/search" &&
          props.page_url_full === "https://qa.commonsense.org/education/search?keywords=privacy" &&
          props.page_title === "Search Results for Common Sense Education" &&
          props.page_language === "en" &&
          props.page_url_domain === "qa.commonsense.org" &&
          props.page_http_status_code === 200 &&
          props.source_org === "Common Sense Education" &&
          props.search_type === "full_results" &&
          props.search_term === "privacy" &&
          props.search_sort === "search_api_relevance" &&
          props.result_type === "search" &&
          typeof props.result_count_total === "number" &&
          props.result_count_total >= 0
        );
      },
    },
    {
      name: "Viewed Lesson Info (Digital Literacy)",
      path: "/education/digital-literacy",
      eventType: "Viewed Lesson Info",
      assert: (evt) => {
        const props = evt.event_properties || {};

        return (
          props.ampl_page_view === true &&
          props.page_url_path === "/education/digital-literacy" &&
          props.page_url_full === "https://qa.commonsense.org/education/digital-literacy" &&
          props.page_title === "Digital Literacy & Well-Being Curriculum | Common Sense Education" &&
          props.page_language === "en" &&
          props.page_url_domain === "qa.commonsense.org" &&
          props.source_org === "Common Sense Education" &&
          props.page_http_status_code === 200 &&
          props.cse_content_type === "component_page" &&
          props.cse_content_title === "Digital Literacy & Well-Being Curriculum" &&
          props.cse_entity_group === "node" &&
          props.cse_entity_id === 5122762
        );
      },
    },
    {
      name: "Viewed Lesson Info (Digital Citizenship)",
      path: "/education/digital-citizenship",
      eventType: "Viewed Lesson Info",
      assert: (evt) => {
        const props = evt.event_properties || {};

        return (
          props.ampl_page_view === true &&
          props.page_url_path === "/education/digital-citizenship" &&
          props.page_url_full === "https://qa.commonsense.org/education/digital-citizenship" &&
          props.page_title === "Lesson Browse | Common Sense Education" &&
          props.page_language === "en" &&
          props.page_url_domain === "qa.commonsense.org" &&
          props.source_org === "Common Sense Education" &&
          props.page_http_status_code === 200 &&
          props.source_system_route_name === "cse_digcit.digital_citizenship_curriculum"
        );
      },
    },
    {
      name: "Viewed Lesson Info (UK Digital Citizenship)",
      path: "/education/uk/digital-citizenship",
      eventType: "Viewed Lesson Info",
      assert: (evt) => {
        const props = evt.event_properties || {};

        return (
          props.ampl_page_view === true &&
          props.page_url_path === "/education/uk/digital-citizenship" &&
          props.page_url_full === "https://qa.commonsense.org/education/uk/digital-citizenship" &&
          props.page_title === "Digital Citizenship Lessons for the UK | Common Sense Education" &&
          props.page_language === "en-GB" &&
          props.page_url_domain === "qa.commonsense.org" &&
          props.source_org === "Common Sense Education" &&
          props.page_http_status_code === 200 &&
          props.cse_content_type === "diy_page" &&
          props.cse_content_title === "Digital Citizenship Lessons for the UK" &&
          props.cse_entity_group === "node" &&
          props.cse_entity_id === 5091193 &&
          props.cse_content_has_video === true
        );
      },
    },
    {
      name: "Viewed Edu Home Page",
      path: "/education",
      eventType: "Viewed Edu Home Page",
      assert: (evt) => {
        const props = evt.event_properties || {};

        return (
          props.ampl_page_view === true &&
          props.page_url_path === "/education" &&
          props.page_url_full === "https://qa.commonsense.org/education" &&
          props.page_title === "Common Sense Education" &&
          props.page_language === "en" &&
          props.page_url_domain === "qa.commonsense.org" &&
          props.source_org === "Common Sense Education" &&
          props.page_http_status_code === 200 &&
          props.cse_content_type === "homepage" &&
          props.cse_content_title === "Homepage" &&
          props.cse_entity_group === "node" &&
          props.cse_entity_id === 5118191
        );
      },
    },
    {
      name: "Viewed Lesson Plan (What Is Media?)",
      path: "/education/digital-literacy/what-is-media",
      eventType: "Viewed Lesson Plan",
      assert: (evt) => {
        const props = evt.event_properties || {};

        return (
          props.ampl_page_view === true &&
          props.page_url_path === "/education/digital-literacy/what-is-media" &&
          props.page_url_domain === "qa.commonsense.org" &&
          props.source_org === "Common Sense Education" &&
          props.page_http_status_code === 200 &&
          props.cse_content_type === "lesson_plan" &&
          props.content_type === "lesson_plan" &&
          props.cse_entity_group === "node" &&
          props.cse_entity_id === 5123210
        );
      },
    },
    {
      name: "Viewed Course (Teaching Digital Literacy and Well-Being)",
      path: "/education/training/teaching-digital-literacy-and-well-being",
      eventType: "Viewed Course",
      assert: (evt) => {
        const props = evt.event_properties || {};

        return (
          props.ampl_page_view === true &&
          props.page_url_path ===
            "/education/training/teaching-digital-literacy-and-well-being" &&
          props.page_url_full ===
            "https://qa.commonsense.org/education/training/teaching-digital-literacy-and-well-being" &&
          props.page_title === "Teaching Digital Literacy and Well-Being | Common Sense Education" &&
          props.page_language === "en" &&
          props.page_url_domain === "qa.commonsense.org" &&
          props.source_org === "Common Sense Education" &&
          props.page_http_status_code === 200 &&
          props.cse_content_type === "pd_course" &&
          props.cse_content_title === "Teaching Digital Literacy and Well-Being" &&
          props.cse_entity_group === "node" &&
          props.cse_entity_id === 5122781
        );
      },
    },
    {
      name: "Viewed Article (Reduce Student Anxiety)",
      path: "/education/articles/reduce-student-anxiety-and-your-own-during-uncertain-times",
      eventType: "Viewed Article",
      assert: (evt) => {
        const props = evt.event_properties || {};

        return (
          props.ampl_page_view === true &&
          props.page_url_path ===
            "/education/articles/reduce-student-anxiety-and-your-own-during-uncertain-times" &&
          props.page_title ===
            "Reduce Student Anxiety (and Your Own) During Uncertain Times | Common Sense Education" &&
          props.page_language === "en" &&
          props.page_url_domain === "qa.commonsense.org" &&
          props.source_org === "Common Sense Education" &&
          props.page_http_status_code === 200 &&
          props.cse_content_type === "article" &&
          props.content_type === "article" &&
          props.cse_entity_group === "node" &&
          props.cse_entity_id === 5057335
        );
      },
    },
  ];

  // ---------------------------
  // Clicked / interaction events
  // ---------------------------
  const clickCases = [
    {
      name: "Clicked EDU Homepage Hero CTA (See the lessons!)",
      path: "/education",
      eventType: null, // accept any click-ish event types from getClickEventTypes()
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

        // Some pages emit "Clicked Link", some emit "Clicked Element" + element_text, and some emit dead-click.
        // We'll validate intent by checking the text + destination-ish data in the payload.
        const values = Object.values(props)
          .filter((v) => typeof v === "string" || typeof v === "number")
          .map((v) => String(v));

        const allText = values.join(" ").toLowerCase();

        const pageOk =
          String(props.page_url_path || "").startsWith("/education") ||
          String(props.page_url || props.page_url_full || "").includes("/education") ||
          String(props["[Amplitude] Page URL"] || "").includes("/education");

        const textOk =
          allText.includes("see the lessons") || allText.includes("see the lessons!");

        // Some payloads include the href, some include destination text, some don't.
        // If present, validate it points at digital literacy.
        const urlOk =
          !allText.includes("href") ||
          allText.includes("/education/digital-literacy") ||
          allText.includes("digital literacy");

        return pageOk && textOk && urlOk;
      },
    },
    {
      name: "Clicked Element (UK Digital Citizenship - Play Video button)",
      path: "/education/uk/digital-citizenship",
      eventType: "Clicked Element",
      run: () => {
        // Banner "Play Video" button.
        cy.contains(".video-modal", "Play Video").click({ force: true });
      },
      assert: (evt) => {
        const props = evt.event_properties || {};

        const classes = props.element_classes || [];
        const classesOk = Array.isArray(classes) && classes.includes("video-modal");

        return (
          props.interaction_type === "click" &&
          props.page_url_path === "/education/uk/digital-citizenship" &&
          props.page_title === "Digital Citizenship Lessons for the UK | Common Sense Education" &&
          props.element_text === "Play Video" &&
          props.element_tag === "span" &&
          classesOk &&
          props.element_data_toggle === "modal" &&
          props.element_data_target === "video-modal" &&
          props.cse_content_type === "diy_page" &&
          props.cse_entity_id === 5091193
        );
      },
    },
    {
      name: "Clicked Element (Collection - Featured Video teaser title)",
      path: "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12",
      eventType: "Clicked Element",
      run: () => {
        // Click the Featured Video teaser title button (opens the modal).
        cy.get('button.video-modal[data-target="video-modal"]').first().click({ force: true });
      },
      assert: (evt) => {
        const props = evt.event_properties || {};
      
        const classes = Array.isArray(props.element_classes) ? props.element_classes : [];
        const classText = classes.join(" ");
      
        return (
          props.page_url_path ===
            "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12" &&
          props.interaction_type === "click" &&
          props.element_tag === "button" &&
          props.element_id === "video-modal-dfa0ca02-c109-4f0b-ab7d-9ea562875827" &&
          classText.includes("preview-teaser-link")
        );
      }      
    },
    {
      name: "Clicked Element (Video modal - Big Play button)",
      path: "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12",
      eventType: "Clicked Element",
      run: () => {
        // Open modal
        cy.get('button.video-modal[data-target="video-modal"]').first().click({ force: true });
        cy.get("#video-modal").should("be.visible");

        // Click big play button on the video-js player.
        cy.get("#video-modal .vjs-big-play-button").click({ force: true });
      },
      assert: (evt) => {
        const props = evt.event_properties || {};
        const classes = props.element_classes || [];
        const classesOk = Array.isArray(classes) && classes.includes("vjs-big-play-button");

        return (
          props.interaction_type === "click" &&
          props.page_url_path ===
            "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12" &&
          props.element_tag === "button" &&
          props.element_text === "Play Video" &&
          classesOk &&
          props.element_region === "video-modal" &&
          props.cse_content_type === "collection" &&
          props.cse_entity_id === 5112984
        );
      },
    },
    {
      name: "Played Video (Collection modal video start)",
      path: "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12",
      eventType: "Played Video",
      run: () => {
        cy.get('button.video-modal[data-target="video-modal"]').first().click({ force: true });
        cy.get("#video-modal").should("be.visible");
        cy.get("#video-modal .vjs-big-play-button").click({ force: true });
      },
      assert: (evt) => {
        const props = evt.event_properties || {};

        return (
          props.page_url_path ===
            "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12" &&
          props.page_title ===
            "Quick Digital Citizenship Lessons for Grades K–12 | Common Sense Education" &&
          props.video_provider === "html5" &&
          props.video_title === "WhatIsDigitalCitizenship_2017" &&
          typeof props.video_url === "string" &&
          props.video_url.includes("WhatIsDigitalCitizenship_2017.mp4") &&
          typeof props.video_session_id === "string" &&
          props.player_state === "playing" &&
          props.play_initiator === "click" &&
          props.play_reason === "start" &&
          props.current_time_seconds === 0 &&
          props.percent_complete === 0
        );
      },
    },
    {
      name: "Paused Video (Collection modal video pause)",
      path: "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12",
      eventType: "Paused Video",
      run: () => {
        cy.get('button.video-modal[data-target="video-modal"]').first().click({ force: true });
        cy.get("#video-modal").should("be.visible");
        cy.get("#video-modal .vjs-big-play-button").click({ force: true });

        // Let it play briefly, then pause via the control bar.
        cy.wait(1000);
        cy.get("#video-modal .vjs-play-control").click({ force: true });
      },
      assert: (evt) => {
        const props = evt.event_properties || {};

        return (
          props.page_url_path ===
            "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12" &&
          props.video_provider === "html5" &&
          props.video_title === "WhatIsDigitalCitizenship_2017" &&
          props.player_state === "paused" &&
          props.stop_reason === "user_pause" &&
          typeof props.current_time_seconds === "number" &&
          props.current_time_seconds > 0 &&
          typeof props.percent_complete === "number" &&
          props.percent_complete > 0
        );
      },
    },
  ];

  // ---------------------------
  // Test runner
  // ---------------------------
  const runCase = ({ name, path, eventType, assert, run }) => {
    const expectedLabel = eventType || "Click Event";

    it(`fires "${expectedLabel}" on ${path} (${name})`, () => {
      cy.visitWithAmplitudeCapture(path);

      // Debug snapshot (helps when things fail)
      cy.dumpAmplitudeDebug();

      if (typeof run === "function") {
        run();
      }

      // Print the exact matched payload when a test passes.
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
  };

  describe("Viewed Events", () => {
    viewedCases.forEach(runCase);
  });

  describe("Clicked / Interaction Events", () => {
    clickCases.forEach(runCase);
  });
});























































