#!/usr/bin/env node
'use strict';

require('dotenv').config();
const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const { captureSnapshot } = require('./src/domSnapshot');
const { analysePage, synthesiseTestMap } = require('./src/claudeAnalysis');
const { ExplorationNavigator } = require('./src/navigator');
const { loginToLS1 } = require('./src/login');
const { writeReport } = require('./src/reporter');

// ─── Config ────────────────────────────────────────────────────────────────
const CONFIG = {
  baseUrl: process.env.LS1_BASE_URL || 'http://localhost:3000',
  username: process.env.LS1_USERNAME,
  password: process.env.LS1_PASSWORD,
  role: process.env.EXPLORE_AS_ROLE || 'distributor_manager',
  maxPages: parseInt(process.env.MAX_PAGES || '20', 10),
  maxDepth: parseInt(process.env.MAX_DEPTH || '4', 10),
  screenshotOnEach: process.env.SCREENSHOT_ON_EACH !== 'false',
  headless: process.env.HEADLESS !== 'false',
  outputDir: path.join(__dirname, 'output'),
};

// ─── Logging ───────────────────────────────────────────────────────────────
const log = {
  info: (msg) => console.log(`\n[EXPLORER] ${msg}`),
  step: (msg) => console.log(`  → ${msg}`),
  success: (msg) => console.log(`  ✓ ${msg}`),
  warn: (msg) => console.warn(`  ⚠ ${msg}`),
  error: (msg) => console.error(`  ✗ ${msg}`),
};

// ─── Main ──────────────────────────────────────────────────────────────────
async function run() {
  if (!process.env.ANTHROPIC_API_KEY) {
    log.error('ANTHROPIC_API_KEY not set. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }
  if (!CONFIG.username || !CONFIG.password) {
    log.error('LS1_USERNAME and LS1_PASSWORD must be set in .env');
    process.exit(1);
  }

  const startedAt = new Date().toISOString();
  log.info(`Starting LS1 exploration as role: ${CONFIG.role}`);
  log.info(`Target: ${CONFIG.baseUrl} | Max pages: ${CONFIG.maxPages}`);

  // ── Launch browser ──────────────────────────────────────────────────────
  const browser = await chromium.launch({ headless: CONFIG.headless });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (LS1-Explorer-Agent/1.0)',
  });
  const page = await context.newPage();

  const allPageAnalyses = [];
  const visitHistory = [];
  let pagesVisited = 0;
  let tcCounter = 1;

  try {
    // ── Step 1: Login ─────────────────────────────────────────────────────
    log.info('Step 1/4 — Logging in...');
    const landingUrl = await loginToLS1(page, CONFIG);

    const navigator = new ExplorationNavigator(page, CONFIG.baseUrl);
    navigator.markVisited(landingUrl);

    // ── Step 2: Analyse landing page ─────────────────────────────────────
    log.info('Step 2/4 — Analysing landing page...');
    await explorePage(page, navigator, allPageAnalyses, visitHistory, tcCounter, pagesVisited);
    pagesVisited++;
    tcCounter += (allPageAnalyses[0]?.analysis?.testScenarios?.length || 0);

    // Seed nav queue from top-level navigation links
    const navLinks = await navigator.discoverNavLinks();
    log.step(`Found ${navLinks.length} top-level nav links`);
    navigator.enqueue(navLinks, landingUrl);

    // ── Step 3: Explore ───────────────────────────────────────────────────
    log.info(`Step 3/4 — Exploring up to ${CONFIG.maxPages} pages...`);

    while (pagesVisited < CONFIG.maxPages && navigator.hasNext()) {
      const nav = await navigator.navigateNext();
      if (!nav) break;

      log.info(`[${pagesVisited + 1}/${CONFIG.maxPages}] ${nav.label} → ${nav.url}`);

      navigator.markVisited(nav.url);
      visitHistory.push({ url: nav.url, label: nav.label });

      await explorePage(page, navigator, allPageAnalyses, visitHistory, tcCounter, pagesVisited);
      pagesVisited++;
      tcCounter += (allPageAnalyses[allPageAnalyses.length - 1]?.analysis?.testScenarios?.length || 0);

      // Take screenshot if enabled
      if (CONFIG.screenshotOnEach) {
        const screenshotName = `page-${String(pagesVisited).padStart(3, '0')}.png`;
        const screenshotPath = path.join(CONFIG.outputDir, 'screenshots', screenshotName);
        fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
        await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
        allPageAnalyses[allPageAnalyses.length - 1].screenshotPath = `screenshots/${screenshotName}`;
        log.step(`Screenshot saved: ${screenshotName}`);
      }

      // Small pause to be respectful to the server
      await page.waitForTimeout(500);
    }

    // ── Step 4: Synthesise test map ───────────────────────────────────────
    log.info('Step 4/4 — Synthesising test map with Claude...');
    const testMap = await synthesiseTestMap(allPageAnalyses, CONFIG.role);
    log.success(`Test map synthesised: ${testMap.criticalFlows?.length || 0} critical flows identified`);

    // ── Write reports ─────────────────────────────────────────────────────
    const finishedAt = new Date().toISOString();
    const { testMapPath, reportPath, totalScenarios } = writeReport(CONFIG.outputDir, {
      allPageAnalyses,
      testMap,
      role: CONFIG.role,
      startedAt,
      finishedAt,
    });

    log.info('═══════════════════════════════════════');
    log.success(`Exploration complete!`);
    log.success(`Pages visited:        ${pagesVisited}`);
    log.success(`Test scenarios found: ${totalScenarios}`);
    log.success(`Test map:             ${testMapPath}`);
    log.success(`Human report:         ${reportPath}`);
    log.info('═══════════════════════════════════════');
    log.info('Next step: run the test-gen agent against test-map.json');

  } catch (err) {
    log.error(`Fatal error: ${err.message}`);
    console.error(err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

// ── Helper: analyse a single page and enqueue its navigation targets ────────
async function explorePage(page, navigator, allPageAnalyses, visitHistory, tcCounter, pageIndex) {
  const url = page.url();

  try {
    log.step(`Capturing DOM snapshot...`);
    const snapshot = await captureSnapshot(page);

    log.step(`Sending to Claude for analysis...`);
    const analysis = await analysePage(snapshot, CONFIG.role, visitHistory);

    // Re-number test scenarios sequentially across all pages
    if (analysis.testScenarios) {
      analysis.testScenarios = analysis.testScenarios.map((s, i) => ({
        ...s,
        id: `TC-AUTO-${String(tcCounter + i).padStart(3, '0')}`,
      }));
    }

    log.success(`Page: "${analysis.pageName}" | ${analysis.testScenarios?.length || 0} scenarios`);

    allPageAnalyses.push({ url, analysis });
    visitHistory.push({ url, pageName: analysis.pageName });

    // Enqueue navigation targets from this page's analysis
    if (analysis.navigationTargets?.length) {
      navigator.enqueue(analysis.navigationTargets, url);
      log.step(`Queued ${analysis.navigationTargets.length} navigation targets`);
    }

  } catch (err) {
    log.warn(`Could not analyse ${url}: ${err.message}`);
    allPageAnalyses.push({
      url,
      analysis: {
        pageName: 'Unknown (analysis failed)',
        pageType: 'unknown',
        primaryWorkflow: 'N/A',
        testScenarios: [],
        navigationTargets: [],
        risks: [`Analysis failed: ${err.message}`],
        pageObjects: { suggestedClassName: 'UnknownPage', keyLocators: [] },
      },
    });
  }
}

run();
