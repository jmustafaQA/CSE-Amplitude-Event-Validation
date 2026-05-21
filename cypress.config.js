// cypress.config.js
const fs = require("fs");
const path = require("path");

const REPORTS_DIR = path.join(__dirname, "reports");
const BASELINE_FILE = path.join(REPORTS_DIR, "baseline.json");

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

function buildMarkdown(summary, baseline) {
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

  // ── Baseline comparison ───────────────────────────────────────────────────
  if (baseline) {
    const pDiff = pass - baseline.totalPassed;
    const fDiff = fail - baseline.totalFailed;
    const sign = (n) => (n > 0 ? `+${n}` : `${n}`);
    const pArrow = pDiff > 0 ? "⬆️" : pDiff < 0 ? "⬇️" : "➡️";
    const fArrow = fDiff > 0 ? "⬆️" : fDiff < 0 ? "⬇️" : "➡️";
    const baseDate = new Date(baseline.timestamp).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });

    const baselineMap = {};
    baseline.tests.forEach((t) => { baselineMap[t.title] = t.state; });

    const regressions = summary.tests.filter(
      (t) => baselineMap[t.title] === "passed" && t.state === "failed"
    );
    const fixes = summary.tests.filter(
      (t) => baselineMap[t.title] === "failed" && t.state === "passed"
    );

    L.push(`## 📊 Baseline Comparison`);
    L.push(``);
    L.push(`> Baseline from **${baseDate}**`);
    L.push(``);
    L.push(`| Metric | Baseline | Now | Change |`);
    L.push(`|--------|----------|-----|--------|`);
    L.push(`| Passed | ${baseline.totalPassed} | ${pass} | ${pArrow} ${sign(pDiff)} |`);
    L.push(`| Failed | ${baseline.totalFailed} | ${fail} | ${fArrow} ${sign(fDiff)} |`);
    L.push(``);

    if (regressions.length > 0) {
      L.push(`### 🔴 Regressions (${regressions.length})`);
      regressions.forEach((t) => L.push(`- ${parseTitle(t.title).name}`));
      L.push(``);
    }
    if (fixes.length > 0) {
      L.push(`### 🟢 Fixed since baseline (${fixes.length})`);
      fixes.forEach((t) => L.push(`- ${parseTitle(t.title).name}`));
      L.push(``);
    }
    if (regressions.length === 0 && fixes.length === 0) {
      L.push(`> ✅ No change vs baseline.`);
      L.push(``);
    }
  }

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

function printReport(summary, baseline) {
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

  if (baseline) {
    const pDiff = pass - baseline.totalPassed;
    const fDiff = fail - baseline.totalFailed;
    const baselineDate = new Date(baseline.timestamp).toLocaleString();

    console.log(`\n  Baseline from : ${baselineDate}`);
    console.log(`  Passed        : ${pass}  (${pDiff >= 0 ? "+" : ""}${pDiff} vs baseline)`);
    console.log(`  Failed        : ${fail}  (${fDiff >= 0 ? "+" : ""}${fDiff} vs baseline)`);

    const baselineMap = {};
    baseline.tests.forEach((t) => { baselineMap[t.title] = t.state; });

    const regressions = summary.tests.filter(
      (t) => baselineMap[t.title] === "passed" && t.state === "failed"
    );
    const fixes = summary.tests.filter(
      (t) => baselineMap[t.title] === "failed" && t.state === "passed"
    );

    if (regressions.length > 0) {
      console.log(`\n  Regressions (${regressions.length}):`);
      regressions.forEach((t) => console.log(`    ✗ ${parseTitle(t.title).name}`));
    }
    if (fixes.length > 0) {
      console.log(`\n  Fixed since baseline (${fixes.length}):`);
      fixes.forEach((t) => console.log(`    ✓ ${parseTitle(t.title).name}`));
    }
    if (regressions.length === 0 && fixes.length === 0) {
      console.log("\n  No change vs baseline.");
    }
  } else {
    console.log("\n  No baseline saved yet. Run: npm run test:save-baseline");
  }

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

        const timestamp = new Date().toISOString();
        const summary = buildSummary(results, timestamp, config.baseUrl);

        // Load baseline before generating the report so it appears in the file
        let baseline = null;
        if (fs.existsSync(BASELINE_FILE)) {
          try {
            baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, "utf8"));
          } catch {
            baseline = null;
          }
        }

        // Save as new baseline if flag is set
        if (config.env && config.env.saveBaseline) {
          fs.writeFileSync(BASELINE_FILE, JSON.stringify(summary, null, 2));
          console.log("\n  Baseline updated.");
          baseline = null;
        }

        // Save timestamped markdown report
        const safeTs = timestamp.replace(/:/g, "-");
        const reportFile = path.join(REPORTS_DIR, `run-${safeTs}.md`);
        fs.writeFileSync(reportFile, buildMarkdown(summary, baseline));

        printReport(summary, baseline);
      });

      return config;
    },
  },
};
