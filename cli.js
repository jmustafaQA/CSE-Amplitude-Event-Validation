#!/usr/bin/env node
'use strict';

const readline     = require('readline');
const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

const ROOT        = __dirname;
const REPORTS_DIR = path.join(ROOT, 'reports');

// ── ANSI helpers ──────────────────────────────────────────────
const R   = '\x1b[0m';
const B   = '\x1b[1m';
const DM  = '\x1b[2m';
const GR  = '\x1b[32m';
const YL  = '\x1b[33m';
const CY  = '\x1b[36m';
const SCN = '\x1b[1;96m';       // bold bright cyan   — progress / bars
const EVT = '\x1b[1;93m';       // bold bright yellow — event labels
const SYN = '\x1b[1;92m';       // bold lime green    — validated ✓
const HDR = '\x1b[1;38;5;27m'; // bold blue          — header

const USE_COLOR = !!process.stdout.isTTY;
const clear = () => process.stdout.write('\x1bc');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ── Event types to show in the animation ─────────────────────
const CAPTURED_EVENTS = [
  'Viewed Search',
  'Viewed Lesson Info',
  'Clicked Link',
  'Clicked Element',
  'Played Video',
  'Paused Video',
  'Viewed Course',
];

// ── Startup animation ─────────────────────────────────────────
async function animateStartup() {
  if (!USE_COLOR) return;
  try {
    await _captureAnimation();
  } catch (_) { /* best-effort */ }
  finally { process.stdout.write('\x1b[?25h'); }
}

async function _captureAnimation() {
  const W  = Math.max(process.stdout.columns || 80, 50);
  const H  = Math.max(process.stdout.rows    || 24, 16);
  const w  = (s) => process.stdout.write(s);
  const at = (r, c) => `\x1b[${r};${c}H`;

  const BAR_W   = Math.min(38, W - 22);
  const INDENT  = '  ';
  const NOISE   = '01><-=/+.,:;|~!?';

  w('\x1b[?25l');
  clear();

  // ── Phase 1: brief network noise (simulating intercepted traffic) ──
  const noiseRow = Math.floor(H / 2);
  for (let f = 0; f < 7; f++) {
    let line = '';
    for (let i = 0; i < W - 4; i++) {
      line += Math.random() > 0.6
        ? NOISE[Math.floor(Math.random() * NOISE.length)]
        : ' ';
    }
    w(at(noiseRow - 1, 1) + DM + CY + INDENT + line.slice(0, W - 4) + R);
    w(at(noiseRow,     1) + DM + CY + INDENT + line.split('').reverse().join('').slice(0, W - 4) + R);
    w(at(noiseRow + 1, 1) + DM + CY + INDENT + line.slice(Math.floor(W / 4), W) + R);
    await sleep(55);
  }

  // ── Phase 2: noise resolves — header appears ──────────────
  clear();
  await sleep(80);

  const headerRow  = 2;
  const subRow     = headerRow + 1;
  const barRow     = subRow + 2;
  const evtStart   = barRow + 2;

  w(at(headerRow, 1) + INDENT + HDR + B + '◈  CSE Amplitude Analytics Suite' + R);
  w(at(subRow,    1) + INDENT + DM  + '   Intercepting event stream from qa.commonsense.org...' + R);
  await sleep(350);

  // draw empty bar
  w(at(barRow, 1) + INDENT + '   [' + DM + '░'.repeat(BAR_W) + R + ']   0%');
  await sleep(250);

  // ── Phase 3: events validate one by one ───────────────────
  const total = CAPTURED_EVENTS.length;

  for (let i = 0; i < total; i++) {
    const pct    = Math.round(((i + 1) / total) * 100);
    const filled = Math.round(((i + 1) / total) * BAR_W);
    const bar    = SCN + '█'.repeat(filled) + DM + '░'.repeat(BAR_W - filled) + R;
    const pctStr = (pct + '%').padStart(4);

    // update bar
    w(at(barRow, 1) + INDENT + '   [' + bar + '] ' + SCN + pctStr + R + '  ');

    // event label appears (yellow → green + checkmark)
    const evtRow  = evtStart + i;
    const label   = ('◉  ' + CAPTURED_EVENTS[i]).padEnd(28);
    w(at(evtRow, 1) + INDENT + '   ' + EVT + label + R);
    await sleep(120);
    w(at(evtRow, 1) + INDENT + '   ' + SYN + label + '✓  captured' + R);
    await sleep(130);
  }

  // ── Phase 4: complete ─────────────────────────────────────
  await sleep(200);

  // full bar
  w(at(barRow, 1) + INDENT + '   [' + SCN + '█'.repeat(BAR_W) + R + '] ' + SYN + '100%' + R + '  ');

  const doneRow = evtStart + total + 1;
  w(at(doneRow, 1) + INDENT + '   ' + SYN + B + '◈  ' + total + ' event types validated — launching suite' + R);
  await sleep(900);

  w('\x1b[?25h');
}

// ── Header ────────────────────────────────────────────────────
function header() {
  console.log(`\n${HDR}  ╔══════════════════════════════════════════════╗`);
  console.log(`  ║      CSE Amplitude Analytics Suite  🔬        ║`);
  console.log(`  ╚══════════════════════════════════════════════╝${R}\n`);
}

// ── Menu ──────────────────────────────────────────────────────
function menu() {
  clear();
  header();
  console.log(`  ${B}What would you like to do?${R}\n`);
  console.log(`  ${GR}1${R}  Run all tests              ${DM}(headless · generates report)${R}`);
  console.log(`  ${GR}2${R}  Run tests + save baseline   ${DM}(headless · updates comparison)${R}`);
  console.log(`  ${GR}3${R}  Open Cypress UI             ${DM}(interactive · pick tests)${R}`);
  console.log(`  ${GR}4${R}  View latest report`);
  console.log(`  ${GR}5${R}  List all reports`);
  console.log(`  ${GR}6${R}  Exit\n`);
}

// ── Helpers ───────────────────────────────────────────────────
function ask(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, ans => { rl.close(); resolve(ans.trim()); });
  });
}

function pause() {
  return ask(`\n  ${DM}Press Enter to return to the menu...${R}`);
}

function run(cmd) {
  try { execSync(cmd, { cwd: ROOT, stdio: 'inherit', shell: true }); }
  catch (_) { /* output already printed */ }
}

function getReports() {
  if (!fs.existsSync(REPORTS_DIR)) return [];
  return fs.readdirSync(REPORTS_DIR)
    .filter(f => f.startsWith('run-') && f.endsWith('.md'))
    .sort().reverse();
}

// ── Option 4: view latest report ──────────────────────────────
async function viewLatestReport() {
  clear(); header();
  const reports = getReports();
  if (reports.length === 0) {
    console.log(`  ${YL}No reports found.${R} Run the test suite first.\n`);
    await pause(); return;
  }
  console.log(`  ${DM}${reports[0]}${R}\n${'─'.repeat(60)}\n`);
  console.log(fs.readFileSync(path.join(REPORTS_DIR, reports[0]), 'utf8'));
  console.log('─'.repeat(60));
  await pause();
}

// ── Option 5: list all reports ────────────────────────────────
async function listReports() {
  clear(); header();
  const reports = getReports();
  if (reports.length === 0) {
    console.log(`  ${YL}No reports found.${R}\n`);
  } else {
    console.log(`  ${B}Saved reports:\n${R}`);
    reports.forEach((r, i) => console.log(`  ${GR}${i + 1}${R}  ${r}`));
  }
  const baselineFile = path.join(REPORTS_DIR, 'baseline.json');
  if (fs.existsSync(baselineFile)) {
    try {
      const b = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
      const d = new Date(b.timestamp).toLocaleString();
      console.log(`\n  ${DM}Baseline:${R} ${d}  ${GR}(${b.totalPassed}/${b.totalTests} passed)${R}`);
    } catch {}
  }
  console.log();
  await pause();
}

// ── Main loop ─────────────────────────────────────────────────
async function main() {
  await animateStartup();

  while (true) {
    menu();
    const choice = await ask('  Select an option: ');

    switch (choice) {
      case '1':
        clear(); header();
        console.log(`\n  ${CY}Running all tests...${R}\n`);
        run('npx cypress run');
        await pause(); break;

      case '2':
        clear(); header();
        console.log(`\n  ${CY}Running tests and saving baseline...${R}\n`);
        run('npx cypress run --env saveBaseline=true');
        await pause(); break;

      case '3':
        clear(); header();
        console.log(`\n  ${CY}Opening Cypress UI...${R}\n`);
        run('npx cypress open'); break;

      case '4':
        await viewLatestReport(); break;

      case '5':
        await listReports(); break;

      case '6': case 'q': case 'Q':
        console.log(`\n  ${SYN}All events synced. Goodbye!${R}\n`);
        process.exit(0);
    }
  }
}

main();
