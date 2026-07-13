/**
 * Patient-language tooth location — upper/lower, left/right, front/back.
 * Never asks for maxillary/mandibular or tooth numbers.
 */

export interface ToothLocationParts {
  vertical?: "upper" | "lower";
  side?: "left" | "right";
  depth?: "front" | "back";
}

export function parseToothLocationParts(text: string): ToothLocationParts {
  const lower = String(text || "").toLowerCase();
  const parts: ToothLocationParts = {};

  if (/\b(upper|top|maxilla)\b/.test(lower)) parts.vertical = "upper";
  else if (/\b(lower|bottom|mandible)\b/.test(lower)) parts.vertical = "lower";

  if (/\b(left|l\.?h\.?s\.?)\b/.test(lower)) parts.side = "left";
  else if (/\b(right|r\.?h\.?s\.?)\b/.test(lower)) parts.side = "right";

  if (/\b(front|anterior)\b/.test(lower)) parts.depth = "front";
  else if (/\b(back|posterior|molar|wisdom)\b/.test(lower)) parts.depth = "back";

  return parts;
}

export function mergeLocationParts(
  existing: ToothLocationParts | undefined,
  incoming: ToothLocationParts
): ToothLocationParts {
  return {
    vertical: incoming.vertical || existing?.vertical,
    side: incoming.side || existing?.side,
    depth: incoming.depth || existing?.depth,
  };
}

export function isLocationComplete(parts: ToothLocationParts | undefined): boolean {
  return Boolean(parts?.vertical && parts?.side && parts?.depth);
}

export function missingLocationDimension(
  parts: ToothLocationParts | undefined
): "vertical" | "side" | "depth" | null {
  if (!parts?.vertical) return "vertical";
  if (!parts?.side) return "side";
  if (!parts?.depth) return "depth";
  return null;
}

export function formatNormalizedLocation(parts: ToothLocationParts): string {
  const bits: string[] = [];
  if (parts.vertical) bits.push(parts.vertical);
  if (parts.side) bits.push(parts.side);
  if (parts.depth === "front") bits.push("front");
  else if (parts.depth === "back") bits.push("back");
  if (!bits.length) return "";
  if (parts.depth) {
    return `${parts.vertical || ""}-${parts.side || ""} ${parts.depth} area`
      .replace(/^-|-$/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^-+/, "");
  }
  return bits.join("-");
}

/** Human phrase for confirmation, e.g. "lower-right back area". */
export function formatLocationForSpeech(parts: ToothLocationParts): string {
  const v = parts.vertical || "";
  const s = parts.side || "";
  const d =
    parts.depth === "front"
      ? "front"
      : parts.depth === "back"
        ? "back"
        : "";
  if (v && s && d) return `${v}-${s} ${d} area`;
  if (v && s) return `${v}-${s} area`;
  return [v, s, d].filter(Boolean).join(" ");
}

export function locationQuestionForMissing(
  missing: "vertical" | "side" | "depth"
): string {
  if (missing === "vertical") return "Is it on the upper or lower?";
  if (missing === "side") return "And is that on your left or right?";
  return "Is it toward the front or one of the back teeth?";
}
