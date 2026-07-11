/**
 * Load practice greeting / hours for Twilio voice — Office DNA JSON only.
 */

import fs from "node:fs";
import path from "node:path";

export interface PracticeVoiceConfig {
  practiceId: string;
  name: string;
  timezone: string;
  agentName: string;
  greeting: {
    businessHours: string;
    afterHours: string;
  };
  hoursOfOperation: Record<
    string,
    { open: string; close: string } | null
  >;
}

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const DEFAULT_CONFIG: PracticeVoiceConfig = {
  practiceId: "practice_cascade_family_gr",
  name: "Cascade Family Dentistry",
  timezone: "America/Detroit",
  agentName: "Aly",
  greeting: {
    businessHours:
      "Thanks for calling Cascade Family Dentistry. This is Aly. How can I help you?",
    afterHours:
      "Thanks for calling Cascade Family Dentistry. You've reached us after hours — this is Aly. How can I help?",
  },
  hoursOfOperation: {
    monday: { open: "08:00", close: "17:00" },
    tuesday: { open: "08:00", close: "17:00" },
    wednesday: { open: "08:00", close: "17:00" },
    thursday: { open: "08:00", close: "17:00" },
    friday: { open: "08:00", close: "14:00" },
    saturday: null,
    sunday: null,
  },
};

function repoRoot(): string {
  return path.resolve(import.meta.dirname, "../..");
}

export function loadPracticeVoiceConfig(
  configPath?: string
): PracticeVoiceConfig {
  const filePath =
    configPath ||
    path.join(repoRoot(), "config/practices/example-grand-rapids.json");
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, "utf8")) as Partial<
      PracticeVoiceConfig
    > & { practiceId?: string };
    return {
      ...DEFAULT_CONFIG,
      ...raw,
      practiceId: DEFAULT_CONFIG.practiceId,
      greeting: { ...DEFAULT_CONFIG.greeting, ...(raw.greeting || {}) },
      hoursOfOperation: {
        ...DEFAULT_CONFIG.hoursOfOperation,
        ...(raw.hoursOfOperation || {}),
      },
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/** Whether the practice is closed at `now` in the practice timezone. */
export function isAfterHours(
  config: PracticeVoiceConfig,
  now: Date = new Date()
): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: config.timezone || "America/Detroit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const weekdayShort = parts.find((p) => p.type === "weekday")?.value || "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value || "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value || "0");

  const weekdayMap: Record<string, (typeof DAY_KEYS)[number]> = {
    Sun: "sunday",
    Mon: "monday",
    Tue: "tuesday",
    Wed: "wednesday",
    Thu: "thursday",
    Fri: "friday",
    Sat: "saturday",
  };
  const dayKey = weekdayMap[weekdayShort] || "monday";
  const hours = config.hoursOfOperation[dayKey];
  if (!hours) return true;

  const [openH, openM] = hours.open.split(":").map(Number);
  const [closeH, closeM] = hours.close.split(":").map(Number);
  const mins = hour * 60 + minute;
  const openMins = openH * 60 + openM;
  const closeMins = closeH * 60 + closeM;
  return mins < openMins || mins >= closeMins;
}

/**
 * Natural spoken greeting from practice name, agent, and hours.
 * Always uses the configured practice name so Office DNA stays the source of truth.
 */
export function selectGreeting(
  config: PracticeVoiceConfig,
  now: Date = new Date()
): string {
  const practice = (config.name || "our office").trim();
  const agent = (config.agentName || "Aly").trim();

  if (isAfterHours(config, now)) {
    return (
      `Thanks for calling ${practice}. ` +
      `You've reached us after hours — this is ${agent}. ` +
      `How can I help?`
    );
  }

  return (
    `Thanks for calling ${practice}. ` +
    `This is ${agent}. ` +
    `How can I help you?`
  );
}
