#!/usr/bin/env node
"use strict";

/**
 * Generates static Today preview JSON for the companion (legacy filename).
 * Composes Practice Brain daily cycle + Practice Memory morning summary.
 *
 * Usage: node scripts/generate-my-day-preview.js
 * Output: data/my-day-preview.json
 */

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const outputPath = path.join(repoRoot, "data/my-day-preview.json");
const staffPath = path.join(repoRoot, "data/practice-staff.json");

function loadStaffSettings() {
  try {
    return JSON.parse(fs.readFileSync(staffPath, "utf8"));
  } catch {
    return {
      defaultReceptionistId: "receptionist_sarah",
      defaultDoctorId: "doctor_johnson",
      receptionists: [{ id: "receptionist_sarah", firstName: "Sarah", displayName: "Sarah" }],
      doctors: [{ id: "doctor_johnson", displayName: "Dr. Johnson", shortName: "Dr. Johnson" }],
    };
  }
}

function staffRecipientName(staff, roleId) {
  if (roleId === "front_desk") {
    const rec = staff.receptionists.find((r) => r.id === staff.defaultReceptionistId);
    return rec?.firstName || "Sarah";
  }
  const doc = staff.doctors.find((d) => d.id === staff.defaultDoctorId);
  return doc?.displayName || "Dr. Johnson";
}

function primaryDoctorName(staff) {
  const doc = staff.doctors.find((d) => d.id === staff.defaultDoctorId);
  return doc?.displayName || "Dr. Johnson";
}

const ROLE_CONFIG = {
  dentist: {
    id: "dentist",
    label: "Doctor",
    recipientName: "Dr. Buurma",
    owners: ["dentist", "assistant"],
    opportunityOwners: ["dentist", "assistant"],
    insightDepartment: "doctor",
    taskOwners: ["dentist", "assistant"],
    maxPriorities: 3,
    maxPatients: 3,
    maxOpportunities: 2,
  },
  front_desk: {
    id: "front_desk",
    label: "Receptionist",
    recipientName: "Jessica",
    owners: ["front_desk"],
    opportunityOwners: ["front_desk"],
    insightDepartment: "front_desk",
    taskOwners: ["front_desk"],
    maxPriorities: 3,
    maxPatients: 3,
    maxOpportunities: 3,
  },
};

const PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

function sortByPriority(items) {
  return [...items].sort(
    (a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9)
  );
}

function ownerMatches(roleOwners, owner) {
  return roleOwners.includes(owner);
}

function patientDisplayName(patient) {
  const { firstName, lastName, preferredName } = patient.identity;
  return [preferredName ?? firstName, lastName].filter(Boolean).join(" ");
}

function pickInsight(metrics, department, stewardshipNote) {
  const dept = metrics.departments.find((d) => d.department === department);
  const kpis = (dept?.kpis || []).filter((k) => k.health !== "insufficient_data");

  if (kpis.length > 0) {
    const featured = [...kpis].sort((a, b) => {
      const healthOrder = { critical: 0, warning: 1, healthy: 2 };
      return (healthOrder[a.health] ?? 2) - (healthOrder[b.health] ?? 2);
    })[0];

    const value =
      featured.unit === "%"
        ? `${featured.value}%`
        : featured.unit === "blocks" || featured.unit === "slots"
          ? `${featured.value} open`
          : `${featured.value} ${featured.unit || ""}`.trim();

    return {
      kicker: "Practice insight",
      text: `${featured.name}: ${value}`,
      detail:
        featured.target != null
          ? `Target ${featured.target}${featured.unit === "%" ? "%" : featured.unit ? " " + featured.unit : ""}. ${stewardshipNote || ""}`.trim()
          : stewardshipNote || undefined,
    };
  }

  return {
    kicker: "Practice insight",
    text: stewardshipNote || "Practice operating within normal parameters.",
  };
}

function buildPriorities(recommendations, roleConfig) {
  const roleOwned = recommendations.filter((rec) =>
    ownerMatches(roleConfig.owners, rec.owner)
  );
  const critical = recommendations.filter((rec) => rec.priority === "critical");
  const merged = sortByPriority(
    [...new Map([...critical, ...roleOwned].map((r) => [r.id, r])).values()]
  );

  return merged.slice(0, roleConfig.maxPriorities).map((rec) => ({
    id: rec.id,
    action: rec.recommendation,
    reason: rec.reason,
    priority: rec.priority,
    owner: rec.owner,
    category: rec.category,
  }));
}

function buildPatients(memory, roleConfig, briefSections) {
  const patients = [];
  const seen = new Set();

  function addPatient(entry) {
    if (seen.has(entry.id)) return;
    seen.add(entry.id);
    patients.push(entry);
  }

  for (const patient of memory.patients) {
    const name = patientDisplayName(patient);

    for (const issue of patient.unresolvedIssues) {
      if (issue.status !== "open" && issue.status !== "escalated") continue;
      if (roleConfig.id === "dentist" && (issue.category === "billing" || issue.category === "scheduling")) continue;
      if (
        roleConfig.id === "front_desk" &&
        issue.category !== "scheduling" &&
        issue.category !== "billing"
      )
        continue;

      addPatient({
        id: `pat-attn-${issue.id}`,
        name,
        issue: issue.title,
        action: issue.description || "Review and resolve before end of day.",
        reason: issue.emotionalContext || issue.description,
        priority: issue.status === "escalated" ? "high" : "medium",
      });
    }

    for (const task of patient.openTasks) {
      if (!ownerMatches(roleConfig.taskOwners, task.owner)) continue;
      if (roleConfig.id === "dentist" && task.owner === "billing") continue;

      addPatient({
        id: `pat-attn-${task.id}`,
        name,
        issue: task.title,
        action: task.description || "Complete follow-up.",
        reason: task.description,
        priority: task.priority,
      });
    }

    if (roleConfig.id === "dentist") {
      for (const concern of patient.clinicalConcerns) {
        if (concern.status !== "active" && concern.status !== "monitoring") continue;
        addPatient({
          id: `pat-attn-${concern.id}`,
          name,
          issue: concern.concern,
          action:
            concern.urgency === "urgent"
              ? "Review before patient contact today."
              : "Note for today's clinical context.",
          reason: concern.tooth ? `Tooth #${concern.tooth}` : undefined,
          priority: concern.urgency === "urgent" ? "high" : "medium",
        });
      }
    }
  }

  const emergent = briefSections.find((s) => s.id === "emergent_followups");
  if (emergent?.items) {
    for (const item of emergent.items) {
      if (!ownerMatches(roleConfig.owners, item.owner) && item.priority !== "critical") continue;
      addPatient({
        id: item.id,
        name: "Overnight caller",
        issue: item.summary,
        action: item.detail || "Follow up per office protocol.",
        reason: item.detail,
        priority: "critical",
      });
    }
  }

  const newPatients = briefSections.find((s) => s.id === "new_patients_today");
  if (newPatients?.items && roleConfig.id === "front_desk") {
    for (const item of newPatients.items) {
      addPatient({
        id: item.id,
        name: "New patient today",
        issue: item.summary,
        action: item.detail || "Verify intake and insurance before arrival.",
        reason: item.detail,
        priority: "high",
      });
    }
  }

  return sortByPriority(patients).slice(0, roleConfig.maxPatients);
}

function buildOpportunities(opportunities, roleConfig) {
  return opportunities
    .filter((opp) => ownerMatches(roleConfig.opportunityOwners, opp.suggestedOwner))
    .slice(0, roleConfig.maxOpportunities)
    .map((opp) => ({
      id: opp.id,
      type: opp.type,
      action: opportunityAction(opp),
      title: opp.title,
      description: opp.description,
      reason: `${opp.type.replace(/_/g, " ")} · ${Math.round(opp.confidence * 100)}% confidence · ${opp.estimatedImpact || "medium"} impact`,
    }));
}

function opportunityAction(opp) {
  const byType = {
    emergency: "Follow up on the overnight urgent call today",
    patient: "Complete verification and prep before the patient arrives",
    cancellation_recovery: "Offer the cancelled hygiene slot to the waitlist",
    production: "Confirm the lab case before the crown seat",
    retention: "Reach out to recall-overdue patients on today's list",
  };
  return byType[opp.type] || opp.title;
}

function timeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function patientCountPhrase(count) {
  if (count === 0) return null;
  if (count === 1) return "One patient deserves extra attention";
  return `${count} patients deserve extra attention`;
}

function buildMorningSummary(roleConfig, view) {
  const critical = view.priorities.filter((p) => p.priority === "critical");
  const patientCount = view.patientsAttention.filter(
    (p) => p.name !== "Overnight caller" && p.name !== "New patient today"
  ).length;
  const hasInsuranceTask = view.priorities.some((p) =>
    /insurance|benefits|verify/i.test(p.action)
  );
  const hasCrownToday = [...view.patientsAttention, ...view.priorities].some((item) =>
    /crown/i.test((item.issue || item.action || "").toString())
  );

  const greeting = `${timeGreeting()}, ${roleConfig.recipientName}.`;
  const bodyParts = [];

  if (critical.length === 0 && view.priorities.length === 0 && patientCount === 0) {
    bodyParts.push("Everything looks ready.");
    bodyParts.push("You're in good shape today.");
  } else if (critical.length > 0) {
    bodyParts.push("Your schedule is busy today, but everything is under control.");
  } else {
    bodyParts.push("Today looks well prepared.");
  }

  const detailParts = [];
  const patientPhrase = patientCountPhrase(patientCount);
  if (patientPhrase) detailParts.push(patientPhrase);

  if (hasInsuranceTask && hasCrownToday) {
    detailParts.push(
      "one insurance verification should be completed before the first crown seat"
    );
  } else if (hasInsuranceTask) {
    detailParts.push("one insurance verification should be completed this morning");
  } else if (view.priorities.length > 0 && critical.length === 0) {
    const n = view.priorities.length;
    detailParts.push(
      n === 1
        ? "one item on your list needs attention this morning"
        : `${n} items on your list need attention this morning`
    );
  }

  if (detailParts.length > 0) {
    bodyParts.push(detailParts.join(" and ") + ".");
  } else if (critical.length === 0 && bodyParts[0] !== "Everything looks ready.") {
    bodyParts.push("No urgent issues detected.");
  }

  return {
    greeting,
    body: bodyParts.join(" "),
  };
}

function buildTodaysFocus(view, roleConfig) {
  const critical =
    view.urgentTasks?.find((p) => p.priority === "critical") ||
    view.priorities?.find((p) => p.priority === "critical");
  const insurancePriority = (view.urgentTasks || view.priorities || []).find((p) =>
    /insurance|benefits|verify/i.test(p.action)
  );
  const crownPatient = (view.patientsAttention || []).find(
    (p) =>
      p.name &&
      p.name !== "Overnight caller" &&
      p.name !== "New patient today" &&
      (/crown|sensitiv|anxiet|comfort/i.test(p.issue) ||
        /crown|sensitiv|anxiet|comfort/i.test(p.action))
  );

  if (roleConfig.id === "dentist") {
    if (crownPatient) {
      return `Today's biggest opportunity is helping ${crownPatient.name} feel comfortable before treatment.`;
    }
    const labPriority = view.priorities.find((p) => /lab|crown seat/i.test(p.action));
    if (labPriority) {
      return "Today's biggest risk is a delayed crown seat if the lab case isn't confirmed before the patient arrives.";
    }
    if (view.priorities?.length === 0 && view.patientsAttention?.length === 0) {
      return "Today looks balanced. Focus on keeping appointments running on time.";
    }
    return "Today looks balanced. Focus on keeping appointments running on time after lunch.";
  }

  if (insurancePriority && /crown/i.test(insurancePriority.action)) {
    return "Today's biggest risk is delaying insurance verification before the morning crown seat.";
  }

  if (critical && critical.category === "emergency") {
    return "Today's biggest priority is completing the overnight emergency callback before the morning rush.";
  }

  if (crownPatient) {
    return `Today's biggest opportunity is helping ${crownPatient.name} feel comfortable before treatment.`;
  }

  if (insurancePriority) {
    return "Today's biggest risk is delaying insurance verification before the morning crown seat.";
  }

  if ((view.priorities?.length ?? 0) === 0 && (view.patientsAttention?.length ?? 0) === 0) {
    return "Today looks balanced. Focus on keeping appointments running on time.";
  }

  return "Today looks balanced. Focus on keeping appointments running on time after lunch.";
}

function workTaskAction(item) {
  const text = (
    item.label +
    " " +
    (item.instruction || "") +
    " " +
    (item.action || item.recommendation || item.issue || "")
  ).toLowerCase();
  const category = item.category || "";

  if (category === "emergency" || /callback|urgent|overnight|emergency|call back/.test(text)) {
    return {
      actionLabel: "View call summary",
      actionHref: "#calls",
      actionId: "view-summary",
      panel: "view-summary",
    };
  }
  if (/verify|benefits|insurance|delta|ppo|medicaid|hkd/.test(text)) {
    return {
      actionLabel: "Verify insurance",
      actionHref: "#patients",
      actionId: "verify-insurance",
      panel: "verify-insurance",
    };
  }
  if (/schedule|reschedule|cancel|waitlist|slot open|hygiene slot/.test(text)) {
    return { actionLabel: "Schedule appt", actionHref: "#patients", actionId: "schedule-appt" };
  }
  return { actionLabel: "View summary", actionHref: "#calls", actionId: "view-summary" };
}

function toWorkTask(fields) {
  const actionMeta = workTaskAction(fields);
  const actionId = fields.actionId || actionMeta.actionId;
  const panel =
    fields.panel ||
    (actionId === "view-summary" ? "view-summary" : actionMeta.panel);

  return {
    id: fields.id,
    label: fields.label,
    instruction: fields.instruction,
    priority: fields.priority || "medium",
    category: fields.category,
    status: fields.status,
    recommendedNextStep: fields.recommendedNextStep,
    actionLabel: fields.actionLabel || actionMeta.actionLabel,
    actionHref: fields.actionHref || actionMeta.actionHref,
    actionId,
    panel,
    callSummary: fields.callSummary,
    insurancePanel: fields.insurancePanel,
  };
}

function buildAttentionCards(urgentTasks, briefSections, priorities) {
  const cards = [];

  cards.push({
    id: "overnight-emergency",
    type: "call-preview",
    icon: "📞",
    patientName: "Liam Johnson",
    preview: "Possible dental infection",
    variant: "red",
    taskId: "urgent-overnight-emergency",
    panel: "view-summary",
    actionLabel: "Open",
  });

  cards.push({
    id: "overnight-crown",
    type: "call-preview",
    icon: "📞",
    patientName: "Robert Chen",
    preview: "Temp crown off",
    variant: "amber",
    taskId: "overnight-crown-off",
    panel: "view-summary",
    actionLabel: "Open",
  });

  const callbackTask = urgentTasks.find(
    (t) => t.category === "emergency" || /overnight|callback/i.test(t.label)
  );
  if (callbackTask) {
    cards.push({
      id: "callback-waiting",
      type: "callback-preview",
      icon: "☎️",
      title: "Callback waiting",
      patientName: "Mary Johnson",
      preview: "Overnight emergency — not reached",
      variant: "red",
      taskId: callbackTask.id,
      panel: "view-summary",
      actionLabel: "Start callback",
    });
  }

  const insuranceCount = Math.max(
    priorities.filter((p) => /verify|benefits|insurance/i.test(p.action || "")).length,
    1
  );

  cards.push({
    id: "insurance",
    type: "count",
    icon: "🛡️",
    title: insuranceCount === 1 ? "Benefits not verified" : `${insuranceCount} benefits checks`,
    description: "Before today's appointments",
    variant: "amber",
  });

  return cards.slice(0, 4);
}

function buildScheduleGaps(opportunities, staff) {
  const doctorName = primaryDoctorName(staff);
  const gaps = [];
  const cancelOpp = opportunities.find((o) => o.type === "cancellation_recovery");

  if (cancelOpp) {
    gaps.push({
      id: "gap-doc-1100",
      label: "Open chair",
      time: "11:00 AM",
      provider: doctorName,
      duration: "60 min available",
      status: "available",
    });
  }

  return gaps;
}

function overnightCallerInstruction() {
  return "Swelling and fever. Not reached yet.";
}

function buildCallSummaryForEmergency() {
  return {
    patientName: "Liam Johnson",
    caller: "Mary Johnson (mother)",
    calledAt: "Yesterday, 10:47 PM",
    chiefConcern: "Facial swelling and fever",
    aiSummary:
      "Parent reports progressive swelling since dinner and low-grade fever. Child is in discomfort but breathing normally. Caller requested same-day evaluation.",
    recommendedNextStep:
      "Call back before morning appointments. Schedule same-day emergency eval if symptoms warrant.",
    urgency: "Urgent",
    intent: "Same-day emergency eval — child with facial swelling",
    symptoms: "Swelling and fever reported. Parent concerned overnight.",
    nextStep: "Review the full summary, then call back before the morning rush.",
    phone: "(616) 555-0142",
  };
}

function buildCallSummaryForCrownOff() {
  return {
    patientName: "Robert Chen",
    caller: "Robert Chen",
    calledAt: "Yesterday, 8:15 PM",
    chiefConcern: "Temporary crown dislodged while eating",
    aiSummary:
      "Patient reports temporary crown on #19 came off during dinner. Mild sensitivity, no bleeding. Would like guidance before tomorrow's appointment.",
    recommendedNextStep:
      "Review call summary and confirm whether patient should come in early or wait for scheduled visit.",
    urgency: "Routine",
    intent: "Treatment concern — temporary crown",
    phone: "(616) 555-0177",
  };
}

function buildCallSummaryForNewPatient() {
  return {
    patientName: "Finn Leo",
    caller: "Finn Leo",
    calledAt: "Yesterday, 9:12 PM",
    chiefConcern: "New patient — first visit scheduling",
    aiSummary:
      "New patient moving to area. Delta Dental PPO. Requested exam and cleaning. Some anxiety about first visit noted.",
    recommendedNextStep: "Review intake details and confirm paperwork before 8:30 AM arrival.",
    urgency: "Routine",
    intent: "New patient intake — first visit",
    symptoms: "Chief complaint captured on phone. Insurance: Delta Dental PPO.",
    nextStep: "Review intake details and confirm paperwork before 08:30 arrival.",
    phone: "(616) 555-0198",
  };
}

function buildInsurancePanelForPatient(patientName) {
  return {
    company: "Delta Dental PPO",
    subscriber: patientName,
    status: "Not verified",
    coverage: "Primary",
    lastVerified: "Never",
    missing: ["Confirm member ID", "Verify crown coverage for #14"],
    benefitsNote: "Benefits remaining will appear here after verification.",
  };
}

function buildSinceYesterday(briefSections, opportunities) {
  const tokens = [];

  const overnight = briefSections.find((s) => s.id === "overnight_calls");
  if (overnight?.items?.length) {
    const total = overnight.items.length;
    const callbacks = overnight.items.filter((i) =>
      /urgent|callback|emergency/i.test(i.summary + (i.detail || ""))
    ).length;
    tokens.push({
      id: "overnight",
      text: total === 1 ? "1 overnight" : `${total} overnight`,
    });
    if (callbacks > 0) {
      tokens.push({
        id: "callback",
        text: callbacks === 1 ? "1 callback" : `${callbacks} callback`,
      });
    }
  }

  const emergent = briefSections.find((s) => s.id === "emergent_followups");
  if (emergent?.items?.length) {
    const count = emergent.items.length;
    if (!tokens.some((t) => t.id === "callback")) {
      tokens.push({
        id: "emergency",
        text: count === 1 ? "1 emergency" : `${count} emergency`,
      });
    }
  }

  const newPatients = briefSections.find((s) => s.id === "new_patients_today");
  if (newPatients?.items?.length) {
    tokens.push({
      id: "request",
      text: newPatients.items.length === 1 ? "1 new patient" : `${newPatients.items.length} new patients`,
    });
  }

  const schedule = briefSections.find((s) => s.id === "schedule_snapshot");
  const cancelCount = schedule?.items?.filter((i) => /cancel/i.test(i.summary)).length || 0;
  const waitlistCancel = briefSections.find((s) => s.id === "waitlist_cancellations");
  const cancelItems = waitlistCancel?.items?.length || (cancelCount > 0 ? 1 : 0);
  if (cancelItems > 0) {
    tokens.push({
      id: "cancel",
      text: cancelItems === 1 ? "1 cancel" : `${Math.min(cancelItems, 2)} cancel`,
    });
  }

  const alerts = briefSections.find((s) => s.id === "alerts");
  const messages = alerts?.items?.filter((i) => /message|note|team|vendor/i.test(i.summary)).length || 0;
  if (messages > 0) {
    tokens.push({
      id: "message",
      text: messages === 1 ? "1 message" : `${messages} message`,
    });
  }

  return {
    tokens: tokens.slice(0, 6),
    emptyMessage: "Nothing new overnight.",
  };
}

function buildWelcomePriority(workday, staff, roleId) {
  const greeting = `${timeGreeting()}, ${staffRecipientName(staff, roleId)}.`;
  const urgent = workday.urgentTasks || [];
  const today = workday.todayTasks || [];
  const hasWork = urgent.length > 0 || today.length > 0;

  if (!hasWork) {
    return {
      greeting,
      subline: "Clear day ahead.",
    };
  }

  if (urgent.length > 0) {
    return {
      greeting,
      subline: "Start with what can't wait.",
    };
  }

  return {
    greeting,
    subline: "Here's what needs you first.",
  };
}

function buildV3WorkTasks(priorities, patientsAttention, opportunities, briefSections) {
  const urgentTasks = [];
  const todayTasks = [];
  const seen = new Set();

  function push(task, bucket) {
    if (seen.has(task.id)) return;
    seen.add(task.id);
    bucket.push(task);
  }

  const emergent = briefSections.find((s) => s.id === "emergent_followups");
  const overnight = briefSections.find((s) => s.id === "overnight_calls");
  const overnightItem = overnight?.items?.find((i) =>
    /urgent|emergency|callback/i.test(i.summary + (i.detail || ""))
  ) || overnight?.items?.[0];

  if (overnightItem || emergent?.items?.length) {
    const detail = overnightItem?.detail || emergent?.items?.[0]?.detail || "";
    const timeMatch = detail.match(/\d{1,2}:\d{2}\s*(AM|PM|am|pm)?/) || ["10:47 PM"];
    push(
      toWorkTask({
        id: "urgent-overnight-emergency",
        label: "Possible dental infection",
        instruction: overnightCallerInstruction(),
        priority: "critical",
        category: "emergency",
        status: "needs-action",
        recommendedNextStep: "Call before first patient.",
        actionLabel: "Start callback",
        actionId: "view-summary",
        panel: "view-summary",
        callSummary: buildCallSummaryForEmergency(),
      }),
      urgentTasks
    );
  }

  push(
    toWorkTask({
      id: "overnight-crown-off",
      label: "Temp crown off",
      instruction: "Robert Chen — #19 came off overnight.",
      priority: "high",
      category: "callback",
      status: "needs-action",
      recommendedNextStep: "Confirm early seat or keep schedule.",
      actionLabel: "Open",
      actionId: "view-summary",
      panel: "view-summary",
      callSummary: buildCallSummaryForCrownOff(),
    }),
    urgentTasks
  );

  for (const patient of patientsAttention) {
    if (patient.name === "Overnight caller") continue;

    if (/verify|benefits|insurance|delta|ppo/i.test(patient.issue + patient.action)) {
      const timeMatch = (patient.issue + " " + patient.action).match(/\d{1,2}:\d{2}/);
      const crownTime = timeMatch ? timeMatch[0] : "10:00";
      push(
        toWorkTask({
          id: patient.id,
          label: "Benefits not verified",
          instruction: `${patient.name} — crown at ${crownTime}.`,
          priority: "high",
          status: "needs-action",
          recommendedNextStep: `Verify before ${crownTime}.`,
          actionLabel: "Verify benefits",
          actionId: "verify-insurance",
          panel: "verify-insurance",
          insurancePanel: buildInsurancePanelForPatient(patient.name),
        }),
        urgentTasks
      );
      continue;
    }
  }

  for (const rec of priorities) {
    if (rec.category === "emergency" || seen.has("urgent-overnight-emergency")) continue;
    if (rec.priority === "critical" || rec.priority === "high") {
      push(
        toWorkTask({
          id: rec.id,
          label: rec.category === "emergency" ? "Overnight emergency" : "Needs attention",
          instruction: humanizeInstruction(rec.action || rec.recommendation),
          priority: rec.priority,
          category: rec.category,
        }),
        urgentTasks
      );
    }
  }

  const newPatients = briefSections.find((s) => s.id === "new_patients_today");
  if (newPatients?.items?.length) {
    const item = newPatients.items[0];
    const timeMatch = item.summary.match(/\d{1,2}:\d{2}/);
    const time = timeMatch ? timeMatch[0] : "2:00";
    push(
      toWorkTask({
        id: `today-npe-${item.id}`,
        label: "New patient exam",
        instruction: `${time} — finish intake before arrival.`,
        priority: "medium",
        status: "waiting",
        actionLabel: "Open",
        actionHref: "#calls",
        actionId: "view-summary",
        panel: "view-summary",
        callSummary: buildCallSummaryForNewPatient(),
      }),
      todayTasks
    );
  }

  for (const opp of opportunities) {
    if (
      (opp.type === "emergency" || /emerg|overnight/i.test(opp.id || "")) &&
      seen.has("urgent-overnight-emergency")
    ) {
      continue;
    }

    if (opp.type === "cancellation_recovery") {
      push(
        toWorkTask({
          id: opp.id,
          label: "Open hygiene chair",
          instruction: "11:00 — short-call waitlist.",
          priority: "medium",
          status: "ready",
          actionLabel: "Call candidates",
          actionHref: "#patients",
          actionId: "schedule-appt",
        }),
        todayTasks
      );
      continue;
    }

    if (opp.type === "emergency") continue;

    if (opp.type === "patient") {
      if (todayTasks.some((t) => /new patient/i.test(t.label))) continue;
      push(
        toWorkTask({
          id: opp.id,
          label: "New patient today",
          instruction: "Verify before arrival.",
          priority: "medium",
          actionLabel: "Open",
          actionHref: "#calls",
          actionId: "view-summary",
        }),
        todayTasks
      );
      continue;
    }

    const instruction = humanizeInstruction(opp.action || opp.title);
    if (!instruction) continue;

    push(
      toWorkTask({
        id: opp.id,
        label: opp.title?.slice(0, 48) || "This morning",
        instruction,
        priority: "medium",
        category: opp.type,
      }),
      todayTasks
    );
  }

  for (const rec of priorities) {
    if (rec.priority === "critical" || rec.priority === "high") continue;
    if (/verify|insurance|benefits/i.test(rec.action)) continue;
    if (/emergency|overnight|callback/i.test(rec.action)) continue;
    push(
      toWorkTask({
        id: rec.id,
        label: "This morning",
        instruction: humanizeInstruction(rec.action || rec.recommendation),
        priority: rec.priority,
        category: rec.category,
      }),
      todayTasks
    );
  }

  return {
    urgentTasks: sortByPriority(urgentTasks).slice(0, 3),
    todayTasks: sortByPriority(todayTasks).slice(0, 4),
  };
}

function humanizeInstruction(raw) {
  if (!raw) return "";
  return raw
    .replace(/requires on-call callback within \d+ min SLA/gi, "Call back before 8:30")
    .replace(/Callback and schedule same-day emergency eval for overnight urgent call[^.]*/gi, "Schedule a same-day eval if appropriate")
    .replace(/Verify insurance benefits before NPE arrival[^.]*/gi, "Verify benefits before the new patient arrives")
    .replace(/Verify Delta PPO benefits before crown seat/gi, "Verify Delta PPO before the crown seat")
    .replace(/Complete verification and prep before the patient arrives/gi, "Finish verification before arrival")
    .replace(/Offer the cancelled hygiene slot to the waitlist/gi, "Offer the open slot to the waitlist")
    .replace(/Contact waitlist candidates for[^.]*/gi, "Offer the open slot to the waitlist")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDisplayTime(time) {
  if (!time) return null;
  const cleaned = time.replace(/^~/, "").trim();
  if (/AM|PM/i.test(cleaned)) return cleaned.replace(/\s+/g, " ");
  if (/^\d{1,2}:\d{2}$/.test(cleaned)) return formatScheduleTime(cleaned);
  return cleaned;
}

function buildHeadsUp(_patientsAttention, briefSections, _opportunities) {
  const items = [];
  const seen = new Set();

  function add(time, text, key) {
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ time: normalizeDisplayTime(time), text });
  }

  const alerts = briefSections.find((s) => s.id === "alerts");
  if (alerts?.items?.length) {
    for (const item of alerts.items) {
      const summary = item.summary || "";
      if (/rep|sales|patterson|vendor/i.test(summary)) {
        const timeMatch = summary.match(/\d{1,2}:\d{2}/);
        add(
          timeMatch ? timeMatch[0] : "11:30",
          "Patterson representative arriving",
          `heads-alert-${item.id}`
        );
      } else if (/lab/i.test(summary)) {
        add(null, "Lab pickup today", `heads-lab-${item.id}`);
      } else if (/maintenance|equipment/i.test(summary)) {
        const timeMatch = summary.match(/\d{1,2}:\d{2}/);
        add(
          timeMatch ? timeMatch[0] : "2:00",
          summary.slice(0, 55) || "Equipment maintenance this afternoon",
          `heads-maint-${item.id}`
        );
      }
    }
  }

  if (!seen.has("heads-patterson-default")) {
    add("11:30", "Patterson representative arriving", "heads-patterson-default");
  }
  if (!seen.has("heads-lab-default")) {
    add(null, "Lab pickup today", "heads-lab-default");
  }
  if (!seen.has("heads-maint-default")) {
    add("2:00", "Equipment maintenance in operatory 3", "heads-maint-default");
  }

  return items.slice(0, 4);
}

function buildReceptionistV3(roleConfig, brainResult, memory, partialView, staff) {
  const { morningBrief, opportunities } = brainResult;
  const roleOpportunities = buildOpportunities(opportunities, roleConfig);
  const patientsAttention = buildPatients(memory, roleConfig, morningBrief.sections);
  const priorities = buildPriorities(morningBrief.topRecommendations, roleConfig);

  const workday = buildV3WorkTasks(
    priorities,
    patientsAttention,
    roleOpportunities,
    morningBrief.sections
  );
  const attentionCards = buildAttentionCards(
    workday.urgentTasks,
    morningBrief.sections,
    priorities
  );
  const welcome = buildWelcomePriority(workday, staff, roleConfig.id);
  const headsUp = buildHeadsUp(patientsAttention, morningBrief.sections, roleOpportunities);
  const scheduleGaps = buildScheduleGaps(roleOpportunities, staff);

  return {
    welcome,
    attentionCards,
    urgentTasks: workday.urgentTasks,
    todayTasks: workday.todayTasks,
    scheduleGaps,
    headsUp,
  };
}

function taskActionFor(item) {
  const action = (
    item.action ||
    item.recommendation ||
    item.issue ||
    item.title ||
    ""
  ).toLowerCase();
  const category = item.category || "";

  if (category === "emergency" || /callback|urgent|overnight call|emergency/.test(action)) {
    return { actionLabel: "Start callback", actionHref: "#calls", actionId: "start-callback" };
  }
  if (/verify|benefits|insurance|delta|ppo|medicaid|hkd/.test(action)) {
    return { actionLabel: "Verify insurance", actionHref: "#patients", actionId: "verify-insurance" };
  }
  if (/schedule|reschedule|cancel|waitlist|squeeze|appointment request/.test(action)) {
    return { actionLabel: "Schedule patient", actionHref: "#patients", actionId: "schedule-patient" };
  }
  if (/call summary|overnight|intake|message/.test(action)) {
    return { actionLabel: "Review call", actionHref: "#calls", actionId: "review-call" };
  }
  return { actionLabel: "View summary", actionHref: "#calls", actionId: "view-summary" };
}

function toReceptionistTask(item, context) {
  const actionMeta = taskActionFor(item);
  return {
    id: item.id,
    action: humanizeTaskAction(item),
    context: context || item.context || undefined,
    priority: item.priority || "medium",
    reason: item.reason,
    category: item.category,
    actionLabel: item.actionLabel || actionMeta.actionLabel,
    actionHref: item.actionHref || actionMeta.actionHref,
    actionId: item.actionId || actionMeta.actionId,
  };
}

function humanizeTaskAction(item) {
  const raw = item.action || item.recommendation || item.issue || item.title || "";
  return raw
    .replace(/requires on-call callback within \d+ min SLA/i, "needs a callback before 8:30")
    .replace(/Callback and schedule same-day emergency eval for overnight urgent call/i, "Call back the overnight urgent patient and schedule a same-day eval")
    .replace(/Verify insurance benefits before NPE arrival.*/i, "Verify benefits before the new patient arrives")
    .replace(/Verify Delta PPO benefits before crown seat/i, "Verify Delta PPO benefits before the crown seat");
}

function buildSinceLastLogin(briefSections, opportunities) {
  const items = [];
  const seen = new Set();

  function add(id, text, detail) {
    if (seen.has(id)) return;
    seen.add(id);
    items.push({ id, text, detail });
  }

  const overnight = briefSections.find((s) => s.id === "overnight_calls");
  if (overnight?.items?.length) {
    const needsCallback = overnight.items.filter((i) => /urgent|callback|emergency/i.test(i.summary)).length;
    const total = overnight.items.length;
    if (needsCallback > 0) {
      add(
        "since-overnight",
        total === 1
          ? "One overnight call handled — needs a callback"
          : `${total} overnight calls handled — ${needsCallback} need${needsCallback === 1 ? "s" : ""} a callback`,
        overnight.items[0].detail
      );
    } else {
      add(
        "since-overnight",
        total === 1 ? "One overnight call handled" : `${total} overnight calls handled`,
        overnight.items[0].detail
      );
    }
  }

  const cancellations = briefSections.find((s) => s.id === "waitlist_cancellations");
  if (cancellations?.items?.length) {
    for (const item of cancellations.items.slice(0, 2)) {
      add(`since-cancel-${item.id}`, item.summary, item.detail);
    }
  }

  const newPatients = briefSections.find((s) => s.id === "new_patients_today");
  if (newPatients?.items?.length) {
    for (const item of newPatients.items.slice(0, 2)) {
      add(`since-npe-${item.id}`, item.summary, item.detail);
    }
  }

  const schedule = briefSections.find((s) => s.id === "schedule_snapshot");
  if (schedule?.items?.length) {
    const change = schedule.items.find((i) => /cancel|change|moved|added/i.test(i.summary));
    if (change) add(`since-sched-${change.id}`, change.summary, change.detail);
  }

  const waitlistOpp = opportunities.find((o) => o.type === "cancellation_recovery");
  if (waitlistOpp && !seen.has("since-waitlist")) {
    add("since-waitlist", "An open hygiene slot can go to the waitlist", waitlistOpp.description);
  }

  return items.slice(0, 5);
}

function buildReceptionistWorkday(priorities, patientsAttention, opportunities, briefSections) {
  const urgentTasks = [];
  const todaysTasks = [];
  const seen = new Set();

  function pushTask(task, bucket) {
    if (seen.has(task.id)) return;
    seen.add(task.id);
    bucket.push(task);
  }

  for (const rec of priorities) {
    const task = toReceptionistTask(rec, rec.category === "emergency" ? "Overnight caller · callback SLA applies" : undefined);
    if (rec.priority === "critical" || rec.priority === "high") {
      pushTask(task, urgentTasks);
    } else {
      pushTask(task, todaysTasks);
    }
  }

  for (const patient of patientsAttention) {
    if (patient.name === "Overnight caller") continue;
    const contextParts = [patient.name];
    if (/crown|10:00|2:00|\d{1,2}:\d{2}/i.test(patient.issue + patient.action)) {
      const timeMatch = (patient.issue + " " + patient.action).match(/\d{1,2}:\d{2}/);
      if (timeMatch) contextParts.push(timeMatch[0]);
    }
    const task = toReceptionistTask(
      {
        id: patient.id,
        action: patient.action !== patient.issue ? patient.action : patient.issue,
        issue: patient.issue,
        priority: patient.priority,
        reason: patient.reason,
      },
      contextParts.join(" · ")
    );
    if (/verify|benefits|insurance|delta|ppo/i.test(patient.issue + patient.action)) {
      task.actionLabel = "Verify insurance";
      task.actionHref = "#patients";
      task.actionId = "verify-insurance";
    }
    if (patient.priority === "critical" || patient.priority === "high") {
      pushTask(task, urgentTasks);
    } else {
      pushTask(task, todaysTasks);
    }
  }

  for (const opp of opportunities) {
    if (opp.type === "cancellation_recovery") continue;
    const task = toReceptionistTask(
      {
        id: opp.id,
        action: opp.action,
        title: opp.title,
        priority: opp.type === "emergency" ? "high" : "medium",
        reason: opp.reason,
        category: opp.type,
      },
      opp.description
    );
    pushTask(task, todaysTasks);
  }

  const reschedule = briefSections
    .flatMap((s) => s.items || [])
    .find((i) => /reschedule|appointment request/i.test(i.summary));
  if (reschedule) {
    pushTask(
      toReceptionistTask(
        {
          id: reschedule.id,
          action: reschedule.summary,
          priority: "medium",
          reason: reschedule.detail,
        },
        reschedule.detail
      ),
      todaysTasks
    );
  }

  return {
    urgentTasks: sortByPriority(urgentTasks).slice(0, 4),
    todaysTasks: sortByPriority(todaysTasks).slice(0, 6),
  };
}

function buildComingUp(opportunities, patientsAttention, briefSections) {
  const items = [];

  for (const patient of patientsAttention) {
    if (patient.name === "Overnight caller" || patient.name === "New patient today") {
      const timeMatch = (patient.issue + " " + patient.action).match(/\d{1,2}:\d{2}/);
      items.push({
        id: `upcoming-${patient.id}`,
        action: patient.name === "New patient today" ? "New patient arriving today" : patient.issue,
        context: timeMatch ? `Arrives ${timeMatch[0]}` : patient.action,
        actionLabel: patient.name === "New patient today" ? "Open patient" : undefined,
        actionHref: patient.name === "New patient today" ? "#patients" : undefined,
      });
    } else if (/crown|seat|10:00|11:00|2:00/i.test(patient.issue + patient.name)) {
      items.push({
        id: `upcoming-${patient.id}`,
        action: `${patient.name} — ${patient.issue.replace(/Verify /i, "").slice(0, 60)}`,
        context: "On today's schedule",
      });
    }
  }

  const cancelOpp = opportunities.find((o) => o.type === "cancellation_recovery");
  if (cancelOpp) {
    items.push({
      id: `upcoming-${cancelOpp.id}`,
      action: "Offer the open hygiene slot to the waitlist",
      context: cancelOpp.description,
      actionLabel: "Offer slot",
      actionHref: "#opportunities",
      actionId: "offer-waitlist",
    });
  }

  const squeeze = briefSections.find((s) => s.id === "squeeze_in_capacity");
  if (squeeze?.items?.length) {
    items.push({
      id: `upcoming-${squeeze.items[0].id}`,
      action: squeeze.items[0].summary,
      context: squeeze.items[0].detail,
    });
  }

  return items.slice(0, 4);
}

function buildReminders(briefSections, stewardshipNote) {
  const reminders = [];

  const alerts = briefSections.find((s) => s.id === "alerts");
  if (alerts?.items?.length) {
    for (const item of alerts.items.slice(0, 2)) {
      reminders.push({ id: item.id, text: item.summary });
    }
  }

  if (stewardshipNote && !/completeness|utilization|avg|%/i.test(stewardshipNote)) {
    reminders.push({ id: "rem-stewardship", text: stewardshipNote });
  }

  reminders.push({
    id: "rem-insurance-taxonomy",
    text: "Remember: Delta PPO, Delta Medicaid, and HKD are different plans — classify to program level.",
  });

  return reminders.slice(0, 4);
}

function buildReceptionistMorningSummary(roleConfig, workday, sinceLastLogin) {
  const greeting = `${timeGreeting()}, ${roleConfig.recipientName}.`;
  const urgentCount = workday.urgentTasks.length;
  const sinceCount = sinceLastLogin.length;

  if (urgentCount === 0 && workday.todaysTasks.length === 0) {
    return {
      greeting,
      body: "Everything looks ready. You're in good shape today.",
      signoff: "I've already looked over the schedule — nothing needs your attention right away.",
    };
  }

  const bodyParts = [];
  if (urgentCount > 0) {
    const first = workday.urgentTasks[0];
    if (/callback|overnight|urgent|emergency/i.test(first.action)) {
      bodyParts.push("One overnight call needs a callback before the morning rush.");
    } else {
      bodyParts.push(
        urgentCount === 1
          ? "One item needs your attention before patients arrive."
          : `${urgentCount} items need your attention before patients arrive.`
      );
    }
  } else {
    bodyParts.push("Today looks well prepared.");
  }

  if (sinceCount > 0 && sinceLastLogin[0] && urgentCount === 0) {
    bodyParts.push(sinceLastLogin[0].text.charAt(0).toLowerCase() + sinceLastLogin[0].text.slice(1) + ".");
  }

  return {
    greeting,
    body: bodyParts.join(" "),
    signoff: "I've already looked over overnight activity — here's what I'd focus on.",
  };
}

function formatScheduleTime(time24) {
  if (!time24) return "";
  const parts = time24.split(":");
  const hour = parseInt(parts[0], 10);
  const minute = parts[1] || "00";
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${suffix}`;
}

function pluralLine(count, singular, plural) {
  if (count <= 0) return null;
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

function buildDoctorDaySchedule(_staff) {
  return [
    { time: "7:45 AM", procedure: "Morning Brief / Team Huddle", isBlock: true },
    { time: "8:00 AM", patientName: "Finn Leo", procedure: "Limited Emergency Exam" },
    { time: "8:30 AM", patientName: "Sarah Mitchell", procedure: "New Patient Exam" },
    { time: "9:30 AM", patientName: "John Adams", procedure: "Crown Preparation #30" },
    { time: "10:30 AM", patientName: "Emily Davis", procedure: "Extraction #17" },
    { time: "12:00 PM", procedure: "Lunch", isBlock: true },
    { time: "1:00 PM", patientName: "Michael Chen", procedure: "Delivery Crown #14" },
    { time: "2:00 PM", patientName: "Emma Nguyen", procedure: "Hygiene Check" },
    { time: "3:00 PM", patientName: "Robert Chen", procedure: "Composite #19" },
    { time: "4:00 PM", patientName: "—", procedure: "Emergency Appointment", isOpen: true },
    { time: "5:00 PM", procedure: "Day Complete", isBlock: true },
  ];
}

function buildDoctorClinicalPriorities(memory) {
  const priorities = [];

  function addPriority(label, detail) {
    priorities.push({ number: priorities.length + 1, label, detail });
  }

  addPriority(
    "Possible dental infection",
    "Finn Leo — review before 8:00 limited exam."
  );

  const sarah = memory.patients.find((p) => p.identity.lastName === "Mitchell");
  if (sarah) {
    addPriority(
      "Crown seat — cold sensitivity",
      `${patientDisplayName(sarah)} #14 — review before seat.`
    );
  }

  const robert = memory.patients.find((p) => p.identity.lastName === "Chen");
  if (robert) {
    addPriority(
      "Temp crown off",
      `${patientDisplayName(robert)} #19 — check site at 3:00.`
    );
  }

  const emma = memory.patients.find((p) => p.identity.lastName === "Nguyen");
  if (emma) {
    addPriority(
      "Patient ready for treatment discussion",
      `${patientDisplayName(emma)} — overdue recall at hygiene check.`
    );
  }

  return priorities.slice(0, 5);
}

function buildDoctorTasks() {
  return [
    {
      id: "doc-task-abx",
      label: "Call in antibiotic",
      detail: "Finn Leo — Amoxicillin 500mg on file.",
      priority: "high",
    },
    {
      id: "doc-task-path",
      label: "Pathology report ready",
      detail: "Biopsy #4521 — uploaded overnight.",
      priority: "medium",
    },
    {
      id: "doc-task-ref",
      label: "Referral letter unsigned",
      detail: "Emily Davis — oral surgery follow-up.",
      priority: "medium",
    },
    {
      id: "doc-task-cbct",
      label: "CBCT before implant consult",
      detail: "Michael Chen — later this week.",
      priority: "low",
    },
  ];
}

function buildDoctorWelcome(staff, roleId, priorityCount) {
  const greeting = `${timeGreeting()}, ${staffRecipientName(staff, roleId)}.`;
  let subline = "Here's your clinical day at a glance.";

  if (priorityCount >= 2) {
    const phrase = patientCountPhrase(priorityCount);
    if (phrase) {
      subline = `Full clinical day. ${phrase.charAt(0).toUpperCase() + phrase.slice(1)}.`;
    }
  } else if (priorityCount === 1) {
    subline = "Full clinical day. One patient needs extra attention.";
  }

  return { greeting, subline };
}

function buildDoctorClinicalBrief(brainResult, memory, staff) {
  const clinicalPriorities = buildDoctorClinicalPriorities(memory);
  const schedule = buildDoctorDaySchedule(staff);
  const todaysTasks = buildDoctorTasks();
  const welcome = buildDoctorWelcome(staff, "dentist", clinicalPriorities.length);

  return {
    welcome,
    schedule,
    clinicalPriorities,
    todaysTasks,
  };
}

function buildQuickActions(roleConfig, priorities) {
  if (roleConfig.id === "dentist") {
    return [
      { id: "review-schedule", label: "Review schedule" },
      { id: "lab-cases", label: "Check lab cases" },
      { id: "morning-brief", label: "Full brief", href: "#morning-brief" },
    ];
  }

  const hasEmergency = priorities.some((p) => p.category === "emergency");
  const actions = [];
  if (hasEmergency) {
    actions.push({ id: "callback-sla", label: "Start emergency callback" });
  }
  actions.push(
    { id: "waitlist", label: "Offer waitlist slot" },
    { id: "verify-insurance", label: "Verify NPE insurance" },
    { id: "morning-brief", label: "Full brief", href: "#morning-brief" }
  );
  return actions.slice(0, 4);
}

function buildRoleView(roleConfig, brainResult, memorySummary, memory, staffSettings) {
  const { morningBrief, opportunities } = brainResult;

  if (roleConfig.id === "dentist") {
    const clinical = buildDoctorClinicalBrief(brainResult, memory, staffSettings);
    return {
      recipientName: staffRecipientName(staffSettings, "dentist"),
      label:
        staffSettings.doctors.find((d) => d.id === staffSettings.defaultDoctorId)?.displayName ||
        roleConfig.label,
      ...clinical,
    };
  }

  const priorities = buildPriorities(morningBrief.topRecommendations, roleConfig);
  const patientsAttention = buildPatients(memory, roleConfig, morningBrief.sections);
  const roleOpportunities = buildOpportunities(opportunities, roleConfig);
  const partialView = {
    priorities,
    patientsAttention,
    opportunities: roleOpportunities,
  };
  const v3 = buildReceptionistV3(roleConfig, brainResult, memory, partialView, staffSettings);

  return {
    recipientName: staffRecipientName(staffSettings, "front_desk"),
    label: staffSettings.receptionists.find((r) => r.id === staffSettings.defaultReceptionistId)
      ?.displayName || "Receptionist",
    welcome: v3.welcome,
    attentionCards: v3.attentionCards,
    urgentTasks: v3.urgentTasks,
    todayTasks: v3.todayTasks,
    scheduleGaps: v3.scheduleGaps,
    headsUp: v3.headsUp,
    decisionCards: [],
    priorities,
    patientsAttention,
    opportunities: roleOpportunities,
  };
}

/**
 * Run competing intelligence recommendations through Decision Arbitration.
 * Surfaces one primary card; keeps the rest available (wait / escalate / merge).
 */
async function buildArbitratedDecisionCards() {
  const {
    PracticeImprovementEngine,
    buildDemoPhoneRecoveryEvent,
    buildDemoScheduleOpeningEvent,
  } = await import("../src/practice-improvement/index.ts");

  const engine = new PracticeImprovementEngine();
  const { arbitration } = engine.processAndArbitrate(
    [buildDemoPhoneRecoveryEvent(), buildDemoScheduleOpeningEvent()],
    {
      practiceId: "practice_cascade_family_gr",
      now: new Date().toISOString(),
      maxSurface: 1,
    }
  );

  function toCard(item, extras = {}) {
    const card = item.projection;
    if (!card) return null;
    const kind =
      item.result.situation?.kind ||
      (item.result.domain === "phone"
        ? "recoverable_phone_opportunity"
        : item.result.domain === "operating"
          ? "recoverable_schedule_opportunity"
          : "improvement_recommendation");
    return {
      id: card.recommendationId,
      kind,
      situation: card.situation,
      recommendation: card.recommendation,
      primaryAction: card.primaryAction,
      subject: card.subject,
      stake: card.stake,
      whyText: card.whyText,
      accent: card.accent,
      group: card.group,
      recommendationId: card.recommendationId,
      practiceId: card.practiceId,
      dedupeKey: card.dedupeKey,
      priority: card.priority,
      evidence: card.evidence,
      disposition: item.result.disposition,
      arbitration: item.disposition,
      arbitrationReason: item.reason,
      rank: item.rank,
      outcomeStatuses: ["accepted", "snoozed", "dismissed", "completed"],
      ...extras,
    };
  }

  const decisionCards = arbitration.surface
    .map((item) => toCard(item))
    .filter(Boolean);

  const waitingDecisions = [...arbitration.waiting, ...arbitration.escalated]
    .map((item) => toCard(item, { available: true }))
    .filter(Boolean);

  return {
    decisionCards,
    waitingDecisions,
    arbitrationSummary: {
      primaryId: arbitration.primary?.result.recommendation?.id || null,
      surfaced: arbitration.surface.length,
      waiting: arbitration.waiting.length,
      escalated: arbitration.escalated.length,
      merged: arbitration.merged.length,
      suppressed: arbitration.suppressed.length,
      expired: arbitration.expired.length,
    },
  };
}

async function main() {
  const { PracticeBrain, MOCK_PRACTICE_ID } = await import("../src/practice-brain/index.ts");
  const { createMockPracticeMemory, generateMorningMemorySummary } = await import(
    "../src/practice-memory/index.ts"
  );

  const brain = new PracticeBrain(MOCK_PRACTICE_ID);
  const brainResult = brain.runDailyCycle();
  const memory = createMockPracticeMemory();
  const memorySummary = generateMorningMemorySummary(memory);
  const staffSettings = loadStaffSettings();
  const { decisionCards, waitingDecisions, arbitrationSummary } =
    await buildArbitratedDecisionCards();

  const roles = {};
  for (const roleId of Object.keys(ROLE_CONFIG)) {
    roles[roleId] = buildRoleView(
      ROLE_CONFIG[roleId],
      brainResult,
      memorySummary,
      memory,
      staffSettings
    );
  }

  if (roles.front_desk) {
    roles.front_desk.decisionCards = decisionCards;
    roles.front_desk.waitingDecisions = waitingDecisions;
    roles.front_desk.arbitrationSummary = arbitrationSummary;
    // Prefer the named recovery over a generic open-chair gap label.
    if (
      decisionCards.some((c) => c.kind === "recoverable_schedule_opportunity") ||
      waitingDecisions.some((c) => c.kind === "recoverable_schedule_opportunity")
    ) {
      roles.front_desk.scheduleGaps = [
        {
          id: "gap-rso-1030",
          label: "Doctor opening",
          time: "10:30 AM",
          status: "available",
          detail: "Offer to Maria Lopez — unscheduled crown",
        },
      ];
    }
  }

  const preview = {
    previewMode: true,
    generatedAt: new Date().toISOString(),
    practiceName: brainResult.morningBrief.practiceName,
    date: brainResult.morningBrief.date,
    staffSettings,
    stewardshipNote: brainResult.morningBrief.stewardshipNote,
    memorySummary: {
      openTaskCount: memorySummary.openTaskCount,
      unresolvedIssueCount: memorySummary.unresolvedIssueCount,
      opportunityCount: memorySummary.opportunityCount,
    },
    roles,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(preview, null, 2) + "\n", "utf8");

  console.error(`Today preview written to ${outputPath}`);
  for (const roleId of Object.keys(roles)) {
    const view = roles[roleId];
    if (roleId === "front_desk") {
      console.error(
        `  ${roleId}: ${view.urgentTasks?.length ?? 0} urgent, ${view.todayTasks?.length ?? 0} today, ${view.attentionCards?.length ?? 0} attention cards, ${view.decisionCards?.length ?? 0} decision cards (primary), ${view.waitingDecisions?.length ?? 0} waiting`
      );
    } else {
      console.error(
        `  ${roleId}: ${view.schedule?.length ?? 0} schedule slots, ${view.todaysTasks?.length ?? 0} tasks, ${view.clinicalPriorities?.length ?? 0} priorities`
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
