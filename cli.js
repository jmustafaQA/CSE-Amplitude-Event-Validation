// cli.js
const readline = require("readline");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const REPORTS_DIR = path.join(__dirname, "reports");

function clear() {
  process.stdout.write("\x1Bc");
}

function header() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║       CSE Amplitude Analytics Test Suite         ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log();
}

function menu() {
  clear();
  header();
  console.log("  1.  Run tests");
  console.log("  2.  Run tests + save as new baseline");
  console.log("  3.  View latest report");
  console.log("  4.  List all reports");
  console.log("  5.  Exit");
  console.log();
}

function getReports() {
  if (!fs.existsSync(REPORTS_DIR)) return [];
  return fs
    .readdirSync(REPORTS_DIR)
    .filter((f) => f.startsWith("run-") && f.endsWith(".md"))
    .sort()
    .reverse();
}

function runCypress(extraArgs) {
  return new Promise((resolve) => {
    console.log("\nStarting Cypress...\n");
    const proc = spawn("npx", ["cypress", "run", ...extraArgs], {
      stdio: "inherit",
      shell: true,
    });
    proc.on("close", resolve);
  });
}

function viewLatestReport(rl) {
  const reports = getReports();
  if (reports.length === 0) {
    console.log("\n  No reports found. Run the tests first.\n");
    return;
  }
  const content = fs.readFileSync(path.join(REPORTS_DIR, reports[0]), "utf8");
  console.log("\n" + "─".repeat(60));
  console.log(`  ${reports[0]}\n`);
  console.log(content);
  console.log("─".repeat(60));
}

function listReports() {
  const reports = getReports();
  if (reports.length === 0) {
    console.log("\n  No reports found.\n");
    return;
  }
  console.log("\n  Saved reports:\n");
  reports.forEach((r, i) => console.log(`    ${i + 1}.  ${r}`));

  const baseline = path.join(REPORTS_DIR, "baseline.json");
  if (fs.existsSync(baseline)) {
    try {
      const b = JSON.parse(fs.readFileSync(baseline, "utf8"));
      console.log(`\n  Baseline: ${b.timestamp}  (${b.totalPassed}/${b.totalTests} passed)`);
    } catch {}
  }
  console.log();
}

async function prompt(rl) {
  menu();
  rl.question("  Enter choice: ", async (choice) => {
    const pause = () =>
      new Promise((res) => {
        console.log("\n  Press Enter to return to menu...");
        rl.question("", res);
      });

    switch (choice.trim()) {
      case "1":
        clear();
        await runCypress([]);
        await pause();
        break;

      case "2":
        clear();
        await runCypress(["--env", "saveBaseline=true"]);
        await pause();
        break;

      case "3":
        clear();
        header();
        viewLatestReport(rl);
        await pause();
        break;

      case "4":
        clear();
        header();
        listReports();
        await pause();
        break;

      case "5":
        console.log("\n  Goodbye!\n");
        rl.close();
        process.exit(0);
        return;

      default:
        break;
    }

    prompt(rl);
  });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

prompt(rl);
