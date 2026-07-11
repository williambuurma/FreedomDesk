/**
 * Aly production voice for Twilio <Say>.
 * Chirp3-HD generative — warm, calm, adult female; highest quality available on Twilio Say.
 * Override with TWILIO_SAY_VOICE when needed (no architecture change).
 */

export const ALY_DEFAULT_SAY_VOICE = "Google.en-US-Chirp3-HD-Aoede";
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
