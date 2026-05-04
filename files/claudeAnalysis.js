'use strict';

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Asks Claude to analyse a DOM snapshot and return structured QA intelligence.
 * Returns a PageAnalysis object.
 */
async function analysePage(snapshot, role, visitHistory) {
  const recentPages = visitHistory.slice(-5).map(p => p.url).join('\n  ');

  const prompt = `You are a senior QA agent exploring a B2B distribution management platform called LS1.
You are logged in as role: ${role}

You have just landed on a new page. Here is a structured snapshot of what the page contains:

<snapshot>
${JSON.stringify(snapshot, null, 2)}
</snapshot>

Recently visited pages:
  ${recentPages || '(none yet)'}

Your job is to analyse this page and return a JSON object with EXACTLY this structure:

{
  "pageName": "short descriptive name for this page (e.g. 'Create Purchase Order', 'Inventory Dashboard')",
  "pageType": "one of: dashboard | list | form | detail | modal | settings | report | auth | unknown",
  "primaryWorkflow": "one sentence describing the main thing a user does on this page",
  "testScenarios": [
    {
      "id": "TC-AUTO-001",
      "title": "short test case title",
      "type": "one of: happy_path | validation | negative | edge_case | navigation",
      "priority": "one of: high | medium | low",
      "steps": ["step 1", "step 2", "step 3"],
      "expectedResult": "what should happen",
      "requiredSelectors": ["description of element needed, e.g. 'submit button', 'vendor dropdown'"]
    }
  ],
  "navigationTargets": [
    {
      "label": "button or link text that would take us somewhere new",
      "reason": "why exploring this would reveal new test surface",
      "priority": "one of: high | medium | low"
    }
  ],
  "risks": ["any data risks, permissions issues, or things to be careful about when testing this page"],
  "pageObjects": {
    "suggestedClassName": "e.g. CreatePurchaseOrderPage",
    "keyLocators": [
      { "name": "camelCaseLocatorName", "strategy": "e.g. getByRole('button', { name: 'Submit' })", "purpose": "what it's for" }
    ]
  }
}

Return ONLY the JSON. No markdown, no explanation.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content[0].text.trim();

  try {
    return JSON.parse(raw);
  } catch {
    // Claude occasionally wraps in backticks despite the instruction
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(cleaned);
  }
}

/**
 * After the full exploration run, asks Claude to synthesise everything into a test map.
 */
async function synthesiseTestMap(allPageAnalyses, role) {
  const summary = allPageAnalyses.map(p => ({
    url: p.url,
    pageName: p.analysis.pageName,
    pageType: p.analysis.pageType,
    scenarioCount: p.analysis.testScenarios.length,
    scenarios: p.analysis.testScenarios.map(s => s.title),
  }));

  const prompt = `You are a QA architect reviewing an automated exploration of the LS1 distribution management platform.
The explorer visited ${allPageAnalyses.length} pages as role: ${role}

Here is the summary of what was found:
${JSON.stringify(summary, null, 2)}

Produce a final JSON test map with this structure:

{
  "explorationMeta": {
    "role": "${role}",
    "pagesVisited": ${allPageAnalyses.length},
    "totalScenariosFound": <count>,
    "exploredAt": "<ISO timestamp>"
  },
  "criticalFlows": [
    {
      "flowName": "e.g. End-to-end Purchase Order",
      "pages": ["page1", "page2", "page3"],
      "priority": "high",
      "automationRecommendation": "short advice on how to automate this flow"
    }
  ],
  "coverageGaps": ["areas that weren't reachable but probably exist"],
  "pageObjectsNeeded": ["list of page object class names to create"],
  "suggestedTestSuites": [
    {
      "suiteName": "e.g. Purchase Order Suite",
      "testIds": ["TC-AUTO-001", "TC-AUTO-002"],
      "estimatedDuration": "e.g. 3 minutes"
    }
  ],
  "prioritisedBacklog": [
    { "rank": 1, "title": "test title", "pageId": "url fragment", "reason": "why it's highest priority" }
  ]
}

Return ONLY the JSON.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content[0].text.trim();
  try {
    return JSON.parse(raw);
  } catch {
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    return JSON.parse(cleaned);
  }
}

module.exports = { analysePage, synthesiseTestMap };
