// cypress/e2e/amplitude_tier1.cy.js

describe("Amplitude Tier-1 Analytics", () => {
  // Ignore specific known production site exceptions so analytics assertions can run.
  // This does not suppress Cypress failures or Amplitude assertion failures.
  Cypress.on("uncaught:exception", (err) => {
    const msg = String(err && err.message ? err.message : "");

    const ignoreList = [
      "Cannot read properties of undefined (reading 'messages')",
      "Cannot read properties of undefined (reading 'PageState')",
      "Cannot read properties of null (reading 'cs.modal')",
    ];

    if (ignoreList.some((m) => msg.includes(m))) {
      return false;
    }

    return true;
  });

  beforeEach(() => {
    cy.setOneTrustAnalyticsConsent();
  });

  const logVerified = (name, evt) => {
    const p = evt?.event_properties || {};
    const summary = {
      event_type: evt?.event_type,
      page_url_path: p.page_url_path,
      ...(p.interaction_type !== undefined && { interaction_type: p.interaction_type }),
      ...(p.cse_content_type !== undefined && { cse_content_type: p.cse_content_type }),
      ...(p.player_state !== undefined && { player_state: p.player_state }),
      ...(p.search_term !== undefined && { search_term: p.search_term }),
      ...(p.page_http_status_code !== undefined && { page_http_status_code: p.page_http_status_code }),
    };
    cy.task("log", `[AMP] ✓ ${name} → ${evt?.event_type}`);
    cy.task("logJson", summary);
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

  const dismissCtaModal = () => {
    cy.window().then((win) => {
      const el = win.document.getElementById("cta-modal-redirect");
      if (el) {
        el.style.display = "none";
        el.classList.remove("show");
      }
      win.document.body.classList.remove("modal-open");
      const backdrop = win.document.querySelector(".modal-backdrop");
      if (backdrop) backdrop.remove();
    });
    cy.wait(1000);
  };

  const runCase = ({ name, path, eventType, assert, run, visitOptions, timeoutMs }) => {
    it(`fires "${eventType}" on ${path} (${name})`, () => {
      cy.visitWithAmplitudeCapture(path, visitOptions);

      if (typeof run === "function") {
        run();
      }

      const effectiveTimeout = typeof timeoutMs === "number" ? timeoutMs : 60000;

      cy.waitForAmplitudeEvent(eventType, assert, effectiveTimeout).then((evt) => {
        logVerified(name, evt);
      });
    });
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
          matchesFullUrl(p.page_url_full, "/education/search?keywords=privacy") &&
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
      name: "Viewed Search (Collections filter + Sort by date)",
      path: "/education/search?f%5B0%5D=search_type%3Acollection&sort_by=field_search_sort_date",
      eventType: "Viewed Search",
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.page_url_path === "/education/search" &&
          matchesFullUrl(
            p.page_url_full,
            "/education/search?f%5B0%5D=search_type%3Acollection&sort_by=field_search_sort_date"
          ) &&
          p.page_title === "Search Results for Common Sense Education" &&
          p.page_http_status_code === 200 &&
          p.page_language === "en" &&
          p.source_org === "Common Sense Education" &&
          p.search_type === "full_results" &&
          (p.search_term === null || p.search_term === undefined) &&
          p.search_sort === "field_search_sort_date" &&
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
          matchesFullUrl(p.page_url_full, "/education/digital-literacy") &&
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
          matchesFullUrl(p.page_url_full, "/education/digital-citizenship") &&
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
          matchesFullUrl(p.page_url_full, "/education/uk/digital-citizenship") &&
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
          matchesFullUrl(p.page_url_full, "/education") &&
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
          matchesFullUrl(p.page_url_full, "/education/digital-literacy/what-is-media") &&
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
          matchesFullUrl(p.page_url_full, "/education/training/teaching-digital-literacy-and-well-being") &&
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
          p.page_url_path === "/education/articles/reduce-student-anxiety-and-your-own-during-uncertain-times" &&
          matchesFullUrl(
            p.page_url_full,
            "/education/articles/reduce-student-anxiety-and-your-own-during-uncertain-times"
          ) &&
          p.page_title === "Reduce Student Anxiety (and Your Own) During Uncertain Times | Common Sense Education" &&
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
    {
      name: "Viewed Lesson Collection (Grades 9-12)",
      path: "/education/collections/digital-citizenship-lessons-for-grades-9-12",
      eventType: "Viewed Lesson Collection",
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.page_url_path === "/education/collections/digital-citizenship-lessons-for-grades-9-12" &&
          matchesFullUrl(p.page_url_full, "/education/collections/digital-citizenship-lessons-for-grades-9-12") &&
          p.page_title === "Digital Citizenship Lessons for Grades 9-12 | Common Sense Education" &&
          p.page_http_status_code === 200 &&
          p.page_language === "en" &&
          p.source_org === "Common Sense Education" &&
          p.cse_content_title === "Digital Citizenship Lessons for Grades 9-12" &&
          p.cse_content_type === "collection" &&
          p.cse_entity_group === "node" &&
          optionalEq(p, "cse_entity_id", 5120305) &&
          optionalEq(p, "cse_content_gated", false) &&
          optionalEq(p, "cse_content_has_video", false) &&
          optionalEq(p, "is_admin_theme_page", false)
        );
      },
    },
    {
      name: "Viewed 404 Page (/education/blargh)",
      path: "/education/blargh",
      eventType: "Viewed 404 Page",
      visitOptions: { failOnStatusCode: false },
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.ampl_page_view === false &&
          p.page_title === "Page Not Found | Common Sense Education" &&
          p.page_url_path === "/education/blargh" &&
          matchesFullUrl(p.page_url_full, "/education/blargh") &&
          isAllowedDomain(p.page_url_domain) &&
          p.page_language === "en" &&
          p.source_org === "Common Sense Education" &&
          p.page_http_status_code === 404 &&
          p.source_system_route_name === "entity.node.canonical" &&
          p.cse_content_title === "Page Not Found" &&
          p.cse_content_type === "page" &&
          p.cse_entity_group === "node" &&
          p.cse_entity_id === 5105585 &&
          p.is_admin_theme_page === false
        );
      },
    },
    {
      name: "Viewed Video (What Is AI?)",
      path: "/education/videos/what-is-ai",
      eventType: "Viewed Video",
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.page_url_path === "/education/videos/what-is-ai" &&
          matchesFullUrl(p.page_url_full, "/education/videos/what-is-ai") &&
          p.page_title === "What Is AI? | Common Sense Education" &&
          p.page_http_status_code === 200 &&
          p.page_language === "en" &&
          p.source_org === "Common Sense Education" &&
          p.cse_content_title === "What Is AI?" &&
          p.cse_content_type === "video" &&
          p.cse_entity_group === "node" &&
          p.cse_entity_id === 5113385 &&
          p.is_admin_theme_page === false
        );
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
        return (
          p.ampl_page_view === true &&
          p.page_url_path === "/user/register" &&
          p.page_title === "Create Your Free Account | Common Sense Education | Common Sense Education" &&
          p.page_http_status_code === 200 &&
          p.page_language === "en" &&
          p.source_org === "Common Sense Education" &&
          p.source_system_route_name === "user.register" &&
          p.is_admin_theme_page === false &&
          p.form_id === "user_register_form"
        );
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
          optionalEq(p, "form_id", "user_login_form") && optionalEq(p, "source_system_route_name", "user.login");

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
          optionalEq(p, "form_id", "user_pass") && optionalEq(p, "source_system_route_name", "user.pass");

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
        cy.get("[data-target='video-modal'], span.video-modal, button.video-modal")
          .first()
          .should("exist")
          .click({ force: true });
      },
      assert: (evt) => {
        const p = evt.event_properties || {};
        const text = String(p.element_text || p["[Amplitude] Element Text"] || "").toLowerCase();
        return (
          p.page_url_path === "/education/uk/digital-citizenship" &&
          String(p.interaction_type || "").toLowerCase() === "click" &&
          text.includes("play video")
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
          !Array.isArray(classes) ||
          (classes.includes("preview-teaser-link") && classes.includes("video-modal"));

        return (
          pagePath === "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12" &&
          interaction === "click" &&
          tag === "button" &&
          typeof elId === "string" &&
          elId.startsWith("video-modal-") &&
          classOk &&
          optionalEq(p, "cse_entity_id", 5112984) &&
          optionalEq(p, "cse_content_type", "collection") &&
          (typeof p.page_http_status_code === "number" ? p.page_http_status_code === 200 : true)
        );
      },
    },
    {
      name: 'Clicked Element (Collection Modal - Video.js big "Play Video" button)',
      path: "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12",
      eventType: "Clicked Element",
      run: () => {
        dismissCtaModal();
        cy.get('button[id^="video-modal-"].preview-teaser-link').first().should("be.visible").click({ force: true });
        cy.get("video.vjs-tech", { timeout: 60000 }).should("exist");
        cy.get("button.vjs-big-play-button", { timeout: 30000 }).should("be.visible").click({ force: true });
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
      timeoutMs: 90000,
      run: () => {
        dismissCtaModal();
        cy.get('button[id^="video-modal-"].preview-teaser-link').first().should("be.visible").click({ force: true });

        cy.get("video.vjs-tech", { timeout: 30000 }).should("exist");
        cy.get("button.vjs-big-play-button", { timeout: 30000 }).should("be.visible").click({ force: true });

        cy.get("video.vjs-tech", { timeout: 20000 }).should(($v) => {
          const v = $v[0];
          expect(v.paused, "video paused").to.eq(false);
          expect(v.currentTime, "video currentTime").to.be.greaterThan(0);
        });
      },
      assert: (evt) => {
        const p = evt.event_properties || {};

        const requiredOk =
          p.page_url_path === "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12" &&
          matchesFullUrl(p.page_url_full, "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12");

        const optionalOk =
          (p.source_org ? p.source_org === "Common Sense Education" : true) &&
          (typeof p.page_http_status_code === "number" ? p.page_http_status_code === 200 : true) &&
          (p.player_state ? ["playing", "play"].includes(String(p.player_state).toLowerCase()) : true) &&
          (p.play_reason ? ["start", "resume"].includes(String(p.play_reason).toLowerCase()) : true) &&
          (p.play_initiator ? ["click", "auto"].includes(String(p.play_initiator).toLowerCase()) : true) &&
          (p.video_title ? typeof p.video_title === "string" && p.video_title.length > 0 : true) &&
          (p.video_url ? typeof p.video_url === "string" && p.video_url.length > 0 : true) &&
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
      timeoutMs: 90000,
      run: () => {
        dismissCtaModal();
        cy.get('button[id^="video-modal-"].preview-teaser-link').first().should("be.visible").click({ force: true });

        cy.get("video.vjs-tech", { timeout: 60000 }).should("exist");
        cy.get("button.vjs-big-play-button", { timeout: 30000 }).should("be.visible").click({ force: true });

        cy.get("button.vjs-play-control", { timeout: 30000 }).should("be.visible").click({ force: true });
      },
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.page_url_path === "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12" &&
          (typeof p.page_http_status_code === "number" ? p.page_http_status_code === 200 : true) &&
          (p.source_org ? p.source_org === "Common Sense Education" : true) &&
          (p.cse_content_type ? p.cse_content_type === "collection" : true) &&
          (typeof p.cse_entity_id === "number" ? p.cse_entity_id === 5112984 : true) &&
          (p.video_provider ? p.video_provider === "html5" : true) &&
          (p.player_state ? String(p.player_state).toLowerCase() === "paused" : true)
        );
      },
    },
  ];

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
