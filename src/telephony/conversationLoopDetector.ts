/**
 * Hard conversational loop detector — prevents re-ask traps.
 * Second identical non-safety action without meaningful state change → recovery.
 */

import type { ConversationalAction } from "./allowedActions.ts";
import type { LiveCallSession } from "./callSession.ts";

export const LOOP_RECOVERY_SPEECH =
  "I'm sorry—we seem to be getting stuck on that. I'll note it for the team to confirm with you, and we'll keep moving.";

export const ALREADY_ANSWERED_SPEECH =
  "I'm sorry—I know you already gave me that. I won't ask you for it again.";

export interface ActionAttemptRecord {
  action: ConversationalAction;
  attempts: number;
  lastTurn: number;
  /** Whether the action's target fact(s) changed after the last ask. */
  stateChangedAfterLastAsk: boolean;
  flaggedForTeam: boolean;
  /** Fingerprint of action-relevant facts at ask time. */
  factSnapshotAtAsk: string;
}

export interface ConversationLoopState {
  lastActions: ConversationalAction[];
  attempts: Partial<Record<ConversationalAction, ActionAttemptRecord>>;
  lastFactFingerprint: string;
  recoveryAction: ConversationalAction | null;
  recoverySpeech: string | null;
  suppressActions: ConversationalAction[];
}

const NON_SAFETY_ACTIONS = new Set<ConversationalAction>([
  "ask_name",
  "ask_last_name_spelling",
  "confirm_last_name_spelling",
  "ask_callback_phone",
  "ask_reason_for_calling",
  "ask_combined_tooth_location",
  "ask_swelling",
  "ask_combined_scheduling_preference",
  "ask_fever",
  "answer_process_question",
]);

const SAFETY_ACTIONS = new Set<ConversationalAction>([
  "ask_breathing",
  "emergency_escalation",
]);

/** Fact slice relevant to whether an ask succeeded. */
export function actionFactSnapshot(
  session: LiveCallSession,
  action: ConversationalAction
): string {
  const s = session.slots;
  switch (action) {
    case "ask_name":
      return `name=${s.nameCaptured ? 1 : 0}|n=${s.name ? 1 : 0}`;
    case "confirm_last_name_spelling":
      return `conf=${s.lastNameConfirmed ? 1 : 0}|abd=${s.spellingAbandoned ? 1 : 0}|spell=${s.lastNameSpelling || ""}`;
    case "ask_last_name_spelling":
      return `spell=${s.lastNameSpellingCaptured ? 1 : 0}|abd=${s.spellingAbandoned ? 1 : 0}|letters=${s.lastNameSpelling || s.pendingLastNameSpelling || ""}`;
    case "ask_combined_tooth_location":
      return `loc=${s.locationParts?.vertical || "-"}:${s.locationParts?.side || "-"}:${s.locationParts?.depth || "-"}`;
    case "ask_swelling":
      return `sw=${typeof s.swelling === "boolean" ? (s.swelling ? 1 : 0) : "?"}`;
    case "ask_fever":
      return `fv=${typeof s.fever === "boolean" ? (s.fever ? 1 : 0) : "?"}`;
    case "ask_combined_scheduling_preference":
      return `ear=${typeof s.wantsEarliest === "boolean" ? (s.wantsEarliest ? 1 : 0) : "?"}|sn=${typeof s.shortNoticeOk === "boolean" ? (s.shortNoticeOk ? 1 : 0) : "?"}`;
    case "ask_breathing":
      return `br=${typeof s.breathingOk === "boolean" ? (s.breathingOk ? 1 : 0) : "?"}`;
    case "ask_reason_for_calling":
      return `reason=${s.reasonCaptured ? 1 : 0}`;
    case "ask_callback_phone":
      return `phone=${session.from ? 1 : 0}`;
    default:
      return factFingerprint(session);
  }
}

export function emptyLoopState(): ConversationLoopState {
  return {
    lastActions: [],
    attempts: {},
    lastFactFingerprint: "",
    recoveryAction: null,
    recoverySpeech: null,
    suppressActions: [],
  };
}

export function ensureLoopState(session: LiveCallSession): ConversationLoopState {
  if (!session.loopState) session.loopState = emptyLoopState();
  return session.loopState;
}

export function factFingerprint(session: LiveCallSession): string {
  const s = session.slots;
  return [
    s.nameCaptured ? 1 : 0,
    s.lastNameSpellingCaptured ? 1 : 0,
    s.lastNameConfirmed ? 1 : 0,
    s.spellingAbandoned ? 1 : 0,
    s.locationParts?.vertical || "-",
    s.locationParts?.side || "-",
    s.locationParts?.depth || "-",
    typeof s.swelling === "boolean" ? (s.swelling ? "1" : "0") : "?",
    typeof s.fever === "boolean" ? (s.fever ? "1" : "0") : "?",
    typeof s.wantsEarliest === "boolean" ? (s.wantsEarliest ? "1" : "0") : "?",
    typeof s.shortNoticeOk === "boolean" ? (s.shortNoticeOk ? "1" : "0") : "?",
    typeof s.breathingOk === "boolean" ? (s.breathingOk ? "1" : "0") : "?",
  ].join("|");
}

/**
 * After slots merge: mark whether the prior ask's *target* facts changed.
 */
export function noteStateAfterCallerTurn(session: LiveCallSession): void {
  const loop = ensureLoopState(session);
  const lastAction = loop.lastActions[loop.lastActions.length - 1];
  if (lastAction && loop.attempts[lastAction]) {
    const rec = loop.attempts[lastAction]!;
    const now = actionFactSnapshot(session, lastAction);
    rec.stateChangedAfterLastAsk = now !== rec.factSnapshotAtAsk;
    if (rec.stateChangedAfterLastAsk) {
      // Successful ask — clear stale recovery prompts.
      loop.recoverySpeech = null;
      loop.recoveryAction = null;
    }
  }
  loop.lastFactFingerprint = factFingerprint(session);
}

/**
 * Before allow-list finalization: suppress actions that would loop.
 */
export function applyLoopSuppression(
  session: LiveCallSession,
  allowed: ConversationalAction[],
  meta: {
    callerSaysAlreadyAnswered?: boolean;
    unclearSafetyAnswer?: boolean;
  } = {}
): ConversationalAction[] {
  const loop = ensureLoopState(session);
  let next = allowed.filter((a) => !loop.suppressActions.includes(a));

  if (meta.callerSaysAlreadyAnswered) {
    const last = loop.lastActions[loop.lastActions.length - 1];
    if (last && NON_SAFETY_ACTIONS.has(last)) {
      if (!loop.suppressActions.includes(last)) {
        loop.suppressActions.push(last);
      }
      next = next.filter((a) => a !== last);
      loop.recoverySpeech = ALREADY_ANSWERED_SPEECH;
    }
  }

  for (const [action, rec] of Object.entries(loop.attempts)) {
    if (!rec) continue;
    const act = action as ConversationalAction;
    if (SAFETY_ACTIONS.has(act)) continue;
    // Second failed attempt without state change — hard suppress + team flag.
    if (rec.attempts >= 2 && !rec.stateChangedAfterLastAsk) {
      if (!loop.suppressActions.includes(act)) {
        loop.suppressActions.push(act);
      }
      if (!rec.flaggedForTeam) {
        rec.flaggedForTeam = true;
        if (!session.slots.teamFlags) session.slots.teamFlags = [];
        const flag = `loop_flag_${act}`;
        if (!session.slots.teamFlags.includes(flag)) {
          session.slots.teamFlags.push(flag);
        }
      }
      next = next.filter((a) => a !== act);
      loop.recoverySpeech = LOOP_RECOVERY_SPEECH;
    }
  }

  // If last ask failed (caller answered, target fact unchanged), suppress that action now
  // so the planner cannot select it a second time — unless the target fact just changed.
  const failed = lastFailedAsk(session);
  if (failed && NON_SAFETY_ACTIONS.has(failed) && !SAFETY_ACTIONS.has(failed)) {
    const rec = loop.attempts[failed];
    if (rec && rec.stateChangedAfterLastAsk) {
      // Successful answer — do not suppress; allow re-confirm / next step.
    } else if (!loop.suppressActions.includes(failed)) {
      loop.suppressActions.push(failed);
      next = next.filter((a) => a !== failed);
    } else {
      next = next.filter((a) => a !== failed);
    }
  }

  // Successful state change on an action: lift prior suppress so we can re-confirm.
  for (const [action, rec] of Object.entries(loop.attempts)) {
    if (!rec?.stateChangedAfterLastAsk) continue;
    const act = action as ConversationalAction;
    const idx = loop.suppressActions.indexOf(act);
    if (idx >= 0) {
      loop.suppressActions.splice(idx, 1);
      if (!next.includes(act) && allowed.includes(act)) next.push(act);
    }
  }

  return next;
}

function lastFailedAsk(session: LiveCallSession): ConversationalAction | null {
  const loop = ensureLoopState(session);
  const last = loop.lastActions[loop.lastActions.length - 1];
  if (!last) return null;
  const rec = loop.attempts[last];
  if (!rec) return null;
  if (rec.stateChangedAfterLastAsk === true) return null;
  // Failed when we've recorded an ask and the post-answer note found no target change.
  if (rec.attempts >= 1 && rec.stateChangedAfterLastAsk === false) {
    const now = actionFactSnapshot(session, last);
    if (now === rec.factSnapshotAtAsk) return last;
  }
  return null;
}

/**
 * After action selection: record attempt; second same non-safety without change → recover.
 */
export function recordSelectedAction(
  session: LiveCallSession,
  action: ConversationalAction,
  turnNumber: number
): {
  shouldRecover: boolean;
  recoverySpeech: string | null;
} {
  const loop = ensureLoopState(session);
  const prev = loop.attempts[action];
  const snapshot = actionFactSnapshot(session, action);

  const sameAsLast =
    loop.lastActions[loop.lastActions.length - 1] === action &&
    prev &&
    !prev.stateChangedAfterLastAsk;

  // Prior ask of this action failed (caller answered, target unchanged).
  const priorFailed =
    Boolean(prev) &&
    prev!.attempts >= 1 &&
    prev!.stateChangedAfterLastAsk === false &&
    prev!.factSnapshotAtAsk === snapshot;

  const attempts = (prev?.attempts || 0) + 1;
  loop.attempts[action] = {
    action,
    attempts,
    lastTurn: turnNumber,
    stateChangedAfterLastAsk: false,
    flaggedForTeam: prev?.flaggedForTeam || false,
    factSnapshotAtAsk: snapshot,
  };
  loop.lastActions = [...loop.lastActions.slice(-4), action];

  if (SAFETY_ACTIONS.has(action)) {
    return { shouldRecover: false, recoverySpeech: null };
  }

  if (sameAsLast || priorFailed || (attempts >= 2 && prev && !prev.stateChangedAfterLastAsk)) {
    if (!loop.suppressActions.includes(action)) {
      loop.suppressActions.push(action);
    }
    if (!session.slots.teamFlags) session.slots.teamFlags = [];
    const flag = `loop_flag_${action}`;
    if (!session.slots.teamFlags.includes(flag)) {
      session.slots.teamFlags.push(flag);
    }
    if (
      action === "ask_last_name_spelling" ||
      action === "confirm_last_name_spelling"
    ) {
      session.slots.spellingAbandoned = true;
      session.slots.spellingAbandonNeedsAnnounce = true;
    }
    if (action === "ask_name" && !session.slots.nameCaptured) {
      if (!session.slots.teamFlags.includes("name_needs_confirmation")) {
        session.slots.teamFlags.push("name_needs_confirmation");
      }
    }
    loop.recoverySpeech = LOOP_RECOVERY_SPEECH;
    loop.recoveryAction = action;
    return { shouldRecover: true, recoverySpeech: LOOP_RECOVERY_SPEECH };
  }

  return {
    shouldRecover: false,
    recoverySpeech: loop.recoverySpeech,
  };
}

/**
 * Pick a different allowed action after a loop recovery, preferring progress.
 */
export function pickRecoveryAction(
  allowed: ConversationalAction[],
  suppressed: ConversationalAction
): ConversationalAction | null {
  const prefer: ConversationalAction[] = [
    "answer_process_question",
    "ask_swelling",
    "ask_combined_tooth_location",
    "ask_fever",
    "acknowledge_and_recap",
    "persist_and_close",
  ];
  for (const a of prefer) {
    if (a !== suppressed && allowed.includes(a)) return a;
  }
  return allowed.find((a) => a !== suppressed) || null;
}

/**
 * Soft-complete a failed non-safety ask so the call can continue.
 */
export function softCompleteFailedAction(
  session: LiveCallSession,
  action: ConversationalAction
): void {
  if (!session.slots.teamFlags) session.slots.teamFlags = [];
  const flag = `loop_flag_${action}`;
  if (!session.slots.teamFlags.includes(flag)) {
    session.slots.teamFlags.push(flag);
  }
  if (action === "ask_combined_scheduling_preference") {
    if (typeof session.slots.wantsEarliest !== "boolean") {
      session.slots.wantsEarliest = true;
    }
    if (typeof session.slots.shortNoticeOk !== "boolean") {
      session.slots.shortNoticeOk = false;
    }
    session.slots.outcomeCaptured = true;
    if (
      !session.slots.teamFlags.includes(
        "scheduling_preference_needs_confirmation"
      )
    ) {
      session.slots.teamFlags.push(
        "scheduling_preference_needs_confirmation"
      );
    }
  }
  if (action === "ask_name" && !session.slots.nameCaptured) {
    if (!session.slots.teamFlags.includes("name_needs_confirmation")) {
      session.slots.teamFlags.push("name_needs_confirmation");
    }
  }
  if (
    action === "ask_last_name_spelling" ||
    action === "confirm_last_name_spelling"
  ) {
    session.slots.spellingAbandoned = true;
    session.slots.spellingAbandonNeedsAnnounce = true;
    if (
      !session.slots.teamFlags.includes(
        "last_name_spelling_needs_confirmation"
      )
    ) {
      session.slots.teamFlags.push("last_name_spelling_needs_confirmation");
    }
  }
}

export function isNonSafetyAction(action: string): boolean {
  return NON_SAFETY_ACTIONS.has(action as ConversationalAction);
}
