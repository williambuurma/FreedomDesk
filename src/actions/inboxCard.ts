/**
 * Project an Action into the decision-card view model.
 */

import type { Action, InboxCard } from "./types.ts";

export function actionToInboxCard(action: Action): InboxCard {
  return {
    id: action.id,
    decision: action.decision,
    ifIgnored: action.ifIgnored,
    whatHappened: action.whatHappened,
    subjectDisplayName: action.subjectDisplayName,
    because: action.because,
    recommendedNextStep: action.recommendedNextStep,
    primaryResponsibility: action.primaryResponsibility,
    urgencyTier: action.urgencyTier,
    status: action.status,
    evidence: action.evidence,
    confidence: action.confidence,
    sourceEventIds: action.sourceEventIds,
    createdAt: action.createdAt,
    category: action.category,
  };
}
