'use strict';

const fs = require('fs');
const path = require('path');

/**
 * reporter.js
 * Writes exploration results to /output:
 *   - test-map.json          (full machine-readable map used by test-gen agent)
 *   - exploration-report.md  (human-readable summary)
 *   - screenshots/           (one per page visited)
 */

function writeReport(outputDir, { allPageAnalyses, testMap, role, startedAt, finishedAt }) {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(path.join(outputDir, 'screenshots'), { recursive: true });

  // 1. Full test map JSON (input for test-gen agent)
  const fullMap = {
    meta: testMap.explorationMeta,
    pages: allPageAnalyses.map(p => ({
      url: p.url,
      screenshotPath: p.screenshotPath || null,
      ...p.analysis,
    })),
    criticalFlows: testMap.criticalFlows || [],
    coverageGaps: testMap.coverageGaps || [],
    pageObjectsNeeded: testMap.pageObjectsNeeded || [],
    suggestedTestSuites: testMap.suggestedTestSuites || [],
    prioritisedBacklog: testMap.prioritisedBacklog || [],
  };

  fs.writeFileSync(
    path.join(outputDir, 'test-map.json'),
    JSON.stringify(fullMap, null, 2),
    'utf8'
  );

  // 2. Markdown report
  const durationMs = new Date(finishedAt) - new Date(startedAt);
  const durationMin = Math.round(durationMs / 60000);

  const totalScenarios = allPageAnalyses.reduce(
    (acc, p) => acc + (p.analysis.testScenarios?.length || 0), 0
  );

  const highPriority = allPageAnalyses.flatMap(p =>
    (p.analysis.testScenarios || []).filter(s => s.priority === 'high')
  );

  let md = `# LS1 Exploration Report\n\n`;
  md += `**Role:** ${role}  \n`;
  md += `**Pages visited:** ${allPageAnalyses.length}  \n`;
  md += `**Test scenarios found:** ${totalScenarios}  \n`;
  md += `**High priority scenarios:** ${highPriority.length}  \n`;
  md += `**Duration:** ~${durationMin} minute(s)  \n`;
  md += `**Completed:** ${new Date(finishedAt).toLocaleString()}  \n\n`;
  md += `---\n\n`;

  // Critical flows
  if (testMap.criticalFlows?.length) {
    md += `## Critical flows identified\n\n`;
    testMap.criticalFlows.forEach(f => {
      md += `### ${f.flowName} *(${f.priority})*\n`;
      md += `Pages: ${f.pages.join(' → ')}\n\n`;
      md += `> ${f.automationRecommendation}\n\n`;
    });
  }

  // Page-by-page breakdown
  md += `## Page breakdown\n\n`;
  allPageAnalyses.forEach((p, i) => {
    const a = p.analysis;
    md += `### ${i + 1}. ${a.pageName} *(${a.pageType})*\n`;
    md += `**URL:** \`${p.url}\`  \n`;
    md += `**Primary workflow:** ${a.primaryWorkflow}  \n\n`;

    if (a.testScenarios?.length) {
      md += `**Test scenarios:**\n`;
      a.testScenarios.forEach(s => {
        const badge = s.priority === 'high' ? '🔴' : s.priority === 'medium' ? '🟡' : '🟢';
        md += `- ${badge} **${s.title}** *(${s.type})*\n`;
      });
      md += `\n`;
    }

    if (a.risks?.length) {
      md += `**Risks:** ${a.risks.join('; ')}  \n\n`;
    }

    md += `---\n\n`;
  });

  // Prioritised backlog
  if (testMap.prioritisedBacklog?.length) {
    md += `## Prioritised test backlog\n\n`;
    md += `| Rank | Test | Reason |\n|------|------|--------|\n`;
    testMap.prioritisedBacklog.slice(0, 20).forEach(item => {
      md += `| ${item.rank} | ${item.title} | ${item.reason} |\n`;
    });
    md += `\n`;
  }

  // Coverage gaps
  if (testMap.coverageGaps?.length) {
    md += `## Coverage gaps (not reachable this run)\n\n`;
    testMap.coverageGaps.forEach(gap => {
      md += `- ${gap}\n`;
    });
    md += `\n`;
  }

  // Page objects needed
  if (testMap.pageObjectsNeeded?.length) {
    md += `## Page objects to create\n\n`;
    testMap.pageObjectsNeeded.forEach(po => {
      md += `- \`${po}\`\n`;
    });
    md += `\n`;
  }

  fs.writeFileSync(path.join(outputDir, 'exploration-report.md'), md, 'utf8');

  return {
    testMapPath: path.join(outputDir, 'test-map.json'),
    reportPath: path.join(outputDir, 'exploration-report.md'),
    totalScenarios,
  };
}

module.exports = { writeReport };
