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
  const {
    PracticeImprovementEngine,
    buildDemoScheduleOpeningEvent,
    buildDemoPhoneRecoveryEvent,
  } = await import("../src/practice-improvement/index.ts");

  const brain = new PracticeBrain(MOCK_PRACTICE_ID);
  const result = brain.runDailyCycle();
  const { morningBrief, opportunities, metrics } = result;

  const engine = new PracticeImprovementEngine();
  const { arbitration } = engine.processAndArbitrate(
    [buildDemoPhoneRecoveryEvent(), buildDemoScheduleOpeningEvent()],
    {
      practiceId: "practice_cascade_family_gr",
      now: new Date().toISOString(),
      maxSurface: 1,
    }
  );

  function toCard(item) {
    const card = item.projection;
    if (!card) return null;
    const kind =
      item.result.situation?.kind ||
      (item.result.domain === "phone"
        ? "recoverable_phone_opportunity"
        : item.result.domain === "operating"
          ? "recoverable_schedule_opportunity"
          : "improvement_recommendation");
    return {
      id: card.recommendationId,
      kind,
      situation: card.situation,
      recommendation: card.recommendation,
      primaryAction: card.primaryAction,
      subject: card.subject,
      stake: card.stake,
      whyText: card.whyText,
      accent: card.accent,
      group: card.group,
      recommendationId: card.recommendationId,
      practiceId: card.practiceId,
      evidence: card.evidence,
      arbitration: item.disposition,
      arbitrationReason: item.reason,
      rank: item.rank,
    };
  }

  const decisionCards = arbitration.surface.map(toCard).filter(Boolean);
  const waitingDecisions = [...arbitration.waiting, ...arbitration.escalated]
    .map(toCard)
    .filter(Boolean);

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
    decisionCards,
    waitingDecisions,
    arbitrationSummary: {
      primaryId: arbitration.primary?.result.recommendation?.id || null,
      surfaced: arbitration.surface.length,
      waiting: arbitration.waiting.length,
      escalated: arbitration.escalated.length,
      merged: arbitration.merged.length,
      suppressed: arbitration.suppressed.length,
      expired: arbitration.expired.length,
    },
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
    `  ${preview.sections.length} sections, ${preview.opportunities.length} opportunities, ${preview.topRecommendations.length} recommendations, ${preview.decisionCards.length} decision cards (primary), ${preview.waitingDecisions.length} waiting`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
