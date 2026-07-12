/**
 * Aly production voice for Twilio <Say>.
 * Polly Joanna Generative — warm conversational female; better emotional fit for dental calls.
 * Override with TWILIO_SAY_VOICE when needed.
 */

export const ALY_PREVIOUS_SAY_VOICE = "Google.en-US-Chirp3-HD-Aoede";
export const ALY_DEFAULT_SAY_VOICE = "Polly.Joanna-Generative";
export const ALY_SAY_LANGUAGE = "en-US";

export function resolveAlySayVoice(): string {
  const fromEnv = (process.env.TWILIO_SAY_VOICE || "").trim();
  return fromEnv || ALY_DEFAULT_SAY_VOICE;
}

export function alySayOptions(): { voice: string; language: string } {
  return {
    voice: resolveAlySayVoice(),
    language: ALY_SAY_LANGUAGE,
  };
}

/**
 * Light SSML for calmer pacing — short breaks between sentences.
 * Safe for Polly Generative; keeps wording unchanged.
 */
export function wrapAlySpeech(text: string): string {
  const cleaned = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return cleaned;

  const voice = resolveAlySayVoice();
  // Polly supports break/prosody; Google Chirp3 is less SSML-friendly.
  if (!/^Polly\./i.test(voice)) {
    return cleaned;
  }

  const withBreaks = cleaned
    .replace(/([.!?])\s+/g, "$1<break time=\"280ms\"/> ")
    .replace(/—/g, '<break time="200ms"/>');

  return `<speak><prosody rate="95%">${withBreaks}</prosody></speak>`;
}
