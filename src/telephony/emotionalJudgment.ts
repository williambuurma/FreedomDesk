/**
 * Selective emotional judgment for Aly — respond to actual communication.
 * Not a phrase library on every turn; never fake enthusiasm during pain.
 */

import type { LiveCallSession } from "./callSession.ts";
import type { SemanticTurnInterpretation } from "./semanticTurnTypes.ts";
import {
  ALREADY_ANSWERED_SPEECH,
  LOOP_RECOVERY_SPEECH,
} from "./conversationLoopDetector.ts";
import { formatLocationForSpeech } from "./toothLocation.ts";
import { polishSpokenDelivery } from "./alyDelivery.ts";

export function composeEmotionalLead(
  session: LiveCallSession,
  interpretation: SemanticTurnInterpretation | null | undefined,
  selectedAction: string
): string {
  if (!interpretation) return "";

  const sig = interpretation.conversationSignals;
  const emotions = interpretation.emotions || [];
  const last = session.lastEmotionalLead || "";

  // Spoken correction — acknowledge the corrected fact, once.
  if (
    interpretation.intent === "correction" ||
    interpretation.corrections.length > 0
  ) {
    const loc = formatLocationForSpeech(session.slots.locationParts || {});
    const line = loc
      ? `Thanks for correcting me—I have the ${loc} now.`
      : "Thanks for correcting me.";
    if (line !== last) {
      session.lastEmotionalLead = line;
      return line;
    }
  }

  // Frustration from Aly repeating herself — highest priority.
  if (sig.callerSaysAlreadyAnswered || sig.callerIsFrustrated) {
    const line = ALREADY_ANSWERED_SPEECH;
    if (line !== last) {
      session.lastEmotionalLead = line;
      return line;
    }
  }

  if (session.loopState?.recoverySpeech === LOOP_RECOVERY_SPEECH) {
    const line = LOOP_RECOVERY_SPEECH;
    if (line !== last) {
      session.lastEmotionalLead = line;
      return line;
    }
  }

  // Uncertainty about tooth location
  if (
    interpretation.uncertainty.includes("tooth_location") &&
    selectedAction === "ask_combined_tooth_location"
  ) {
    const line =
      "That's okay. You don't need to know the exact tooth. Can you tell me whether it feels more upper or lower?";
    if (line !== last) {
      session.lastEmotionalLead = line;
      return line;
    }
  }

  // Pain + worry / sleep — once per call opening only.
  if (
    !session.usedOpening &&
    (emotions.includes("worried") || emotions.includes("scared")) &&
    (emotions.includes("in_pain") || interpretation.facts.sleepDisruption)
  ) {
    const line =
      "That sounds like a difficult night. I understand why you're concerned.";
    session.usedOpening = true;
    session.lastEmotionalLead = line;
    return line;
  }

  // Sleep disruption alone — brief, then move on.
  if (!session.usedOpening && interpretation.facts.sleepDisruption) {
    const line = "That sounds like a difficult night.";
    session.usedOpening = true;
    session.lastEmotionalLead = line;
    return line;
  }

  if (!session.usedOpening && emotions.includes("worried")) {
    const line = "I understand why that would concern you.";
    session.usedOpening = true;
    session.lastEmotionalLead = line;
    return line;
  }

  if (!session.usedOpening && emotions.includes("scared")) {
    const line =
      "I hear that this is frightening. I'm glad you called so we can get the important details to the team.";
    session.usedOpening = true;
    session.lastEmotionalLead = line;
    return line;
  }

  // What happens next
  if (sig.callerAsksWhatHappensNext) {
    const line =
      "I'm collecting the few details the team needs to understand your concern and contact you about the next available option. I just have one more question.";
    if (line !== last) {
      session.lastEmotionalLead = line;
      return line;
    }
  }

  if (sig.callerAsksIfHasAppointment) {
    const line =
      "Not yet. I'm recording your request so the team can review availability and follow up.";
    if (line !== last) {
      session.lastEmotionalLead = line;
      return line;
    }
  }

  return "";
}

/**
 * Prefix spoken response with emotional lead when appropriate.
 * Avoids duplicating if planner already included similar language.
 */
export function applyEmotionalJudgment(
  session: LiveCallSession,
  spoken: string,
  interpretation: SemanticTurnInterpretation | null | undefined,
  selectedAction: string
): string {
  const lead = composeEmotionalLead(session, interpretation, selectedAction);
  if (!lead) return polishSpokenDelivery(spoken);
  if (!spoken) return polishSpokenDelivery(lead);

  // Correction acknowledgment — do not re-ask the corrected location fact.
  if (
    /Thanks for correcting me/i.test(lead) &&
    selectedAction === "ask_combined_tooth_location"
  ) {
    return polishSpokenDelivery(lead);
  }

  // If the selected action already embeds the uncertainty location question, replace.
  if (
    interpretation?.uncertainty.includes("tooth_location") &&
    selectedAction === "ask_combined_tooth_location" &&
    /exact tooth|upper or lower/i.test(lead)
  ) {
    return polishSpokenDelivery(lead);
  }

  // Don't double-prefix similar empathy.
  const leadKey = lead.slice(0, 24).toLowerCase();
  if (spoken.toLowerCase().includes(leadKey)) {
    return polishSpokenDelivery(spoken);
  }

  // Recovery / already-answered lines — keep the full next question body.
  if (
    lead === ALREADY_ANSWERED_SPEECH ||
    lead === LOOP_RECOVERY_SPEECH
  ) {
    session.loopState && (session.loopState.recoverySpeech = null);
    return polishSpokenDelivery(`${lead} ${spoken}`);
  }

  // Correction + next clinical ask (e.g. swelling) — brief ack, then one move.
  if (/Thanks for correcting me/i.test(lead)) {
    return polishSpokenDelivery(`${lead} ${spoken}`);
  }

  return polishSpokenDelivery(`${lead} ${spoken}`);
}
