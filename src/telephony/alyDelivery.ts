/**
 * Aly spoken delivery for ConversationRelay / ElevenLabs Flash.
 * Amber King voice ID unchanged — improve the text we send, not the voice provider.
 * Plain text only: no SSML, no bracketed emotion labels.
 */

/** Split into sentence-sized chunks for natural pauses at boundaries. */
export function splitSpeechChunks(text: string): string[] {
  const cleaned = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return [];

  const parts = cleaned
    .split(/(?<=[.!?])\s+|(?<=—)\s+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length <= 1) return [cleaned];

  // Merge tiny fragments into the previous sentence so we never TTS word-by-word.
  const merged: string[] = [];
  for (const part of parts) {
    if (
      merged.length &&
      (part.length < 12 || /^(and|but|so|then)\b/i.test(part))
    ) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${part}`.trim();
    } else {
      merged.push(part);
    }
  }
  return merged;
}

/**
 * Light polish for TTS pacing — short sentences, natural punctuation,
 * no “truly”, no bracketed stage directions, no stacked empty acknowledgments.
 */
export function polishSpokenDelivery(text: string): string {
  let out = String(text || "")
    .replace(/<\/?speak[^>]*>/gi, "")
    .replace(/<\/?prosody[^>]*>/gi, "")
    .replace(/<\/?break[^>]*\/?>/gi, " ")
    .replace(/\[[^\]]{1,40}\]/g, "")
    .replace(/\btruly\b/gi, "")
    .replace(/\b(okay|ok|thank you|thanks|i'?m sorry)[,.]?\s+\1\b/gi, "$1")
    .replace(/\s+/g, " ")
    .trim();

  // Prefer em-dash pauses over run-on commas for brief acknowledgments.
  out = out.replace(
    /^(That sounds like a difficult night), (I understand)/i,
    "$1. $2"
  );

  if (out && !/[.!?]$/.test(out)) {
    out = `${out}.`;
  }
  return out;
}

/** Whether this action's speech may stay non-interruptible (clinical safety). */
export function isNonInterruptibleAction(action: string | null | undefined): boolean {
  return action === "emergency_escalation";
}
