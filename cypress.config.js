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

function buildMarkdown(summary) {
  const dur = (summary.durationMs / 1000).toFixed(1);
  const status = summary.totalFailed === 0 ? "PASS" : "FAIL";
  const lines = [];

  lines.push(`# Amplitude Test Run`);
  lines.push(``);
  lines.push(`| Field | Value |`);
  lines.push(`|-------|-------|`);
  lines.push(`| Timestamp | ${summary.timestamp} |`);
  lines.push(`| Base URL | ${summary.baseUrl} |`);
  lines.push(`| Status | **${status}** |`);
  lines.push(`| Passed | ${summary.totalPassed} / ${summary.totalTests} |`);
  lines.push(`| Failed | ${summary.totalFailed} |`);
  lines.push(`| Skipped | ${summary.totalSkipped} |`);
  lines.push(`| Duration | ${dur}s |`);
  lines.push(``);
  lines.push(`## Test Results`);
  lines.push(``);
  lines.push(`| # | Test | State | Duration |`);
  lines.push(`|---|------|-------|----------|`);

  summary.tests.forEach((t, i) => {
    const icon = t.state === "passed" ? "✓" : t.state === "failed" ? "✗" : "–";
    const dur = t.duration ? `${(t.duration / 1000).toFixed(2)}s` : "-";
    lines.push(`| ${i + 1} | ${t.title} | ${icon} ${t.state} | ${dur} |`);
  });

  const failed = summary.tests.filter((t) => t.state === "failed");
  if (failed.length > 0) {
    lines.push(``);
    lines.push(`## Failures`);
    failed.forEach((t) => {
      lines.push(``);
      lines.push(`### ${t.title}`);
      lines.push(``);
      lines.push("```");
      lines.push(t.error || "(no error message)");
      lines.push("```");
    });
  }

  return lines.join("\n") + "\n";
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
    console.log(
      `  Passed        : ${pass}  (${pDiff >= 0 ? "+" : ""}${pDiff} vs baseline)`
    );
    console.log(
      `  Failed        : ${fail}  (${fDiff >= 0 ? "+" : ""}${fDiff} vs baseline)`
    );

    const baselineMap = {};
    baseline.tests.forEach((t) => {
      baselineMap[t.title] = t.state;
    });

    const regressions = [];
    const fixes = [];

    summary.tests.forEach((t) => {
      const base = baselineMap[t.title];
      if (base === "passed" && t.state === "failed") regressions.push(t.title);
      else if (base === "failed" && t.state === "passed") fixes.push(t.title);
    });

    if (regressions.length > 0) {
      console.log(`\n  Regressions (${regressions.length}):`);
      regressions.forEach((t) => console.log(`    ✗ ${t}`));
    }
    if (fixes.length > 0) {
      console.log(`\n  Fixed since baseline (${fixes.length}):`);
      fixes.forEach((t) => console.log(`    ✓ ${t}`));
    }
    if (regressions.length === 0 && fixes.length === 0) {
      console.log("\n  No change vs baseline.");
    }
  } else {
    console.log(
      "\n  No baseline saved yet. Run: npm run test:save-baseline"
    );
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

        // Save timestamped markdown report
        const safeTs = timestamp.replace(/:/g, "-");
        const reportFile = path.join(REPORTS_DIR, `run-${safeTs}.md`);
        fs.writeFileSync(reportFile, buildMarkdown(summary));

        // Load baseline for comparison
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
          baseline = null; // skip comparison when just saved
        }

        printReport(summary, baseline);
      });

      return config;
    },
  },
};
