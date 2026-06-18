// cypress.config.js
const fs = require("fs");
const path = require("path");

const REPORTS_DIR = path.join(__dirname, "reports");

function ensureReportsDir() {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
}

function buildSummary(results, timestamp, baseUrl) {
  const tests = [];

  if (results.runs) {
    results.runs.forEach((run) => {
      if (run.tests) {
        run.tests.forEach((test) => {
          tests.push({
            title: test.title.join(" > "),
            state: test.state,
            duration: test.duration || 0,
            error: test.displayError || null,
          });
        });
      }
    });
  }

  return {
    timestamp,
    baseUrl,
    totalTests: results.totalTests || 0,
    totalPassed: results.totalPassed || 0,
    totalFailed: results.totalFailed || 0,
    totalPending: results.totalPending || 0,
    totalSkipped: results.totalSkipped || 0,
    durationMs: results.totalDuration || 0,
    tests,
  };
}

// Extracts { section, eventType, path, name } from a full Cypress test title.
function parseTitle(title) {
  const sectionMatch = title.match(/^Amplitude Tier-1 Analytics > (.+?) > fires/);
  const eventMatch = title.match(/fires "([^"]+)"/);
  const pathMatch = title.match(/fires "[^"]+" on (\S+)/);
  const nameMatch = title.match(/\((.+)\)$/);
  return {
    section: sectionMatch ? sectionMatch[1] : "Other",
    eventType: eventMatch ? eventMatch[1] : "",
    path: pathMatch ? pathMatch[1] : "",
    name: nameMatch ? nameMatch[1] : title,
  };
}

function fmtDur(ms) {
  return ms ? `${(ms / 1000).toFixed(2)}s` : "—";
}

function buildMarkdown(summary) {
  const totalDur = (summary.durationMs / 1000).toFixed(1);
  const pass = summary.totalPassed;
  const fail = summary.totalFailed;
  const skip = summary.totalSkipped;
  const total = summary.totalTests;
  const isPassing = fail === 0;

  const statusIcon = isPassing ? "🟢" : "🔴";
  const statusLabel = isPassing ? "PASS" : "FAIL";

  const date = new Date(summary.timestamp).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", timeZoneName: "short",
  });

  const L = [];

  // ── Header ───────────────────────────────────────────────────────────────
  L.push(`# ${statusIcon} Amplitude Test Run — ${statusLabel}`);
  L.push(``);
  L.push(`| | |`);
  L.push(`|---|---|`);
  L.push(`| 🕐 Run at | ${date} |`);
  L.push(`| 🌐 Base URL | \`${summary.baseUrl}\` |`);
  L.push(`| ✅ Passed | **${pass} / ${total}** |`);
  L.push(`| ❌ Failed | **${fail}** |`);
  L.push(`| ⏭️ Skipped | ${skip} |`);
  L.push(`| ⏱️ Duration | ${totalDur}s |`);
  L.push(``);

  // ── Results grouped by section ────────────────────────────────────────────
  const sections = {};
  summary.tests.forEach((t) => {
    const p = parseTitle(t.title);
    if (!sections[p.section]) sections[p.section] = [];
    sections[p.section].push({ ...t, parsed: p });
  });

  L.push(`## 🧪 Test Results`);
  L.push(``);

  let globalIdx = 1;
  Object.entries(sections).forEach(([section, tests]) => {
    const sectionFail = tests.filter((t) => t.state === "failed").length;
    const sectionIcon = sectionFail === 0 ? "✅" : "❌";

    L.push(`### ${sectionIcon} ${section}`);
    L.push(``);
    L.push(`| # | Test | Path | Duration | Status |`);
    L.push(`|---|------|------|----------|--------|`);

    tests.forEach((t) => {
      const icon = t.state === "passed" ? "🟢" : t.state === "failed" ? "🔴" : "⏭️";
      L.push(
        `| ${globalIdx++} | ${t.parsed.name} | \`${t.parsed.path}\` | ${fmtDur(t.duration)} | ${icon} |`
      );
    });

    L.push(``);
  });

  // ── Failure details ───────────────────────────────────────────────────────
  const failed = summary.tests.filter((t) => t.state === "failed");
  if (failed.length > 0) {
    L.push(`---`);
    L.push(``);
    L.push(`## ❌ Failure Details`);

    failed.forEach((t, i) => {
      const p = parseTitle(t.title);
      const errorLine = t.error
        ? t.error.split("\n")[0].replace(/^Error:\s*/, "").trim()
        : "(no error message)";

      L.push(``);
      L.push(`### ${i + 1}. ${p.name}`);
      L.push(``);
      L.push(`**Event:** \`${p.eventType}\` &nbsp; **Path:** \`${p.path}\``);
      L.push(``);
      L.push(`> ⚠️ ${errorLine}`);
    });

    L.push(``);
  }

  return L.join("\n") + "\n";
}

function printReport(summary) {
  const dur = (summary.durationMs / 1000).toFixed(1);
  const pass = summary.totalPassed;
  const fail = summary.totalFailed;
  const total = summary.totalTests;
  const status = fail === 0 ? "PASS" : "FAIL";

  console.log("\n========================================");
  console.log(`  Run completed : ${summary.timestamp}`);
  console.log(`  Base URL      : ${summary.baseUrl}`);
  console.log(`  Status        : ${status}  (${pass}/${total} passed, ${fail} failed)`);
  console.log(`  Duration      : ${dur}s`);
  console.log("========================================\n");
}

module.exports = {
  e2e: {
    baseUrl: "https://qa.commonsense.org",
    setupNodeEvents(on, config) {
      on("task", {
        log(message) {
          console.log(message);
          return null;
        },
        logJson(obj) {
          console.log(JSON.stringify(obj, null, 2));
          return null;
        },
      });

      on("after:run", (results) => {
        ensureReportsDir();

        // PT-formatted timestamp — matches Automation naming: run_YYYY-MM-DDTHH-MM-SS
        const timestamp = new Date()
          .toLocaleString("sv-SE", { timeZone: "America/Los_Angeles" })
          .replace(" ", "T")
          .replace(/:/g, "-");

        const summary = buildSummary(results, new Date().toISOString(), config.baseUrl);

        fs.writeFileSync(path.join(REPORTS_DIR, `run_${timestamp}.md`), buildMarkdown(summary));

        // Meta.json sidecar — consumed by the launcher's push-results sync
        const failures = [];
        if (results.runs) {
          results.runs.forEach((run) => {
            const specName = path.basename((run.spec || {}).relative || (run.spec || {}).name || "amplitude_tier1.cy.js");
            (run.tests || []).forEach((test) => {
              if (test.state === "failed") {
                failures.push({
                  spec: specName,
                  title: (test.title || []).join(" > "),
                  project: "chrome",
                  error: (test.displayError || "").split("\n")[0],
                  retries: 0,
                });
              }
            });
          });
        }
        const total    = results.totalTests    || 0;
        const passed   = results.totalPassed   || 0;
        const failed   = results.totalFailed   || 0;
        const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
        fs.writeFileSync(
          path.join(REPORTS_DIR, `run_${timestamp}.meta.json`),
          JSON.stringify({
            timestamp,
            environment: process.env.CYPRESS_ENV_NAME || "QA",
            baseUrl: config.baseUrl,
            stats: {
              passed, failed, flaky: 0,
              skipped: results.totalPending || 0,
              total, passRate,
              elapsedMs: results.totalDuration || 0,
            },
            failures,
            flakyTests: [],
            highRetryTests: [],
          }, null, 2)
        );

        printReport(summary);
      });

      return config;
    },
  },
};
