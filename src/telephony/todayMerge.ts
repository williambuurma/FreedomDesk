/**
 * Merge latest actionable call into Today preview JSON.
 * Preview remains the safe fallback when no live call exists.
 */

import type { LatestActionableCall } from "./completedCall.ts";

export interface MyDayPreviewData {
  previewMode?: boolean;
  roles?: Record<
    string,
    {
      decisionCards?: unknown[];
      waitingDecisions?: unknown[];
      arbitrationSummary?: Record<string, unknown>;
      [key: string]: unknown;
    }
  >;
  [key: string]: unknown;
}

/**
 * Overlay the live front-desk decision card onto preview data.
 * Does not invent a new Today surface — mutates the existing role view shape.
 */
export function mergeTodayWithLatestCall(
  preview: MyDayPreviewData,
  latest: LatestActionableCall | null
): MyDayPreviewData {
  if (!latest?.decisionCard) {
    return {
      ...preview,
      liveCallActive: false,
    };
  }

  const roles = { ...(preview.roles || {}) };
  const frontDesk = { ...(roles.front_desk || {}) };
  const previousPrimary = Array.isArray(frontDesk.decisionCards)
    ? frontDesk.decisionCards
    : [];
  const previousWaiting = Array.isArray(frontDesk.waitingDecisions)
    ? frontDesk.waitingDecisions
    : [];

  frontDesk.decisionCards = [latest.decisionCard];
  frontDesk.waitingDecisions = [...previousPrimary, ...previousWaiting].filter(
    (card) => {
      const id =
        card && typeof card === "object" && "id" in card
          ? (card as { id?: string }).id
          : "";
      return id && id !== latest.decisionCard.id;
    }
  );
  frontDesk.arbitrationSummary = {
    ...(frontDesk.arbitrationSummary || {}),
    ...latest.arbitrationSummary,
    liveCallId: latest.callId,
  };
  frontDesk.liveCall = {
    callId: latest.callId,
    generatedAt: latest.generatedAt,
    source: latest.source,
    intent: latest.intent,
    urgency: latest.urgency,
  };

  roles.front_desk = frontDesk;

  return {
    ...preview,
    previewMode: preview.previewMode !== false,
    liveCallActive: true,
    liveSource: "latest-actionable-call",
    liveCallId: latest.callId,
    liveGeneratedAt: latest.generatedAt,
    roles,
  };
}
