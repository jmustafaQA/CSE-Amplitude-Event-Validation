// cypress/e2e/amplitude_tier1.cy.js

describe("Amplitude Tier-1 Analytics", () => {
  beforeEach(() => {
    cy.setOneTrustAnalyticsConsent();
  });

  const logVerified = (name, eventType) => {
    cy.task("log", `[AMP] Verified: ${eventType} (${name})`);
  };

  const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const matchesFullUrl = (fullUrl, pathWithQuery = "") => {
    const safePath = escapeRegex(pathWithQuery);
    const regex = new RegExp(`^https://(qa|www)\\.commonsense\\.org${safePath}$`);
    return regex.test(String(fullUrl || ""));
  };

  const isAllowedDomain = (domain) => /^(qa|www)\.commonsense\.org$/.test(String(domain || ""));

  const optionalEq = (p, key, expected) => {
    if (p[key] === undefined) return true;
    return p[key] === expected;
  };

  const optionalIsNumber = (p, key) => {
    if (p[key] === undefined) return true;
    return typeof p[key] === "number";
  };

  const assertCorePage = (p, { path, full, title, status, amplPageView, language }) => {
    if (!p) return false;

    if (path && p.page_url_path !== path) return false;
    if (full && !matchesFullUrl(p.page_url_full, full)) return false;
    if (title && p.page_title !== title) return false;

    if (typeof status === "number" && p.page_http_status_code !== status) return false;

    if (typeof amplPageView === "boolean") {
      if (typeof p.ampl_page_view === "boolean" && p.ampl_page_view !== amplPageView) return false;
    }

    if (language) {
      if (p.page_language && p.page_language !== language) return false;
    }

    if (p.page_url_domain !== undefined && !isAllowedDomain(p.page_url_domain)) return false;

    return true;
  };

  const viewedCases = [
    {
      name: "Viewed Search",
      path: "/education/search?keywords=privacy",
      eventType: "Viewed Search",
      assert: (evt) => {
        const p = evt.event_properties || {};
        const coreOk = assertCorePage(p, {
          path: "/education/search",
          full: "/education/search?keywords=privacy",
          title: "Search Results for Common Sense Education",
          status: 200,
          amplPageView: true,
          language: "en",
        });

        const specificOk =
          optionalEq(p, "source_org", "Common Sense Education") &&
          optionalEq(p, "search_type", "full_results") &&
          optionalEq(p, "search_term", "privacy") &&
          optionalEq(p, "result_type", "search") &&
          optionalIsNumber(p, "result_count_total");

        return coreOk && specificOk;
      },
    },

    {
      name: "Viewed Search (Collections filter + Sort by date)",
      path: "/education/search?f%5B0%5D=search_type%3Acollection&sort_by=field_search_sort_date",
      eventType: "Viewed Search",
      assert: (evt) => {
        const p = evt.event_properties || {};
        const coreOk = assertCorePage(p, {
          path: "/education/search",
          full: "/education/search?f%5B0%5D=search_type%3Acollection&sort_by=field_search_sort_date",
          title: "Search Results for Common Sense Education",
          status: 200,
          amplPageView: true,
          language: "en",
        });

        const specificOk =
          optionalEq(p, "source_org", "Common Sense Education") &&
          optionalEq(p, "source_system_route_name", "view.search.cse_search_page_1") &&
          optionalEq(p, "search_type", "full_results") &&
          (p.search_term === undefined || p.search_term === null || typeof p.search_term === "string") &&
          optionalEq(p, "search_sort", "field_search_sort_date") &&
          optionalEq(p, "result_type", "search") &&
          (p.result_count_total === undefined ||
            (typeof p.result_count_total === "number" && p.result_count_total >= 0));

        return coreOk && specificOk;
      },
    },

    {
      name: "Viewed Lesson Info (Digital Literacy)",
      path: "/education/digital-literacy",
      eventType: "Viewed Lesson Info",
      assert: (evt) => {
        const p = evt.event_properties || {};
        const coreOk = assertCorePage(p, {
          path: "/education/digital-literacy",
          full: "/education/digital-literacy",
          title: "Digital Literacy & Well-Being Curriculum | Common Sense Education",
          status: 200,
          amplPageView: true,
          language: "en",
        });

        const specificOk =
          optionalEq(p, "source_org", "Common Sense Education") &&
          optionalEq(p, "cse_content_type", "component_page") &&
          optionalEq(p, "cse_content_title", "Digital Literacy & Well-Being Curriculum") &&
          optionalEq(p, "cse_entity_group", "node") &&
          optionalEq(p, "cse_entity_id", 5122762);

        return coreOk && specificOk;
      },
    },

    {
      name: "Viewed Lesson Info (Digital Citizenship)",
      path: "/education/digital-citizenship",
      eventType: "Viewed Lesson Info",
      assert: (evt) => {
        const p = evt.event_properties || {};
        const coreOk = assertCorePage(p, {
          path: "/education/digital-citizenship",
          full: "/education/digital-citizenship",
          title: "Lesson Browse | Common Sense Education",
          status: 200,
          amplPageView: true,
          language: "en",
        });

        const specificOk =
          optionalEq(p, "source_org", "Common Sense Education") &&
          optionalEq(p, "source_system_route_name", "cse_digcit.digital_citizenship_curriculum");

        return coreOk && specificOk;
      },
    },

    {
      name: "Viewed Lesson Info (UK Digital Citizenship)",
      path: "/education/uk/digital-citizenship",
      eventType: "Viewed Lesson Info",
      assert: (evt) => {
        const p = evt.event_properties || {};
        const coreOk = assertCorePage(p, {
          path: "/education/uk/digital-citizenship",
          full: "/education/uk/digital-citizenship",
          title: "Digital Citizenship Lessons for the UK | Common Sense Education",
          status: 200,
          amplPageView: true,
          language: "en-GB",
        });

        const specificOk =
          optionalEq(p, "source_org", "Common Sense Education") &&
          optionalEq(p, "cse_content_type", "diy_page") &&
          optionalEq(p, "cse_content_title", "Digital Citizenship Lessons for the UK") &&
          optionalEq(p, "cse_entity_group", "node") &&
          optionalEq(p, "cse_entity_id", 5091193);

        return coreOk && specificOk;
      },
    },

    {
      name: "Viewed Edu Home Page",
      path: "/education",
      eventType: "Viewed Edu Home Page",
      assert: (evt) => {
        const p = evt.event_properties || {};
        const coreOk = assertCorePage(p, {
          path: "/education",
          full: "/education",
          title: "Common Sense Education",
          status: 200,
          amplPageView: true,
          language: "en",
        });

        const specificOk =
          optionalEq(p, "source_org", "Common Sense Education") &&
          optionalEq(p, "cse_content_type", "homepage") &&
          optionalEq(p, "cse_content_title", "Homepage") &&
          optionalEq(p, "cse_entity_group", "node") &&
          optionalEq(p, "cse_entity_id", 5118191);

        return coreOk && specificOk;
      },
    },

    {
      name: "Viewed Lesson Plan (What Is Media?)",
      path: "/education/digital-literacy/what-is-media",
      eventType: "Viewed Lesson Plan",
      assert: (evt) => {
        const p = evt.event_properties || {};
        const coreOk = assertCorePage(p, {
          path: "/education/digital-literacy/what-is-media",
          full: "/education/digital-literacy/what-is-media",
          title: "What Is Media? | Common Sense Education",
          status: 200,
          amplPageView: true,
          language: "en",
        });

        const specificOk =
          optionalEq(p, "source_org", "Common Sense Education") &&
          optionalEq(p, "cse_content_type", "lesson_plan") &&
          optionalEq(p, "content_type", "lesson_plan") &&
          optionalEq(p, "cse_entity_group", "node") &&
          optionalEq(p, "cse_entity_id", 5123210);

        return coreOk && specificOk;
      },
    },

    {
      name: "Viewed Course (Teaching Digital Literacy and Well-Being)",
      path: "/education/training/teaching-digital-literacy-and-well-being",
      eventType: "Viewed Course",
      assert: (evt) => {
        const p = evt.event_properties || {};
        const coreOk = assertCorePage(p, {
          path: "/education/training/teaching-digital-literacy-and-well-being",
          full: "/education/training/teaching-digital-literacy-and-well-being",
          title: "Teaching Digital Literacy and Well-Being | Common Sense Education",
          status: 200,
          amplPageView: true,
          language: "en",
        });

        const specificOk =
          optionalEq(p, "source_org", "Common Sense Education") &&
          optionalEq(p, "cse_content_type", "pd_course") &&
          optionalEq(p, "cse_content_title", "Teaching Digital Literacy and Well-Being") &&
          optionalEq(p, "cse_entity_group", "node") &&
          optionalEq(p, "cse_entity_id", 5122781);

        return coreOk && specificOk;
      },
    },

    {
      name: "Viewed Article (Reduce Student Anxiety)",
      path: "/education/articles/reduce-student-anxiety-and-your-own-during-uncertain-times",
      eventType: "Viewed Article",
      assert: (evt) => {
        const p = evt.event_properties || {};
        const coreOk = assertCorePage(p, {
          path: "/education/articles/reduce-student-anxiety-and-your-own-during-uncertain-times",
          full: "/education/articles/reduce-student-anxiety-and-your-own-during-uncertain-times",
          title:
            "Reduce Student Anxiety (and Your Own) During Uncertain Times | Common Sense Education",
          status: 200,
          amplPageView: true,
          language: "en",
        });

        const specificOk =
          optionalEq(p, "source_org", "Common Sense Education") &&
          optionalEq(p, "cse_content_type", "article") &&
          optionalEq(p, "content_type", "article") &&
          optionalEq(p, "cse_entity_group", "node") &&
          optionalEq(p, "cse_entity_id", 5057335);

        return coreOk && specificOk;
      },
    },

    {
      name: "Viewed Lesson Collection (Grades 9-12)",
      path: "/education/collections/digital-citizenship-lessons-for-grades-9-12",
      eventType: "Viewed Lesson Collection",
      assert: (evt) => {
        const p = evt.event_properties || {};
        const coreOk = assertCorePage(p, {
          path: "/education/collections/digital-citizenship-lessons-for-grades-9-12",
          full: "/education/collections/digital-citizenship-lessons-for-grades-9-12",
          status: 200,
          amplPageView: true,
          language: "en",
        });

        const specificOk =
          optionalEq(p, "source_org", "Common Sense Education") &&
          optionalEq(p, "cse_content_type", "collection") &&
          optionalEq(p, "cse_content_title", "Digital Citizenship Lessons for Grades 9-12") &&
          optionalEq(p, "cse_entity_group", "node") &&
          optionalEq(p, "cse_entity_id", 5120305) &&
          optionalEq(p, "cse_content_gated", false) &&
          optionalEq(p, "cse_content_has_video", false);

        return coreOk && specificOk;
      },
    },

    {
      name: "Viewed 404 Page (/education/blargh)",
      path: "/education/blargh",
      eventType: "Viewed 404 Page",
      visitOptions: { failOnStatusCode: false },
      assert: (evt) => {
        const p = evt.event_properties || {};
        const coreOk = assertCorePage(p, {
          path: "/education/blargh",
          full: "/education/blargh",
          title: "Page Not Found | Common Sense Education",
          status: 404,
          amplPageView: false,
          language: "en",
        });

        const specificOk =
          optionalEq(p, "source_org", "Common Sense Education") &&
          optionalEq(p, "is_admin_theme_page", false) &&
          optionalEq(p, "cse_content_title", "Page Not Found") &&
          optionalEq(p, "cse_content_type", "page") &&
          optionalEq(p, "cse_entity_group", "node") &&
          optionalEq(p, "cse_entity_id", 5105585);

        return coreOk && specificOk;
      },
    },

    {
      name: "Viewed Video (What Is AI?)",
      path: "/education/videos/what-is-ai",
      eventType: "Viewed Video",
      assert: (evt) => {
        const p = evt.event_properties || {};
        const coreOk = assertCorePage(p, {
          path: "/education/videos/what-is-ai",
          full: "/education/videos/what-is-ai",
          title: "What Is AI? | Common Sense Education",
          status: 200,
          amplPageView: true,
          language: "en",
        });

        const specificOk =
          optionalEq(p, "source_org", "Common Sense Education") &&
          optionalEq(p, "cse_content_type", "video") &&
          optionalEq(p, "cse_content_title", "What Is AI?") &&
          optionalEq(p, "cse_entity_group", "node") &&
          optionalEq(p, "cse_entity_id", 5113385);

        return coreOk && specificOk;
      },
    },
  ];

  const authCases = [
    {
      name: "Viewed Login Form",
      path: "/user/login",
      eventType: "Viewed Login Form",
      assert: (evt) => {
        const p = evt.event_properties || {};
        const coreOk = assertCorePage(p, {
          path: "/user/login",
          full: "/user/login",
          title: "Sign In | Common Sense Education",
          status: 200,
          amplPageView: true,
          language: "en",
        });

        const specificOk =
          optionalEq(p, "source_org", "Common Sense Education") &&
          optionalEq(p, "source_system_route_name", "user.login") &&
          optionalEq(p, "is_admin_theme_page", false) &&
          optionalEq(p, "form_id", "user_login_form");

        return coreOk && specificOk;
      },
    },
    {
      name: "Viewed Forgot Password Form",
      path: "/user/password",
      eventType: "Viewed Forgot Password Form",
      assert: (evt) => {
        const p = evt.event_properties || {};
        const coreOk = assertCorePage(p, {
          path: "/user/password",
          full: "/user/password",
          title: "Request New Password | Common Sense Education",
          status: 200,
          amplPageView: true,
          language: "en",
        });

        const specificOk =
          optionalEq(p, "source_org", "Common Sense Education") &&
          optionalEq(p, "source_system_route_name", "user.pass") &&
          optionalEq(p, "is_admin_theme_page", false) &&
          optionalEq(p, "form_id", "user_pass");

        return coreOk && specificOk;
      },
    },
  ];

  const registrationCases = [
    {
      name: "Viewed Registration Form",
      path: "/user/register",
      eventType: "Viewed Registration Form",
      assert: (evt) => {
        const p = evt.event_properties || {};
        const coreOk = assertCorePage(p, {
          path: "/user/register",
          full: "/user/register",
          title: "Create Your Free Account | Common Sense Education | Common Sense Education",
          status: 200,
          amplPageView: true,
          language: "en",
        });

        const specificOk =
          optionalEq(p, "source_org", "Common Sense Education") &&
          optionalEq(p, "source_system_route_name", "user.register") &&
          optionalEq(p, "is_admin_theme_page", false) &&
          optionalEq(p, "form_id", "user_register_form");

        return coreOk && specificOk;
      },
    },
  ];

  const clickCases = [
    {
      name: "Clicked Link (EDU Homepage Hero CTA - See the lessons!)",
      path: "/education",
      eventType: "Clicked Link",
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
          (p.element_data_target ? p.element_data_target === "video-modal" : true)
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
        const tag = String(p.element_tag || p["[Amplitude] Element Tag"] || "").toLowerCase();
        const interaction = String(p.interaction_type || "").toLowerCase();

        const classes = p.element_classes || [];
        const classOk =
          Array.isArray(classes) &&
          classes.includes("preview-teaser-link") &&
          classes.includes("video-modal");

        const elId = p.element_id;

        return (
          p.page_url_path === "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12" &&
          interaction === "click" &&
          tag === "button" &&
          typeof elId === "string" &&
          elId.startsWith("video-modal-") &&
          classOk
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
      
        // Hard requirements that should always be stable
        const requiredOk =
          p.page_url_path ===
            "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12" &&
          matchesFullUrl(
            p.page_url_full,
            "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12"
          );
      
        // Soft requirements (validate only if the field exists)
        const optionalOk =
          (p.source_org ? p.source_org === "Common Sense Education" : true) &&
          (typeof p.page_http_status_code === "number" ? p.page_http_status_code === 200 : true) &&
      
          // These often drift between envs or SDK versions
          (p.player_state ? ["playing", "play"].includes(String(p.player_state).toLowerCase()) : true) &&
          (p.play_reason ? ["start", "resume"].includes(String(p.play_reason).toLowerCase()) : true) &&
          (p.play_initiator ? ["click", "auto"].includes(String(p.play_initiator).toLowerCase()) : true) &&
      
          // Title/url can differ or be absent on QA
          (p.video_title ? typeof p.video_title === "string" && p.video_title.length > 0 : true) &&
          (p.video_url ? typeof p.video_url === "string" && p.video_url.length > 0 : true) &&
      
          // If percent fields exist, ensure they are in range
          (typeof p.percent_complete === "number"
            ? p.percent_complete >= 0 && p.percent_complete <= 1
            : true) &&
          (typeof p.current_time_seconds === "number" ? p.current_time_seconds >= 0 : true);
      
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
        cy.get("button.vjs-play-control").click({ force: true });
      },
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.page_url_path === "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12" &&
          optionalEq(p, "player_state", "paused") &&
          optionalEq(p, "stop_reason", "user_pause") &&
          (p.current_time_seconds === undefined ||
            (typeof p.current_time_seconds === "number" && p.current_time_seconds >= 0)) &&
          (p.percent_complete === undefined ||
            (typeof p.percent_complete === "number" && p.percent_complete >= 0 && p.percent_complete <= 1))
        );
      },
    },
  ];

  const runCase = ({ name, path, eventType, assert, run, visitOptions }) => {
    it(`fires "${eventType}" on ${path} (${name})`, () => {
      cy.visitWithAmplitudeCapture(path, visitOptions);

      if (typeof run === "function") {
        run();
      }

      cy.waitForAmplitudeEvent(eventType, assert).then((evt) => {
        logVerified(name, evt?.event_type || eventType);
      });
    });
  };

  describe("Viewed Events", () => {
    viewedCases.forEach(runCase);
  });

  describe("Registration Events", () => {
    registrationCases.forEach(runCase);
  });

  describe("Auth Events", () => {
    authCases.forEach(runCase);
  });

  describe("Clicked / Interaction Events", () => {
    clickCases.forEach(runCase);
  });

  describe("Video Events", () => {
    videoCases.forEach(runCase);
  });
});


























































