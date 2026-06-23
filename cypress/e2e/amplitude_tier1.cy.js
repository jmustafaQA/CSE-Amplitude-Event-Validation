// cypress/e2e/amplitude_tier1.cy.js

describe("CSE Amplitude Event Validation — Tier 1", () => {
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

  const runCase = ({ name, path, eventType, assert, run, visitOptions, timeoutMs, skip }) => {
    const itFn = skip ? it.skip : it;
    itFn(`fires "${eventType}" on ${path} (${name})`, () => {
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
          p.cse_content_type === "component_page" &&
          p.cse_content_title === "Digital Citizenship Lessons for the UK" &&
          p.cse_entity_group === "node" &&
          p.cse_entity_id === 5126575
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
    {
      name: "Viewed Page (AI in Schools)",
      path: "/education/ai-in-schools",
      eventType: "Viewed Page",
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.page_url_path === "/education/ai-in-schools" &&
          matchesFullUrl(p.page_url_full, "/education/ai-in-schools") &&
          p.page_title === "Navigating AI in Schools | Common Sense Education" &&
          p.page_http_status_code === 200 &&
          p.page_language === "en" &&
          p.source_org === "Common Sense Education" &&
          p.cse_content_type === "component_page" &&
          p.cse_entity_group === "node" &&
          p.cse_entity_id === 5126572
        );
      },
    },
    {
      name: "Viewed Lesson Collection (UK AI Literacy)",
      path: "/education/uk/collections/ai-literacy-lessons-for-years-7-13",
      eventType: "Viewed Lesson Collection",
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.page_url_path === "/education/uk/collections/ai-literacy-lessons-for-years-7-13" &&
          matchesFullUrl(p.page_url_full, "/education/uk/collections/ai-literacy-lessons-for-years-7-13") &&
          p.page_title === "AI Literacy Lessons for Years 7-13+ (UK) | Common Sense Education" &&
          p.page_http_status_code === 200 &&
          p.page_language === "en-GB" &&
          p.source_org === "Common Sense Education" &&
          p.cse_content_type === "collection" &&
          p.cse_entity_group === "node" &&
          p.cse_entity_id === 5117155
        );
      },
    },
    {
      name: "Viewed Lesson Collection (UK DC Early Years)",
      path: "/education/collections/digital-citizenship-for-early-years-and-primary-learners-uk",
      eventType: "Viewed Lesson Collection",
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.page_url_path === "/education/collections/digital-citizenship-for-early-years-and-primary-learners-uk" &&
          matchesFullUrl(
            p.page_url_full,
            "/education/collections/digital-citizenship-for-early-years-and-primary-learners-uk"
          ) &&
          p.page_title === "Digital Citizenship for Early Years and Primary Learners (UK) | Common Sense Education" &&
          p.page_http_status_code === 200 &&
          p.source_org === "Common Sense Education" &&
          p.cse_content_type === "collection" &&
          p.cse_entity_group === "node" &&
          p.cse_entity_id === 5115031
        );
      },
    },
    {
      name: "Viewed Course (AI Basics for K-12 Teachers)",
      path: "/education/training/ai-basics-for-k-12-teachers",
      eventType: "Viewed Course",
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.page_url_path === "/education/training/ai-basics-for-k-12-teachers" &&
          matchesFullUrl(p.page_url_full, "/education/training/ai-basics-for-k-12-teachers") &&
          p.page_title === "AI Basics for K–12 Teachers | Common Sense Education" &&
          p.page_http_status_code === 200 &&
          p.page_language === "en" &&
          p.source_org === "Common Sense Education" &&
          p.cse_content_type === "pd_course" &&
          p.cse_entity_group === "node" &&
          p.cse_entity_id === 5124492
        );
      },
    },
    {
      name: "Viewed Course (ChatGPT Foundations for K-12 Educators)",
      path: "/education/training/chatgpt-k12-foundations",
      eventType: "Viewed Course",
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.page_url_path === "/education/training/chatgpt-k12-foundations" &&
          matchesFullUrl(p.page_url_full, "/education/training/chatgpt-k12-foundations") &&
          p.page_title === "ChatGPT Foundations for K–12 Educators | Common Sense Education" &&
          p.page_http_status_code === 200 &&
          p.page_language === "en" &&
          p.source_org === "Common Sense Education" &&
          p.cse_content_type === "pd_course" &&
          p.cse_entity_group === "node" &&
          p.cse_entity_id === 5118510
        );
      },
    },
    {
      name: "Viewed Course (Advanced ChatGPT for K-12)",
      path: "/education/training/advanced-chatgpt-for-k-12",
      eventType: "Viewed Course",
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.page_url_path === "/education/training/advanced-chatgpt-for-k-12" &&
          matchesFullUrl(p.page_url_full, "/education/training/advanced-chatgpt-for-k-12") &&
          p.page_title === "Advanced ChatGPT for K-12 | Common Sense Education" &&
          p.page_http_status_code === 200 &&
          p.page_language === "en" &&
          p.source_org === "Common Sense Education" &&
          p.cse_content_type === "pd_course" &&
          p.cse_entity_group === "node" &&
          p.cse_entity_id === 5122779
        );
      },
    },
    {
      name: "Viewed Course (Modeling Healthy Digital Habits)",
      path: "/education/training/modeling-healthy-digital-habits",
      eventType: "Viewed Course",
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.page_url_path === "/education/training/modeling-healthy-digital-habits" &&
          matchesFullUrl(p.page_url_full, "/education/training/modeling-healthy-digital-habits") &&
          p.page_title === "Modeling Healthy Digital Habits | Common Sense Education" &&
          p.page_http_status_code === 200 &&
          p.page_language === "en" &&
          p.source_org === "Common Sense Education" &&
          p.cse_content_type === "pd_course" &&
          p.cse_entity_group === "node" &&
          p.cse_entity_id === 5126107
        );
      },
    },
    {
      name: "Viewed Article (ChatGPT and Beyond)",
      path: "/education/articles/chatgpt-and-beyond-how-to-handle-ai-in-schools",
      eventType: "Viewed Article",
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.page_url_path === "/education/articles/chatgpt-and-beyond-how-to-handle-ai-in-schools" &&
          matchesFullUrl(
            p.page_url_full,
            "/education/articles/chatgpt-and-beyond-how-to-handle-ai-in-schools"
          ) &&
          p.page_title === "ChatGPT and Beyond: How to Handle AI in Schools | Common Sense Education" &&
          p.page_http_status_code === 200 &&
          p.page_language === "en" &&
          p.source_org === "Common Sense Education" &&
          p.cse_content_type === "article" &&
          p.cse_entity_group === "node" &&
          p.cse_entity_id === 5111720
        );
      },
    },
    {
      name: "Viewed Article (Teachers Essential Guide to AI with Apple)",
      path: "/education/articles/teachers-essential-guide-to-ai-fundamentals-with-apple",
      eventType: "Viewed Article",
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.page_url_path === "/education/articles/teachers-essential-guide-to-ai-fundamentals-with-apple" &&
          matchesFullUrl(
            p.page_url_full,
            "/education/articles/teachers-essential-guide-to-ai-fundamentals-with-apple"
          ) &&
          p.page_title === "Teachers' Essential Guide to AI Fundamentals with Apple | Common Sense Education" &&
          p.page_http_status_code === 200 &&
          p.page_language === "en" &&
          p.source_org === "Common Sense Education" &&
          p.cse_content_type === "article" &&
          p.cse_entity_group === "node" &&
          p.cse_entity_id === 5124510
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
          p.page_url_path === "/user/register" &&
          optionalEq(p, "ampl_page_view", true) &&
          optionalEq(p, "page_title", "Create your free account | Common Sense Education") &&
          optionalEq(p, "page_http_status_code", 200) &&
          optionalEq(p, "page_language", "en") &&
          optionalEq(p, "source_org", "Common Sense Education") &&
          optionalEq(p, "source_system_route_name", "cse_user.register") &&
          optionalEq(p, "is_admin_theme_page", false) &&
          (p.form_id === undefined || ["user_register_form", "cse_user_magic_reg_form"].includes(p.form_id))
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
          title: p.page_title !== undefined ? "Log in | Common Sense Education" : undefined,
          status: p.page_http_status_code !== undefined ? 200 : undefined,
          amplPageView: p.ampl_page_view !== undefined ? true : undefined,
          language: p.page_language !== undefined ? "en" : undefined,
        });

        const specificOk =
          (p.form_id === undefined || ["user_login_form", "cse_user_magic_reg_form"].includes(p.form_id)) &&
          optionalEq(p, "source_system_route_name", "user.login");

        return coreOk && specificOk;
      },
    },
    {
      name: "Viewed Experiment Variant (Magic Link Registration)",
      path: "/user/login",
      eventType: "Viewed Experiment Variant",
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.experiment_name === "magic_reg_vs_classic" &&
          p.variant === "magic_link"
        );
      },
    },
  ];

  const clickCases = [
    {
      name: "Clicked Link (EDU Homepage Hero CTA)",
      path: "/education",
      eventType: "Clicked Link",
      run: () => {
        const selector = ".home-marketing-block a.btn";

        cy.get(selector).first().then(($a) => {
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

        cy.get(selector).first().click({ force: true });
      },
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.page_url_path === "/education" &&
          (p.interaction_type === undefined || String(p.interaction_type).toLowerCase() === "click")
        );
      },
    },
    {
      name: "Played Video (UK DIY page - Hero Video)",
      path: "/education/uk/digital-citizenship",
      eventType: "Played Video",
      timeoutMs: 60000,
      visitOptions: {
        onBeforeLoad: (win) => {
          win.addEventListener("error", (e) => {
            if (e.message && e.message.includes("Cannot read properties of undefined (reading 'get')")) {
              e.stopImmediatePropagation();
            }
          }, true);
        },
      },
      run: () => {
        cy.get("span[id^='video-modal-']").first().should("exist").click({ force: true });
        cy.window({ log: false }).then((win) => { if (win.amplitude?.flush) return win.amplitude.flush(); });
      },
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.page_url_path === "/education/uk/digital-citizenship" &&
          p.page_http_status_code === 200 &&
          p.source_org === "Common Sense Education" &&
          p.cse_content_type === "component_page" &&
          p.cse_entity_id === 5126575 &&
          (p.video_provider ? p.video_provider === "html5" : true) &&
          (p.player_state ? ["playing", "play"].includes(String(p.player_state).toLowerCase()) : true) &&
          (p.play_initiator ? p.play_initiator === "click" : true)
        );
      },
    },
    {
      name: "Clicked Element (Collection - Featured Video teaser title button)",
      path: "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12",
      eventType: "Clicked Element",
      visitOptions: {
        onBeforeLoad: (win) => {
          win.addEventListener("error", (e) => {
            if (e.message && e.message.includes("Cannot read properties of undefined (reading 'get')")) {
              e.stopImmediatePropagation();
            }
          }, true);
        },
      },
      run: () => {
        dismissCtaModal();
        cy.get('button[id^="video-modal-"].preview-teaser-link').first().should("be.visible").click({ force: true });
        cy.window({ log: false }).then((win) => { if (win.amplitude?.flush) return win.amplitude.flush(); });
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
        cy.window({ log: false }).then((win) => { if (win.amplitude?.flush) return win.amplitude.flush(); });
      },
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.page_url_path === "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12" &&
          String(p.interaction_type || "").toLowerCase() === "click" &&
          optionalEq(p, "element_tag", "button") &&
          optionalEq(p, "element_type", "button") &&
          optionalEq(p, "page_http_status_code", 200) &&
          optionalEq(p, "source_org", "Common Sense Education") &&
          optionalEq(p, "cse_content_type", "collection") &&
          optionalEq(p, "cse_entity_id", 5112984)
        );
      },
    },
    {
      name: "Opened Lesson Slide Modal (What Is Media?)",
      path: "/education/digital-literacy/what-is-media",
      eventType: "Opened Lesson Slide Modal",
      timeoutMs: 30000,
      run: () => {
        cy.get('[data-ampl-media-asset-type="Slideshow"]').first().should("exist").click({ force: true });
        cy.window({ log: false }).then((win) => { if (win.amplitude?.flush) return win.amplitude.flush(); });
      },
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.page_url_path === "/education/digital-literacy/what-is-media" &&
          p.media_type === "Slideshow" &&
          optionalEq(p, "media_id", "2039540")
        );
      },
    },
    {
      name: "Opened Student Handout Modal (What Is Media?)",
      path: "/education/digital-literacy/what-is-media",
      eventType: "Opened Student Handout Modal",
      timeoutMs: 30000,
      run: () => {
        cy.get('[data-ampl-media-asset-type="Remote Document"]').first().should("exist").click({ force: true });
        cy.window({ log: false }).then((win) => { if (win.amplitude?.flush) return win.amplitude.flush(); });
      },
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.page_url_path === "/education/digital-literacy/what-is-media" &&
          p.media_type === "Remote Document" &&
          optionalEq(p, "media_id", "2039539")
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
        cy.wait(3000);

        cy.get("video.vjs-tech", { timeout: 20000 }).should(($v) => {
          const v = $v[0];
          expect(v.paused, "video paused").to.eq(false);
          expect(v.currentTime, "video currentTime").to.be.greaterThan(0);
        });
        cy.window({ log: false }).then((win) => { if (win.amplitude?.flush) return win.amplitude.flush(); });
      },
      assert: (evt) => {
        const p = evt.event_properties || {};

        const requiredOk =
          p.page_url_path === "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12" &&
          matchesFullUrl(p.page_url_full, "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12") &&
          p.page_http_status_code === 200 &&
          p.source_org === "Common Sense Education" &&
          p.cse_content_type === "collection" &&
          p.cse_entity_id === 5112984;

        const optionalOk =
          (p.player_state ? ["playing", "play"].includes(String(p.player_state).toLowerCase()) : true) &&
          (p.play_reason ? ["start", "resume"].includes(String(p.play_reason).toLowerCase()) : true) &&
          (p.play_initiator ? ["click", "auto"].includes(String(p.play_initiator).toLowerCase()) : true) &&
          (p.video_provider ? p.video_provider === "html5" : true) &&
          (p.video_title ? typeof p.video_title === "string" && p.video_title.length > 0 : true) &&
          (p.video_url ? typeof p.video_url === "string" && p.video_url.length > 0 : true) &&
          (typeof p.percent_complete === "number" ? p.percent_complete >= 0 && p.percent_complete <= 1 : true) &&
          (typeof p.current_time_seconds === "number" ? p.current_time_seconds >= 0 : true) &&
          (typeof p.duration_seconds === "number" ? p.duration_seconds > 0 : true);

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
        cy.window({ log: false }).then((win) => { if (win.amplitude?.flush) return win.amplitude.flush(); });
      },
      assert: (evt) => {
        const p = evt.event_properties || {};
        return (
          p.page_url_path === "/education/collections/quick-digital-citizenship-lessons-for-grades-k-12" &&
          p.page_http_status_code === 200 &&
          p.source_org === "Common Sense Education" &&
          p.cse_content_type === "collection" &&
          p.cse_entity_id === 5112984 &&
          (p.video_provider ? p.video_provider === "html5" : true) &&
          (p.player_state ? String(p.player_state).toLowerCase() === "paused" : true) &&
          (p.video_title ? typeof p.video_title === "string" && p.video_title.length > 0 : true) &&
          (typeof p.current_time_seconds === "number" ? p.current_time_seconds >= 0 : true)
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
