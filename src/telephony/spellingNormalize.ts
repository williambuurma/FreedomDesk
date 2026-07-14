/**
 * Last-name spelling normalizer for phone STT.
 * Only accepts explicit spelling evidence — never invents letters from ordinary words.
 */

export type SpellingConfidenceLabel = "high" | "medium" | "low" | "none";

export interface SpellingNormalizeResult {
  /** Letters only, uppercase, e.g. BUURMA */
  letters: string;
  /** @deprecated Prefer letters — kept for call-site compatibility */
  spelling: string;
  confidence: SpellingConfidenceLabel;
  /** Numeric 0–1 for legacy lowConfidence checks */
  confidenceScore: number;
  lowConfidence: boolean;
  evidenceTokens: string[];
  ignoredPrefix: string;
}

const NATO: Record<string, string> = {
  alpha: "A",
  alfa: "A",
  bravo: "B",
  charlie: "C",
  delta: "D",
  echo: "E",
  foxtrot: "F",
  golf: "G",
  hotel: "H",
  india: "I",
  juliet: "J",
  juliett: "J",
  kilo: "K",
  lima: "L",
  mike: "M",
  november: "N",
  oscar: "O",
  papa: "P",
  quebec: "Q",
  romeo: "R",
  sierra: "S",
  tango: "T",
  uniform: "U",
  victor: "V",
  whiskey: "W",
  xray: "X",
  "x-ray": "X",
  yankee: "Y",
  zulu: "Z",
};

/** Example words allowed ONLY after "as in" / "like" / "for". */
const EXAMPLE_WORDS: Record<string, string> = {
  apple: "A",
  adam: "A",
  boy: "B",
  baker: "B",
  cat: "C",
  charles: "C",
  dog: "D",
  david: "D",
  edward: "E",
  elephant: "E",
  frank: "F",
  fred: "F",
  george: "G",
  harry: "H",
  ice: "I",
  john: "J",
  king: "K",
  larry: "L",
  mary: "M",
  man: "M",
  nancy: "N",
  ocean: "O",
  peter: "P",
  queen: "Q",
  robert: "R",
  sam: "S",
  tom: "T",
  uncle: "U",
  victor: "V",
  william: "W",
  xray: "X",
  yellow: "Y",
  zebra: "Z",
};

/** Spoken letter names (ASR often writes these instead of B/U/R). */
const SPOKEN_LETTER_NAMES: Record<string, string> = {
  ay: "A",
  aye: "A",
  hey: "A",
  bee: "B",
  be: "B",
  see: "C",
  sea: "C",
  dee: "D",
  ee: "E",
  ef: "F",
  eff: "F",
  gee: "G",
  aitch: "H",
  eye: "I",
  jay: "J",
  kay: "K",
  el: "L",
  ell: "L",
  em: "M",
  en: "N",
  oh: "O",
  pee: "P",
  queue: "Q",
  cue: "Q",
  are: "R",
  arr: "R",
  ess: "S",
  tee: "T",
  you: "U",
  yu: "U",
  vee: "V",
  ex: "X",
  why: "Y",
  zee: "Z",
  zed: "Z",
};

/** Words that must never become spelling letters. */
const IGNORE_WORDS = new Set([
  "yeah",
  "yes",
  "yep",
  "yup",
  "sure",
  "okay",
  "ok",
  "alright",
  "allright",
  "it",
  "its",
  "is",
  "that",
  "thats",
  "this",
  "my",
  "the",
  "last",
  "name",
  "names",
  "spelled",
  "spell",
  "spelling",
  "letter",
  "letters",
  "dash",
  "hyphen",
  "and",
  "um",
  "uh",
  "so",
  "well",
  "like", // alone — "like" only counts inside "X like Y"
  "for", // alone — only inside "X for Y"
  "as",
  "in",
  "of",
  "a",
  "an",
  "to",
  "with",
  "please",
  "thanks",
  "thank",
  "you",
  // Ordinary speech — never fabricate letter sequences from these.
  "what",
  "huh",
  "hmm",
  "maybe",
  "guess",
  "know",
  "dont",
  "don't",
  "already",
  "told",
  "said",
  "gave",
  "move",
  "can",
  "we",
  "on",
  "hello",
  "hi",
  "hey",
  "sorry",
  "wait",
  "actually",
  "think",
  "not",
  "sure",
  "fine",
  "okay",
  "right",
  "left",
  "pain",
  "tooth",
  "hurt",
  "hurts",
]);

/** Entire-utterance reject list for compact runs (Huh / What / maybe). */
const REJECT_COMPACT_WORDS = new Set([
  "what",
  "huh",
  "hmm",
  "maybe",
  "yes",
  "yeah",
  "yep",
  "no",
  "nope",
  "nah",
  "ok",
  "okay",
  "sure",
  "right",
  "correct",
  "fine",
  "wait",
  "sorry",
  "hello",
  "help",
  "pain",
  "hurt",
  "hurts",
  "tooth",
  "know",
  "dont",
  "move",
  "told",
  "said",
  "already",
]);

const PREFIX_PATTERNS: RegExp[] = [
  /^(yeah|yes|yep|yup|sure|okay|ok|alright)[,.\s]+/i,
  /^(yeah|yes|yep|yup|sure|okay|ok)[,.\s]+(it'?s|it is|that'?s|thats)[,.\s]+/i,
  /^(it'?s|it is|that'?s|thats)[,.\s]+/i,
  /^(it'?s|it is)\s+spelled[,.\s]+/i,
  /^(sure)[,.\s]+(it'?s|it is)[,.\s]+/i,
  /^(my\s+)?(last\s+)?name\s+is[,.\s]+/i,
  /^(the\s+)?last\s+name\s+is[,.\s]+/i,
  /^(it\s+is\s+spelled|it'?s\s+spelled)[,.\s]+/i,
];

function emptyResult(ignoredPrefix = ""): SpellingNormalizeResult {
  return {
    letters: "",
    spelling: "",
    confidence: "none",
    confidenceScore: 0,
    lowConfidence: true,
    evidenceTokens: [],
    ignoredPrefix,
  };
}

function letterFromExample(word: string): string | null {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return null;
  if (NATO[w]) return NATO[w];
  if (EXAMPLE_WORDS[w]) return EXAMPLE_WORDS[w];
  // First letter of the example ONLY when the pattern was explicitly "X as in Y".
  if (w.length >= 2) return w.charAt(0).toUpperCase();
  return null;
}

/**
 * Strip conversational prefixes; return remaining spelling body + ignored text.
 */
export function stripSpellingPrefix(raw: string): {
  body: string;
  ignoredPrefix: string;
} {
  let body = String(raw || "").trim();
  if (!body) return { body: "", ignoredPrefix: "" };

  const original = body;
  let changed = true;
  // Apply prefixes repeatedly (e.g. "Yeah, it's …").
  while (changed) {
    changed = false;
    for (const re of PREFIX_PATTERNS) {
      const m = body.match(re);
      if (m) {
        body = body.slice(m[0].length).trim();
        changed = true;
        break;
      }
    }
  }

  // Capture ignored conversational prefix before dash/hyphen normalization
  // (those replacements shorten the body and must not inflate ignoredPrefix).
  const ignoredPrefix = original.slice(0, original.length - body.length).trim();

  // "dash" as spoken hyphen between letters: "B dash U" → "B-U"
  body = body
    .replace(/\bdash\b/gi, "-")
    .replace(/\bhyphen\b/gi, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/^-|-$/g, "");

  return { body, ignoredPrefix };
}

function tokenizeSpellingBody(body: string): string[] {
  return body
    .replace(/,/g, " ")
    .replace(/'/g, "")
    .replace(/[–—]/g, "-")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Expand a hyphenated letter run like "B-U-U-R-M-A" into letters.
 * Rejects if any segment is not a single letter (e.g. "BUU-RMA" stays as tokens).
 */
function expandHyphenRun(token: string): string[] | null {
  if (!token.includes("-")) return null;
  const parts = token.split("-").filter(Boolean);
  if (parts.length < 2) return null;
  const letters: string[] = [];
  for (const p of parts) {
    const only = p.replace(/[^A-Za-z]/g, "");
    if (only.length !== 1) return null;
    letters.push(only.toUpperCase());
  }
  return letters;
}

/**
 * Normalize spoken spelling into uppercase letters.
 * Never invents letters from ordinary conversational words.
 */
export function normalizeSpokenSpelling(raw: string): SpellingNormalizeResult {
  const text = String(raw || "").trim();
  if (!text) return emptyResult();

  const { body, ignoredPrefix } = stripSpellingPrefix(text);
  if (!body) return emptyResult(ignoredPrefix);

  // Reject bare multi-word full names ("William Buurma") — not a spelling answer.
  if (
    /^[A-Za-z]+(?:\s+[A-Za-z]+){1,3}$/.test(body) &&
    !/-/.test(body) &&
    !/\bas in\b|\blike\b|\bfor\b|double|bravo|alpha|mike/i.test(body)
  ) {
    const parts = body.split(/\s+/);
    const allSingle = parts.every((p) => p.replace(/[^A-Za-z]/g, "").length === 1);
    if (!allSingle && parts.length >= 2) {
      return emptyResult(ignoredPrefix || body);
    }
  }

  const letters: string[] = [];
  const evidenceTokens: string[] = [];
  const tokens = tokenizeSpellingBody(body);
  let i = 0;
  let usedAsIn = false;
  let usedNato = false;
  let usedHyphenRun = false;
  let usedCompactRun = false;

  while (i < tokens.length) {
    const tok = tokens[i];
    const lower = tok.toLowerCase().replace(/[^a-z]/g, "");
    const next = tokens[i + 1] ? tokens[i + 1].toLowerCase().replace(/[^a-z']/g, "") : "";

    // Hyphenated letter sequence: B-U-U-R-M-A
    const hyphenLetters = expandHyphenRun(tok);
    if (hyphenLetters) {
      letters.push(...hyphenLetters);
      evidenceTokens.push(tok);
      usedHyphenRun = true;
      i += 1;
      continue;
    }

    // double R / two Ls / 2 Rs
    if (
      (lower === "double" || lower === "twice" || lower === "two" || lower === "2") &&
      tokens[i + 1]
    ) {
      const ch = tokens[i + 1].replace(/[^A-Za-z]/g, "");
      if (ch.length === 1) {
        const L = ch.toUpperCase();
        letters.push(L, L);
        evidenceTokens.push(`double-${L}`);
        i += 2;
        continue;
      }
    }

    // X as in Y / X like Y / X for Y
    const letterOnly = tok.replace(/[^A-Za-z]/g, "");
    if (letterOnly.length === 1) {
      if (next === "as" && tokens[i + 2] && tokens[i + 2].toLowerCase().replace(/[^a-z]/g, "") === "in") {
        const exWord = tokens[i + 3] || "";
        const ex = letterFromExample(exWord);
        const L = (ex || letterOnly).toUpperCase().charAt(0);
        letters.push(L);
        evidenceTokens.push(`${letterOnly.toUpperCase()} as in ${exWord}`);
        usedAsIn = true;
        i += 4;
        continue;
      }
      if (next === "like" || next === "for") {
        const exWord = tokens[i + 2] || "";
        const ex = letterFromExample(exWord);
        const L = (ex || letterOnly).toUpperCase().charAt(0);
        letters.push(L);
        evidenceTokens.push(`${letterOnly.toUpperCase()} ${next} ${exWord}`);
        usedAsIn = true;
        i += 3;
        continue;
      }

      // Isolated single letter
      letters.push(letterOnly.toUpperCase());
      evidenceTokens.push(letterOnly.toUpperCase());
      i += 1;
      continue;
    }

    // Skip connector leftovers
    if (
      lower === "as" ||
      lower === "in" ||
      lower === "like" ||
      lower === "for" ||
      lower === "dash" ||
      lower === "hyphen"
    ) {
      i += 1;
      continue;
    }

    // Spoken letter names BEFORE ignore list ("you" must mean U, not filler).
    if (SPOKEN_LETTER_NAMES[lower]) {
      letters.push(SPOKEN_LETTER_NAMES[lower]);
      evidenceTokens.push(`spoken:${lower}`);
      usedNato = true;
      i += 1;
      continue;
    }

    // Explicit ignore list — never turn into letters
    if (IGNORE_WORDS.has(lower)) {
      i += 1;
      continue;
    }

    // NATO phonetic words only
    if (NATO[lower]) {
      letters.push(NATO[lower]);
      evidenceTokens.push(tok);
      usedNato = true;
      i += 1;
      continue;
    }

    // Compact letter-only run as ONE token (BUURMA) — never ordinary words.
    if (
      letterOnly.length >= 4 &&
      letterOnly.length <= 16 &&
      /^[A-Za-z]+$/.test(letterOnly) &&
      tokens.length === 1 &&
      !EXAMPLE_WORDS[lower] &&
      !REJECT_COMPACT_WORDS.has(lower) &&
      !IGNORE_WORDS.has(lower)
    ) {
      for (const ch of letterOnly.toUpperCase()) {
        letters.push(ch);
        evidenceTokens.push(`compact:${ch}`);
      }
      usedCompactRun = true;
      i += 1;
      continue;
    }

    // Unknown multi-letter word — IGNORE (do not take first letter).
    i += 1;
  }

  const spelling = letters.join("");
  if (spelling.length < 2) {
    return emptyResult(ignoredPrefix);
  }

  // Reject weak mixes: ordinary speech + a couple of letter-like tokens
  // (e.g. "I already told you" must not become "IU").
  const ignoreTokenCount = tokens.filter((tok) => {
    const lower = tok.toLowerCase().replace(/[^a-z]/g, "");
    return IGNORE_WORDS.has(lower);
  }).length;
  const usedSpokenName = evidenceTokens.some((t) => t.startsWith("spoken:"));
  if (
    usedSpokenName &&
    !usedHyphenRun &&
    !usedAsIn &&
    spelling.length < 4 &&
    ignoreTokenCount >= 2
  ) {
    return emptyResult(ignoredPrefix);
  }

  // Reject compact-only results that look like ordinary speech (≤3 letters).
  if (usedCompactRun && !usedHyphenRun && !usedAsIn && !usedNato && spelling.length < 4) {
    return emptyResult(ignoredPrefix);
  }

  let confidenceScore = 0.4;
  if (usedHyphenRun) confidenceScore += 0.4;
  if (usedAsIn) confidenceScore += 0.3;
  if (usedNato) confidenceScore += 0.25;
  const allExplicitSingles = evidenceTokens.every(
    (t) =>
      /^[A-Z]$/.test(t) ||
      t.includes("-") ||
      /\bas in\b|\blike\b|\bfor\b|double-/i.test(t)
  );
  if (evidenceTokens.length >= 3 && allExplicitSingles && !usedCompactRun) {
    confidenceScore += 0.35;
  }
  // Compact runs without hyphen/phonetic evidence stay at most medium-low.
  // Reject low-confidence compact-only tokens that look like guessed surnames
  // (e.g. ASR "Euurma" / "Burma") — require explicit letter evidence.
  if (usedCompactRun && !usedHyphenRun && !usedAsIn && !usedNato) {
    confidenceScore = Math.min(confidenceScore, 0.55);
    if (confidenceScore < 0.6) {
      return emptyResult(ignoredPrefix);
    }
  }
  if (spelling.length >= 4 && (usedHyphenRun || usedAsIn || allExplicitSingles)) {
    confidenceScore += 0.05;
  }
  confidenceScore = Math.min(1, confidenceScore);

  let confidence: SpellingConfidenceLabel = "low";
  if (confidenceScore >= 0.8) confidence = "high";
  else if (confidenceScore >= 0.6) confidence = "medium";

  return {
    letters: spelling,
    spelling,
    confidence,
    confidenceScore,
    lowConfidence: confidence === "low" || confidence === "none",
    evidenceTokens,
    ignoredPrefix,
  };
}

/**
 * Parse a correction like "the fourth letter is R" or "it's R not M".
 * Returns null when not a clear single-letter correction.
 */
export function parseSpellingCorrection(
  raw: string,
  currentSpelling: string
): string | null {
  const text = String(raw || "").trim();
  const current = String(currentSpelling || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  if (!text || current.length < 2) return null;

  const ordinals: Record<string, number> = {
    first: 1,
    second: 2,
    third: 3,
    fourth: 4,
    fifth: 5,
    sixth: 6,
    seventh: 7,
    eighth: 8,
    ninth: 9,
    tenth: 10,
    "1st": 1,
    "2nd": 2,
    "3rd": 3,
    "4th": 4,
    "5th": 5,
    "6th": 6,
    "7th": 7,
    "8th": 8,
    "9th": 9,
    "10th": 10,
  };

  const ordHit = text.match(
    /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th)\b(?:\s+letter)?(?:\s+is)?\s+([A-Za-z])\b/i
  );
  if (ordHit) {
    const idx = ordinals[ordHit[1].toLowerCase()];
    const letter = ordHit[2].toUpperCase();
    if (idx && idx <= current.length) {
      const chars = current.split("");
      chars[idx - 1] = letter;
      return chars.join("");
    }
  }

  const letterN = text.match(/\bletter\s+(\d+)\s+is\s+([A-Za-z])\b/i);
  if (letterN) {
    const idx = Number(letterN[1]);
    const letter = letterN[2].toUpperCase();
    if (idx >= 1 && idx <= current.length) {
      const chars = current.split("");
      chars[idx - 1] = letter;
      return chars.join("");
    }
  }

  return null;
}

export function spellingLettersForSpeech(spelling: string): string {
  return String(spelling || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("")
    .join("-");
}

export function spellingToDisplayName(spelling: string): string {
  const letters = String(spelling || "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
  if (!letters) return "";
  return letters.charAt(0).toUpperCase() + letters.slice(1);
}

/** Max spelling asks (initial + one retry). */
export const MAX_SPELLING_ATTEMPTS = 2;
