#!/usr/bin/env node
"use strict";

/**
 * Generates static Morning Brief preview JSON for the product dashboard.
 * Source of truth: Practice Brain mock cycle — no PMS, no PHI.
 *
 * Usage: node scripts/generate-morning-brief-preview.js
 * Output: data/morning-brief-preview.json
 */

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const outputPath = path.join(repoRoot, "data/morning-brief-preview.json");

async function main() {
  const { PracticeBrain, MOCK_PRACTICE_ID } = await import(
    "../src/practice-brain/index.ts"
  );

  const brain = new PracticeBrain(MOCK_PRACTICE_ID);
  const result = brain.runDailyCycle();
  const { morningBrief, opportunities, metrics } = result;

  const preview = {
    previewMode: true,
    generatedAt: new Date().toISOString(),
    recipientName: "Dr. Buurma",
    practiceName: morningBrief.practiceName,
    date: morningBrief.date,
    estimatedReadMinutes: morningBrief.estimatedReadMinutes,
    targetDeliveryAt: morningBrief.targetDeliveryAt,
    stewardshipNote: morningBrief.stewardshipNote,
    sections: morningBrief.sections,
    topRecommendations: morningBrief.topRecommendations.map((rec) => ({
      id: rec.id,
      recommendation: rec.recommendation,
      reason: rec.reason,
      priority: rec.priority,
      category: rec.category,
      owner: rec.owner,
      confidence: rec.confidence,
      expectedOutcome: rec.expectedOutcome,
    })),
    opportunities: opportunities.map((opp) => ({
      id: opp.id,
      type: opp.type,
      title: opp.title,
      description: opp.description,
      confidence: opp.confidence,
      estimatedImpact: opp.estimatedImpact,
      suggestedOwner: opp.suggestedOwner,
    })),
    metrics: {
      asOf: metrics.asOf,
      stewardshipHighlight: metrics.stewardshipHighlight,
      departments: metrics.departments.map((dept) => ({
        department: dept.department,
        kpis: dept.kpis.map((k) => ({
          id: k.id,
          name: k.name,
          value: k.value,
          unit: k.unit,
          target: k.target,
          trend: k.trend,
          health: k.health,
        })),
      })),
    },
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(preview, null, 2) + "\n", "utf8");
  console.error(`Morning Brief preview written to ${outputPath}`);
  console.error(
    `  ${preview.sections.length} sections, ${preview.opportunities.length} opportunities, ${preview.topRecommendations.length} recommendations`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
