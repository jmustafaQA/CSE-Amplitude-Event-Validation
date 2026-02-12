// cypress/e2e/amplitude_tier1.cy.js

describe("Amplitude Tier-1 Analytics", () => {
  beforeEach(() => {
    cy.setOneTrustAnalyticsConsent();
  });

  const runCase = ({ name, path, eventType, assert, run }) => {
    it(`fires "${eventType}" on ${path} (${name})`, () => {
      cy.visitWithAmplitudeCapture(path);

      if (typeof run === "function") {
        run();
      }

      cy.waitForAmplitudeEvent(eventType, assert).then(() => {
        cy.log(`Verified: ${eventType} (${name}) - properties validated`);
      });
    });
  };

  // Viewed Events
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
          props.page_http_status_code === 200 &&
          props.source_org === "Common Sense Education" &&
          props.search_type === "full_results" &&
          props.search_term === "privacy" &&
          props.result_type === "search" &&
          typeof props.result_count_total === "number"
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
          props.page_http_status_code === 200 &&
          props.source_org === "Common Sense Education" &&
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
          props.page_http_status_code === 200 &&
          props.source_org === "Common Sense Education" &&
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
          props.page_http_status_code === 200 &&
          props.source_org === "Common Sense Education" &&
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
      name: "Viewed Lesson Plan (What Is Media?)",
      path: "/education/digital-literacy/what-is-media",
      eventType: "Viewed Lesson Plan",
      assert: (evt) => {
        const props = evt.event_properties || {};

        return (
          props.ampl_page_view === true &&
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

    {
      name: "Viewed Course (Teaching Digital Literacy and Well-Being)",
      path: "/education/training/teaching-digital-literacy-and-well-being",
      eventType: "Viewed Course",
      assert: (evt) => {
        const props = evt.event_properties || {};

        return (
          props.ampl_page_view === true &&
          props.page_url_path === "/education/training/teaching-digital-literacy-and-well-being" &&
          props.page_url_full ===
            "https://qa.commonsense.org/education/training/teaching-digital-literacy-and-well-being" &&
          props.page_title === "Teaching Digital Literacy and Well-Being | Common Sense Education" &&
          props.page_language === "en" &&
          props.page_http_status_code === 200 &&
          props.source_org === "Common Sense Education" &&
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
          props.page_http_status_code === 200 &&
          props.source_org === "Common Sense Education" &&
          props.cse_content_type === "article" &&
          props.content_type === "article" &&
          props.cse_entity_group === "node" &&
          props.cse_entity_id === 5057335
        );
      },
    },
  ];

  // Clicked / Interaction Events
  const clickCases = [
    {
      name: "Clicked EDU Homepage Hero CTA (See the lessons!)",
      path: "/education",
      eventType: "Clicked Element",
      run: () => {
        const selector = ".home-marketing-block a.btn";

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
        const props = evt.event_properties || {};
        const text = String(props["[Amplitude] Element Text"] || props.element_text || "").trim();
        const pagePath = String(props.page_url_path || "");
        const interaction = String(props.interaction_type || "");
        return (
          pagePath.startsWith("/education") &&
          interaction === "click" &&
          text.toLowerCase().includes("see the lessons")
        );
      },
    },

    {
      name: 'Clicked Element (UK Digital Citizenship - "Play Video" hero button)',
      path: "/education/uk/digital-citizenship",
      eventType: "Clicked Element",
      run: () => {
        cy.get("span.video-modal").contains("Play Video").click({ force: true });
      },
      assert: (evt) => {
        const props = evt.event_properties || {};
        return (
          String(props.page_url_path || "") === "/education/uk/digital-citizenship" &&
          String(props.interaction_type || "") === "click" &&
          String(props.element_text || props["[Amplitude] Element Text"] || "") === "Play Video" &&
          String(props.element_data_toggle || "") === "modal" &&
          String(props.element_data_target || "") === "video-modal"
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
        const props = evt.event_properties || {};
        const pagePath = String(props.page_url_path || "");
        const interaction = String(props.interaction_type || "");
        const tag = String(props.element_tag || props["[Amplitude] Element Tag"] || "");
        const elId = props.element_id;
        const region = String(props.element_region || "");

        return (
          pagePath === "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12" &&
          interaction === "click" &&
          tag === "button" &&
          typeof elId === "string" &&
          elId.startsWith("video-modal-") &&
          region === elId
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
        const props = evt.event_properties || {};
        const pagePath = String(props.page_url_path || "");
        const interaction = String(props.interaction_type || "");
        const tag = String(props.element_tag || props["[Amplitude] Element Tag"] || "");
        const text = String(props.element_text || props["[Amplitude] Element Text"] || "");
        const classes = props.element_classes || [];

        return (
          pagePath === "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12" &&
          interaction === "click" &&
          tag === "button" &&
          text === "Play Video" &&
          Array.isArray(classes) &&
          classes.includes("vjs-big-play-button")
        );
      },
    },

    {
      name: "Played Video (Collection Featured Video)",
      path: "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12",
      eventType: "Played Video",
      run: () => {
        cy.get('button[id^="video-modal-"].preview-teaser-link').first().click({ force: true });
        cy.get("button.vjs-big-play-button").click({ force: true });
      },
      assert: (evt) => {
        const props = evt.event_properties || {};
      
        return (
          props.page_url_path ===
            "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12" &&
          String(props.page_url_full || "").includes(
            "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12"
          ) &&
          props.video_title === "WhatIsDigitalCitizenship_2017" &&
          typeof props.video_url === "string" &&
          props.video_url.includes("WhatIsDigitalCitizenship_2017.mp4") &&
          props.player_state === "playing" &&
          props.play_reason === "start" &&
          props.play_initiator === "click"
        );
      },      
    },    

    {
      name: "Paused Video (Collection Featured Video)",
      path: "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12",
      eventType: "Paused Video",
      run: () => {
        cy.get('button[id^="video-modal-"].preview-teaser-link').first().click({ force: true });
        cy.get("button.vjs-big-play-button").click({ force: true });

        // Pause quickly via player click (Video.js toggles play/pause on click)
        cy.get("video").first().click({ force: true });
      },
      assert: (evt) => {
        const props = evt.event_properties || {};
        const pagePath = String(props.page_url_path || "");
        const provider = String(props.video_provider || "");
        const title = String(props.video_title || "");
        const url = String(props.video_url || "");
        const state = String(props.player_state || "");
        const stopReason = String(props.stop_reason || "");

        return (
          pagePath === "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12" &&
          provider.toLowerCase() === "html5" &&
          title.includes("WhatIsDigitalCitizenship_2017") &&
          url.includes("WhatIsDigitalCitizenship_2017.mp4") &&
          state === "paused" &&
          stopReason === "user_pause" &&
          typeof props.current_time_seconds === "number" &&
          props.current_time_seconds >= 0
        );
      },
    },
  ];

  describe("Viewed Events", () => {
    viewedCases.forEach(runCase);
  });

  describe("Clicked / Interaction Events", () => {
    clickCases.forEach(runCase);
  });
});

























































