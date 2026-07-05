#!/usr/bin/env node
"use strict";

/**
 * Generates static My Day preview JSON for the dashboard.
 * Composes Practice Brain daily cycle + Practice Memory morning summary.
 *
 * Usage: node scripts/generate-my-day-preview.js
 * Output: data/my-day-preview.json
 */

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const outputPath = path.join(repoRoot, "data/my-day-preview.json");

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

function buildRoleView(roleConfig, brainResult, memorySummary, memory) {
  const { morningBrief, opportunities, metrics } = brainResult;

  const priorities = buildPriorities(morningBrief.topRecommendations, roleConfig);
  const patientsAttention = buildPatients(
    memory,
    roleConfig,
    morningBrief.sections
  );
  const roleOpportunities = buildOpportunities(opportunities, roleConfig);
  const insight = pickInsight(metrics, roleConfig.insightDepartment, morningBrief.stewardshipNote);
  const quickActions = buildQuickActions(roleConfig, priorities);

  const partialView = {
    priorities,
    patientsAttention,
    opportunities: roleOpportunities,
  };

  const base = {
    recipientName: roleConfig.recipientName,
    label: roleConfig.label,
    morningSummary: buildMorningSummary(roleConfig, partialView),
    priorities,
    patientsAttention,
    opportunities: roleOpportunities,
    insight,
    quickActions,
    todaysFocus: buildTodaysFocus(partialView, roleConfig),
  };

  if (roleConfig.id !== "front_desk") {
    return base;
  }

  const sinceLastLogin = buildSinceLastLogin(morningBrief.sections, roleOpportunities);
  const workday = buildReceptionistWorkday(
    priorities,
    patientsAttention,
    roleOpportunities,
    morningBrief.sections
  );
  const comingUp = buildComingUp(roleOpportunities, patientsAttention, morningBrief.sections);
  const reminders = buildReminders(morningBrief.sections, morningBrief.stewardshipNote);

  const receptionistPartial = {
    urgentTasks: workday.urgentTasks,
    todaysTasks: workday.todaysTasks,
    patientsAttention,
    priorities,
  };

  return {
    ...base,
    morningSummary: buildReceptionistMorningSummary(roleConfig, workday, sinceLastLogin),
    sinceLastLogin,
    urgentTasks: workday.urgentTasks,
    todaysTasks: workday.todaysTasks,
    comingUp,
    reminders,
    todaysFocus: buildTodaysFocus(receptionistPartial, roleConfig),
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

  const roles = {};
  for (const roleId of Object.keys(ROLE_CONFIG)) {
    roles[roleId] = buildRoleView(ROLE_CONFIG[roleId], brainResult, memorySummary, memory);
  }

  const preview = {
    previewMode: true,
    generatedAt: new Date().toISOString(),
    practiceName: brainResult.morningBrief.practiceName,
    date: brainResult.morningBrief.date,
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

  console.error(`My Day preview written to ${outputPath}`);
  for (const roleId of Object.keys(roles)) {
    const view = roles[roleId];
    if (roleId === "front_desk") {
      console.error(
        `  ${roleId}: ${view.urgentTasks?.length ?? 0} urgent, ${view.todaysTasks?.length ?? 0} today, ${view.comingUp?.length ?? 0} coming up`
      );
    } else {
      console.error(
        `  ${roleId}: ${view.priorities.length} priorities, ${view.patientsAttention.length} patients, ${view.opportunities.length} opportunities`
      );
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
