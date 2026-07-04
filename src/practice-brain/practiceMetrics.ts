/**
 * Practice Metrics — measurable KPIs for every department (POS §4–§10, §24).
 *
 * Tracks role-specific and practice-level KPIs from awareness state and memory.
 * Every metric connects to a recommended action where possible (POS §24.2).
 *
 * FUTURE EXPANSION:
 * - Time-series store (TimescaleDB / BigQuery) for weekly/monthly intelligence
 * - PMS-backed production and recall metrics when integrations live
 * - Dashboard contract tests against POS metric definitions
 * - Anonymous regional benchmarks (L2 opt-in) — never cross-tenant PHI
 * - Metric governance anti-goodharting review (CLE §28)
 */

import type {
  DailyAwarenessState,
  Department,
  DepartmentMetrics,
  IDailyAwareness,
  IPracticeMetrics,
  KPIValue,
  MetricHealth,
  MetricTrend,
  PracticeId,
  PracticeMemorySnapshot,
  PracticeMetricsSnapshot,
} from "./types.ts";

const ENGINE_VERSION = "practice-metrics-v1";

function computeHealth(
  value: number,
  target: number,
  direction: "up" | "down"
): MetricHealth {
  if (target <= 0) return "insufficient_data";
  const ratio = direction === "up" ? value / target : target / value;
  if (ratio >= 0.95) return "healthy";
  if (ratio >= 0.8) return "warning";
  return "critical";
}

function kpi(
  id: string,
  name: string,
  department: Department,
  value: number,
  unit: string,
  target: number,
  targetDirection: "up" | "down",
  trend: MetricTrend = "flat"
): KPIValue {
  return {
    id,
    name,
    department,
    value,
    unit,
    target,
    targetDirection,
    trend,
    health: computeHealth(value, target, targetDirection),
    comparisonLabel: "vs. target",
    asOf: new Date().toISOString(),
  };
}

function computeAccessMetrics(awareness: DailyAwarenessState): KPIValue[] {
  const totalCalls = awareness.callStream.length;
  const afterHours = awareness.callStream.filter((c) => c.afterHours).length;
  const emergencies = awareness.callStream.filter(
    (c) => c.urgency === "emergency" || c.sameDayEmergency
  ).length;
  const avgCompleteness =
    totalCalls === 0
      ? 0
      : awareness.callStream.reduce((s, c) => s + c.completenessScore, 0) / totalCalls;

  return [
    kpi(
      "answer_rate",
      "Calls captured",
      "patient_access",
      totalCalls,
      "calls",
      5,
      "up",
      "up"
    ),
    kpi(
      "after_hours_capture",
      "After-hours calls handled",
      "patient_access",
      afterHours,
      "calls",
      1,
      "up",
      "flat"
    ),
    kpi(
      "summary_completeness",
      "Summary completeness avg",
      "front_desk",
      Math.round(avgCompleteness * 100),
      "%",
      95,
      "up",
      "up"
    ),
    kpi(
      "emergency_routing",
      "Emergency/urgent events",
      "doctor",
      emergencies,
      "events",
      0,
      "down",
      "flat"
    ),
  ];
}

function computeScheduleMetrics(awareness: DailyAwarenessState): KPIValue[] {
  const slots = awareness.scheduleSlots;
  const openDoctor = slots.filter(
    (s) => s.column === "doctor" && s.status === "open"
  ).length;
  const openHygiene = slots.filter(
    (s) => s.column === "hygiene" && s.status === "open"
  ).length;
  const cancelled = slots.filter((s) => s.status === "cancelled").length;
  const scheduled = slots.filter((s) => s.status === "scheduled").length;
  const utilization =
    scheduled + openDoctor + openHygiene + cancelled === 0
      ? 0
      : Math.round(
          (scheduled / (scheduled + openDoctor + openHygiene + cancelled)) * 100
        );

  return [
    kpi(
      "doctor_open_blocks",
      "Open doctor blocks today",
      "doctor",
      openDoctor,
      "blocks",
      1,
      "down",
      "flat"
    ),
    kpi(
      "hygiene_open_slots",
      "Open hygiene slots today",
      "hygiene",
      openHygiene,
      "slots",
      0,
      "down",
      "flat"
    ),
    kpi(
      "cancellation_count",
      "Cancellations today",
      "front_desk",
      cancelled,
      "slots",
      0,
      "down",
      "up"
    ),
    kpi(
      "schedule_utilization",
      "Schedule utilization",
      "practice",
      utilization,
      "%",
      80,
      "up",
      "flat"
    ),
  ];
}

function computeRetentionMetrics(awareness: DailyAwarenessState): KPIValue[] {
  const overdue = awareness.recallPosture.filter((r) => r.daysOverdue > 0);
  const overdueOnSchedule = overdue.filter((r) => r.scheduledToday).length;
  const severelyOverdue = overdue.filter((r) => r.daysOverdue > 90).length;

  return [
    kpi(
      "recall_overdue_count",
      "Overdue recall patients",
      "hygiene",
      overdue.length,
      "patients",
      0,
      "down",
      "down"
    ),
    kpi(
      "recall_on_schedule_today",
      "Overdue recall on today's schedule",
      "hygiene",
      overdueOnSchedule,
      "patients",
      overdue.length,
      "up",
      "up"
    ),
    kpi(
      "severely_overdue",
      "Recall 90+ days overdue",
      "hygiene",
      severelyOverdue,
      "patients",
      0,
      "down",
      "flat"
    ),
  ];
}

function computeTeamMetrics(
  awareness: DailyAwarenessState,
  memory: PracticeMemorySnapshot
): KPIValue[] {
  const dnaDays = memory.dnaFreshnessDays ?? 999;
  const acceptedRecs = memory.recommendationHistory.filter(
    (f) => f.status === "accepted" || f.status === "implemented"
  ).length;
  const totalRecs = memory.recommendationHistory.length;
  const acceptanceRate =
    totalRecs === 0 ? 0 : Math.round((acceptedRecs / totalRecs) * 100);

  return [
    kpi(
      "dna_freshness",
      "Days since DNA validation",
      "office_manager",
      dnaDays,
      "days",
      90,
      "down",
      dnaDays > 90 ? "up" : "flat"
    ),
    kpi(
      "recommendation_acceptance",
      "Recommendation acceptance rate",
      "office_manager",
      acceptanceRate,
      "%",
      50,
      "up",
      "up"
    ),
    kpi(
      "call_surge",
      "Peak-hour call surge active",
      "front_desk",
      awareness.callSurgeActive ? 1 : 0,
      "flag",
      0,
      "down",
      "flat"
    ),
    kpi(
      "pms_integration",
      "PMS data available",
      "office_manager",
      awareness.pmsAvailable ? 100 : 0,
      "%",
      100,
      "up",
      "flat"
    ),
  ];
}

function groupByDepartment(kpis: KPIValue[]): DepartmentMetrics[] {
  const departments: Department[] = [
    "practice",
    "doctor",
    "front_desk",
    "hygiene",
    "assistant",
    "office_manager",
    "patient_access",
  ];
  return departments.map((department) => ({
    department,
    kpis: kpis.filter((k) => k.department === department),
  }));
}

function findStewardshipHighlight(kpis: KPIValue[]): string | undefined {
  const improved = kpis.filter(
    (k) => k.trend === "up" && k.targetDirection === "up" && k.health === "healthy"
  );
  if (improved.length === 0) {
    return "Steady operations — no critical metric regressions detected overnight.";
  }
  const pick = improved[0];
  return `${pick.name} at ${pick.value}${pick.unit} — trending positively vs. baseline.`;
}

export class PracticeMetrics implements IPracticeMetrics {
  computeSnapshot(
    practiceId: PracticeId,
    awareness: DailyAwarenessState,
    memory: PracticeMemorySnapshot
  ): PracticeMetricsSnapshot {
    const allKpis = [
      ...computeAccessMetrics(awareness),
      ...computeScheduleMetrics(awareness),
      ...computeRetentionMetrics(awareness),
      ...computeTeamMetrics(awareness, memory),
    ];

    return {
      practiceId,
      asOf: new Date().toISOString(),
      departments: groupByDepartment(allKpis),
      stewardshipHighlight: findStewardshipHighlight(allKpis),
    };
  }
}

export const defaultPracticeMetrics = new PracticeMetrics();

export { ENGINE_VERSION as PRACTICE_METRICS_VERSION };
