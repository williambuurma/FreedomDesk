/**
 * Daily Practice Awareness — continuous situational model (POS §11).
 *
 * Maintains the operational "state of the world" for one practice from midnight
 * to midnight: calendar posture, call stream, recall, capacity, risk flags.
 *
 * FUTURE EXPANSION:
 * - PmsScheduleAdapter: real-time webhook ingestion (Open Dental first)
 * - Event bus: CallSummaryReceived, CancellationDetected, IntegrationDegraded
 * - Redis cache layer for intraday refresh with TTL decay (stale awareness labeled)
 * - Role-scoped projections: getFrontDeskView(), getDoctorView()
 * - Live Operational Awareness surge detection with DNA thresholds
 */

import {
  createMockCallStream,
  createMockOfficeDna,
  createMockRecallPosture,
  createMockScheduleSlots,
  MOCK_PRACTICE_ID,
} from "./mockData.ts";
import type {
  CallSummarySignal,
  DailyAwarenessState,
  IDailyAwareness,
  IOfficeDnaProvider,
  OfficeDnaSnapshot,
  PracticeId,
  RiskFlag,
} from "./types.ts";

const ENGINE_VERSION = "daily-awareness-v1";

export class MockOfficeDnaProvider implements IOfficeDnaProvider {
  getSnapshot(practiceId: PracticeId): OfficeDnaSnapshot {
    return createMockOfficeDna(practiceId);
  }
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function buildRiskFlags(
  practiceId: PracticeId,
  calls: CallSummarySignal[],
  dna: OfficeDnaSnapshot
): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const now = new Date().toISOString();

  for (const call of calls) {
    if (call.afterHours && call.urgency === "urgent") {
      flags.push({
        id: `risk_emerg_${call.callId}`,
        practiceId,
        type: "emergency_follow_up",
        severity: "critical",
        description: `Overnight urgent call requires on-call callback within ${dna.callbackSlaMinutes} min SLA`,
        owner: "front_desk",
        createdAt: call.receivedAt,
      });
    }
    if (call.emotionalFlags?.includes("billingFrustration")) {
      flags.push({
        id: `risk_billing_${call.callId}`,
        practiceId,
        type: "billing_escalation",
        severity: "high",
        description: "Billing frustration flagged — manager callback queue",
        owner: "office_manager",
        createdAt: call.receivedAt,
      });
    }
  }

  const dnaFreshness = 45; // mock — memory module supplies real value in orchestrator
  if (dnaFreshness > 90) {
    flags.push({
      id: "risk_dna_stale",
      practiceId,
      type: "dna_stale",
      severity: "medium",
      description: "Office DNA not validated in 90+ days — configuration drift risk",
      owner: "office_manager",
      createdAt: now,
    });
  }

  return flags;
}

function detectCallSurge(calls: CallSummarySignal[]): boolean {
  const lastHour = calls.filter(
    (c) => Date.now() - new Date(c.receivedAt).getTime() < 60 * 60 * 1000
  );
  return lastHour.length >= 3;
}

interface AwarenessCache {
  state: DailyAwarenessState;
}

const awarenessByPractice = new Map<PracticeId, AwarenessCache>();

export class DailyAwareness implements IDailyAwareness {
  private readonly dnaProvider: IOfficeDnaProvider;

  constructor(dnaProvider: IOfficeDnaProvider = new MockOfficeDnaProvider()) {
    this.dnaProvider = dnaProvider;
  }

  getState(practiceId: PracticeId, date = todayDateString()): DailyAwarenessState {
    const cached = awarenessByPractice.get(practiceId);
    if (cached && cached.state.date === date) {
      return cached.state;
    }
    return this.refresh(practiceId, date);
  }

  refresh(practiceId: PracticeId, date = todayDateString()): DailyAwarenessState {
    const officeDna = this.dnaProvider.getSnapshot(practiceId);
    const callStream = createMockCallStream(practiceId);
    const scheduleSlots = createMockScheduleSlots(practiceId);
    const recallPosture = createMockRecallPosture(practiceId);

    const state: DailyAwarenessState = {
      practiceId,
      date,
      lastRefreshedAt: new Date().toISOString(),
      officeDna,
      callStream,
      scheduleSlots,
      recallPosture,
      riskFlags: buildRiskFlags(practiceId, callStream, officeDna),
      opportunityQueue: [],
      pmsAvailable: false, // Honest gap — no PMS integration in V1
      callSurgeActive: detectCallSurge(callStream),
    };

    awarenessByPractice.set(practiceId, { state });
    return state;
  }

  ingestCallSummary(summary: CallSummarySignal): void {
    const cached = awarenessByPractice.get(summary.practiceId);
    if (!cached) {
      this.refresh(summary.practiceId);
      return this.ingestCallSummary(summary);
    }
    cached.state.callStream.push(summary);
    cached.state.lastRefreshedAt = new Date().toISOString();
    cached.state.callSurgeActive = detectCallSurge(cached.state.callStream);
    cached.state.riskFlags = buildRiskFlags(
      summary.practiceId,
      cached.state.callStream,
      cached.state.officeDna
    );
  }
}

export const defaultDailyAwareness = new DailyAwareness();

export function resetDailyAwarenessForTests(practiceId = MOCK_PRACTICE_ID): void {
  awarenessByPractice.delete(practiceId);
}

export { ENGINE_VERSION as DAILY_AWARENESS_VERSION };
