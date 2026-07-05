/**
 * Constitutional guards — reflection must not diagnose or invent facts.
 */

const DIAGNOSTIC_PATTERNS: RegExp[] = [
  /\b(you have|patient has|likely has|probably has|diagnosed with|diagnosis is)\b/i,
  /\b(infection|abscess|necrosis|cavity needs|needs a root canal|needs extraction)\b/i,
  /\b(will need|should get|requires treatment for)\b/i,
];

const INVENTED_CERTAINTY_PATTERNS: RegExp[] = [
  /\b(definitely|certainly|confirmed that they have|we know they have)\b/i,
];

export function containsDiagnosticLanguage(text: string): boolean {
  return DIAGNOSTIC_PATTERNS.some((pattern) => pattern.test(text));
}

export function containsInventedCertainty(text: string): boolean {
  return INVENTED_CERTAINTY_PATTERNS.some((pattern) => pattern.test(text));
}

export function assertEvidenceBacked(
  statement: string,
  evidenceRef: string | undefined
): string | null {
  if (!evidenceRef?.trim()) {
    return "missing_evidence_ref";
  }
  if (containsDiagnosticLanguage(statement)) {
    return "diagnostic_language";
  }
  if (containsInventedCertainty(statement)) {
    return "invented_certainty";
  }
  return null;
}
