// cypress/e2e/amplitude_tier1.cy.js

describe("Amplitude Tier-1 Analytics", () => {
  beforeEach(() => {
    // Consent must be set before visiting so the SDK can emit events.
    cy.setOneTrustAnalyticsConsent();
  });

  const logVerified = (name, eventType) => {
    // Minimal, readable pass logging.
    cy.task("log", `[AMP] Verified: ${eventType} (${name})`);
  };

  const viewedCases = [
    {
      name: "Viewed Search",
      path: "/education/search?keywords=privacy",
      eventType: "Viewed Search",
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.page_url_path === "/education/search" &&
          p.page_url_full === "https://qa.commonsense.org/education/search?keywords=privacy" &&
          p.page_title === "Search Results for Common Sense Education" &&
          p.page_http_status_code === 200 &&
          p.page_language === "en" &&
          p.source_org === "Common Sense Education" &&
          p.search_type === "full_results" &&
          p.search_term === "privacy" &&
          p.result_type === "search" &&
          typeof p.result_count_total === "number"
        );
      },
    },
    {
      name: "Viewed Lesson Info (Digital Literacy)",
      path: "/education/digital-literacy",
      eventType: "Viewed Lesson Info",
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.page_url_path === "/education/digital-literacy" &&
          p.page_url_full === "https://qa.commonsense.org/education/digital-literacy" &&
          p.page_title === "Digital Literacy & Well-Being Curriculum | Common Sense Education" &&
          p.page_http_status_code === 200 &&
          p.page_language === "en" &&
          p.source_org === "Common Sense Education" &&
          p.cse_content_type === "component_page" &&
          p.cse_content_title === "Digital Literacy & Well-Being Curriculum" &&
          p.cse_entity_group === "node" &&
          p.cse_entity_id === 5122762
        );
      },
    },
    {
      name: "Viewed Lesson Info (Digital Citizenship)",
      path: "/education/digital-citizenship",
      eventType: "Viewed Lesson Info",
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.page_url_path === "/education/digital-citizenship" &&
          p.page_url_full === "https://qa.commonsense.org/education/digital-citizenship" &&
          p.page_title === "Lesson Browse | Common Sense Education" &&
          p.page_http_status_code === 200 &&
          p.page_language === "en" &&
          p.source_org === "Common Sense Education" &&
          p.source_system_route_name === "cse_digcit.digital_citizenship_curriculum"
        );
      },
    },
    {
      name: "Viewed Lesson Info (UK Digital Citizenship)",
      path: "/education/uk/digital-citizenship",
      eventType: "Viewed Lesson Info",
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.page_url_path === "/education/uk/digital-citizenship" &&
          p.page_url_full === "https://qa.commonsense.org/education/uk/digital-citizenship" &&
          p.page_title === "Digital Citizenship Lessons for the UK | Common Sense Education" &&
          p.page_http_status_code === 200 &&
          p.page_language === "en-GB" &&
          p.source_org === "Common Sense Education" &&
          p.cse_content_type === "diy_page" &&
          p.cse_content_title === "Digital Citizenship Lessons for the UK" &&
          p.cse_entity_group === "node" &&
          p.cse_entity_id === 5091193
        );
      },
    },
    {
      name: "Viewed Edu Home Page",
      path: "/education",
      eventType: "Viewed Edu Home Page",
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.page_url_path === "/education" &&
          p.page_url_full === "https://qa.commonsense.org/education" &&
          p.page_title === "Common Sense Education" &&
          p.page_http_status_code === 200 &&
          p.page_language === "en" &&
          p.source_org === "Common Sense Education" &&
          p.cse_content_type === "homepage" &&
          p.cse_content_title === "Homepage" &&
          p.cse_entity_group === "node" &&
          p.cse_entity_id === 5118191
        );
      },
    },
    {
      name: "Viewed Lesson Plan (What Is Media?)",
      path: "/education/digital-literacy/what-is-media",
      eventType: "Viewed Lesson Plan",
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.page_url_path === "/education/digital-literacy/what-is-media" &&
          p.page_url_full === "https://qa.commonsense.org/education/digital-literacy/what-is-media" &&
          p.page_title === "What Is Media? | Common Sense Education" &&
          p.page_http_status_code === 200 &&
          p.page_language === "en" &&
          p.source_org === "Common Sense Education" &&
          p.cse_content_type === "lesson_plan" &&
          p.content_type === "lesson_plan" &&
          p.cse_entity_group === "node" &&
          p.cse_entity_id === 5123210
        );
      },
    },
    {
      name: "Viewed Course (Teaching Digital Literacy and Well-Being)",
      path: "/education/training/teaching-digital-literacy-and-well-being",
      eventType: "Viewed Course",
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.page_url_path === "/education/training/teaching-digital-literacy-and-well-being" &&
          p.page_url_full ===
            "https://qa.commonsense.org/education/training/teaching-digital-literacy-and-well-being" &&
          p.page_title === "Teaching Digital Literacy and Well-Being | Common Sense Education" &&
          p.page_http_status_code === 200 &&
          p.page_language === "en" &&
          p.source_org === "Common Sense Education" &&
          p.cse_content_type === "pd_course" &&
          p.cse_content_title === "Teaching Digital Literacy and Well-Being" &&
          p.cse_entity_group === "node" &&
          p.cse_entity_id === 5122781
        );
      },
    },
    {
      name: "Viewed Article (Reduce Student Anxiety)",
      path: "/education/articles/reduce-student-anxiety-and-your-own-during-uncertain-times",
      eventType: "Viewed Article",
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.page_url_path ===
            "/education/articles/reduce-student-anxiety-and-your-own-during-uncertain-times" &&
          p.page_url_full ===
            "https://qa.commonsense.org/education/articles/reduce-student-anxiety-and-your-own-during-uncertain-times" &&
          p.page_title ===
            "Reduce Student Anxiety (and Your Own) During Uncertain Times | Common Sense Education" &&
          p.page_http_status_code === 200 &&
          p.page_language === "en" &&
          p.source_org === "Common Sense Education" &&
          p.cse_content_type === "article" &&
          p.content_type === "article" &&
          p.cse_entity_group === "node" &&
          p.cse_entity_id === 5057335
        );
      },
    },
  ];

  const clickCases = [
    {
      // Important: this CTA is currently emitting "Clicked Link" (not "Clicked Element")
      name: "Clicked Link (EDU Homepage Hero CTA - See the lessons!)",
      path: "/education",
      eventType: "Clicked Link",
      run: () => {
        const selector = ".home-marketing-block a.btn";

        // Prevent navigation so we can assert on the same page.
        cy.contains(selector, "See the lessons!").then(($a) => {
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

        cy.contains(selector, "See the lessons!").click({ force: true });
      },
      assert: (evt) => {
        const p = evt.event_properties || {};
        const text = String(p["[Amplitude] Element Text"] || p.element_text || "").toLowerCase();
        return (
          p.page_url_path === "/education" &&
          String(p.interaction_type || "").toLowerCase() === "click" &&
          text.includes("see the lessons")
        );
      },
    },

    {
      name: 'Clicked Element (UK DIY page - "Play Video" hero button)',
      path: "/education/uk/digital-citizenship",
      eventType: "Clicked Element",
      run: () => {
        // Matches the hero "Play Video" control on the UK DIY page.
        cy.contains("span.video-modal", "Play Video").click({ force: true });
      },
      assert: (evt) => {
        const p = evt.event_properties || {};
        const tag = String(p.element_tag || p["[Amplitude] Element Tag"] || "").toLowerCase();
        const text = String(p.element_text || p["[Amplitude] Element Text"] || "").toLowerCase();
        return (
          p.page_url_path === "/education/uk/digital-citizenship" &&
          String(p.interaction_type || "").toLowerCase() === "click" &&
          tag === "span" &&
          text.includes("play video") &&
          p.element_data_target === "video-modal"
        );
      },
    },

    {
      name: "Clicked Element (Collection - Featured Video teaser title button)",
      path: "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12",
      eventType: "Clicked Element",
      run: () => {
        cy.get('button[id^="video-modal-"].preview-teaser-link').first().click({ force: true });
      },
      assert: (evt) => {
        const p = evt.event_properties || {};
        const pagePath = String(p.page_url_path || "");
        const interaction = String(p.interaction_type || "").toLowerCase();
    
        const tag = String(p.element_tag || p["[Amplitude] Element Tag"] || "").toLowerCase();
        const elId = p.element_id;
    
        const classes = p.element_classes || [];
        const classOk =
          Array.isArray(classes) &&
          classes.includes("preview-teaser-link") &&
          classes.includes("video-modal");
    
        return (
          pagePath === "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12" &&
          interaction === "click" &&
          tag === "button" &&
          typeof elId === "string" &&
          elId.startsWith("video-modal-") &&
          String(p.element_region || "") === elId &&
          classOk &&
          p.cse_entity_id === 5112984 &&
          p.cse_content_type === "collection" &&
          p.page_http_status_code === 200
        );
      },
    },    

    {
      name: 'Clicked Element (Collection Modal - Video.js big "Play Video" button)',
      path: "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12",
      eventType: "Clicked Element",
      run: () => {
        cy.get('button[id^="video-modal-"].preview-teaser-link').first().click({ force: true });
        cy.get("button.vjs-big-play-button").click({ force: true });
      },
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.page_url_path === "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12" &&
          String(p.interaction_type || "").toLowerCase() === "click"
        );
      },
    },
  ];

  const videoCases = [
    {
      name: "Played Video (Collection Featured Video)",
      path: "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12",
      eventType: "Played Video",
      run: () => {
        cy.get('button[id^="video-modal-"].preview-teaser-link').first().click({ force: true });
        cy.get("button.vjs-big-play-button").click({ force: true });
      },
      assert: (evt) => {
        const p = evt.event_properties || {};
    
        // Hard requirements (these are in your captured summary)
        const requiredOk =
          p.page_url_path === "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12" &&
          p.player_state === "playing" &&
          p.play_reason === "start" &&
          p.play_initiator === "click" &&
          p.video_title === "WhatIsDigitalCitizenship_2017" &&
          typeof p.video_url === "string" &&
          p.video_url.includes("WhatIsDigitalCitizenship_2017.mp4");
    
        // Optional validations (only if present)
        const optionalOk =
          (p.video_provider ? p.video_provider === "html5" : true) &&
          (typeof p.duration_seconds === "number" ? p.duration_seconds > 0 : true) &&
          (typeof p.current_time_seconds === "number" ? p.current_time_seconds >= 0 : true) &&
          (typeof p.percent_complete === "number"
            ? p.percent_complete >= 0 && p.percent_complete <= 1
            : true) &&
          (typeof p.page_http_status_code === "number" ? p.page_http_status_code === 200 : true) &&
          (typeof p.cse_entity_id === "number" ? p.cse_entity_id === 5112984 : true) &&
          (p.cse_content_type ? p.cse_content_type === "collection" : true) &&
          (p.source_org ? p.source_org === "Common Sense Education" : true);
    
        return requiredOk && optionalOk;
      },
    },
    {
      name: "Paused Video (Collection Featured Video)",
      path: "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12",
      eventType: "Paused Video",
      run: () => {
        cy.get('button[id^="video-modal-"].preview-teaser-link').first().click({ force: true });
        cy.get("button.vjs-big-play-button").click({ force: true });
    
        // Pause via Video.js control (stable once controls are ready)
        cy.get("button.vjs-play-control").click({ force: true });
      },
      assert: (evt) => {
        const p = evt.event_properties || {};
    
        return (
          p.page_url_path === "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12" &&
          p.page_http_status_code === 200 &&
          p.source_org === "Common Sense Education" &&
          p.cse_content_type === "collection" &&
          p.cse_entity_id === 5112984 &&
    
          p.video_provider === "html5" &&
          p.video_title === "WhatIsDigitalCitizenship_2017" &&
          typeof p.video_url === "string" &&
          p.video_url.includes("WhatIsDigitalCitizenship_2017.mp4") &&
    
          typeof p.current_time_seconds === "number" &&
          p.current_time_seconds >= 0 &&
          typeof p.percent_complete === "number" &&
          p.percent_complete >= 0 &&
          p.percent_complete <= 1 &&
    
          p.player_state === "paused" &&
          p.stop_reason === "user_pause"
        );
      },
    },    
  ];

  const runCase = ({ name, path, eventType, assert, run }) => {
    it(`fires "${eventType}" on ${path} (${name})`, () => {
      cy.visitWithAmplitudeCapture(path);

      // Run the interaction that should produce the event.
      if (typeof run === "function") {
        run();
      }

      // Wait for the event and validate a stable subset of properties.
      cy.waitForAmplitudeEvent(eventType, assert).then((evt) => {
        logVerified(name, evt?.event_type || eventType);
      });
    });
  };

  // Groups keep the output readable and help you isolate failures quickly.
  describe("Viewed Events", () => {
    viewedCases.forEach(runCase);
  });

  describe("Clicked / Interaction Events", () => {
    clickCases.forEach(runCase);
  });

  describe("Video Events", () => {
    videoCases.forEach(runCase);
  });
});



























































