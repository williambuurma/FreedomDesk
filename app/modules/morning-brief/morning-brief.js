/**
 * Morning Brief — practice-wide opening handshake.
 * Answers one question: "What do I need to know before my day starts?"
 * Curates Practice Brain preview JSON; mock data only.
 */
(function () {
  "use strict";

  var PREVIEW_URL = "../data/morning-brief-preview.json";

  var OWNER_LABELS = {
    front_desk: "Front desk",
    dentist: "Doctor",
    office_manager: "Office manager",
    hygiene_coordinator: "Hygiene",
    assistant: "Assistant",
    freedomdesk_ops: "FreedomDesk",
  };

  /** Max items per curated section — protect attention. */
  var LIMITS = {
    beforeOpen: 4,
    scheduleRisks: 4,
    patientPrep: 3,
    todayMoves: 3,
  };

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatDate(isoDate) {
    try {
      var parts = isoDate.split("-");
      var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    } catch (_e) {
      return isoDate;
    }
  }

  function formatDateTime(iso) {
    try {
      return new Date(iso).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch (_e) {
      return iso;
    }
  }

  function ownerLabel(role) {
    if (!role) return "";
    return OWNER_LABELS[role] || role.replace(/_/g, " ");
  }

  function findSection(sections, id) {
    if (!sections) return null;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].id === id) return sections[i];
    }
    return null;
  }

  function sectionItems(sections, id) {
    var section = findSection(sections, id);
    return section && section.items ? section.items.slice() : [];
  }

  /** Prefer action-required, then higher confidence. */
  function rankItems(items) {
    return items.slice().sort(function (a, b) {
      var aAction = a.actionRequired ? 0 : 1;
      var bAction = b.actionRequired ? 0 : 1;
      if (aAction !== bAction) return aAction - bAction;
      return (b.confidence || 0) - (a.confidence || 0);
    });
  }

  function dedupeBySummary(items) {
    var seen = {};
    var out = [];
    items.forEach(function (item) {
      var key = (item.summary || "").toLowerCase().replace(/\s+/g, " ").trim();
      if (!key || seen[key]) return;
      seen[key] = true;
      out.push(item);
    });
    return out;
  }

  function humanizeSummary(summary) {
    if (!summary) return "";
    var s = String(summary).trim();

    // Soften overnight / engine phrasing into office language
    s = s.replace(/^emergency\s*[—–-]\s*urgent\s*\(same-day flag\)/i, "Overnight emergency — same-day care needed");
    s = s.replace(/^new patient\s*[—–-]\s*routine/i, "Overnight new patient — exam requested");
    s = s.replace(
      /Overnight urgent call requires on-call callback within 30 min SLA/i,
      "Call back overnight emergency patient — within 30 minutes"
    );
    s = s.replace(
      /Callback and schedule same-day emergency eval for overnight urgent call[^.]*/i,
      "Schedule same-day emergency eval for overnight caller"
    );
    s = s.replace(
      /Confirm lab case status before crown seat[^.]*/i,
      "Confirm lab case before the 10:00 crown seat"
    );
    s = s.replace(/1 cancellation\(s\)\s*[—–-]\s*recovery pipeline active/i, "One cancellation still open — fill if you can");
    s = s.replace(/(\d+) cancellation\(s\)/i, "$1 cancellations");
    s = s.replace(/Verify insurance benefits before NPE arrival[^.]*/i, "Verify insurance before new patient arrives");
    s = s.replace(
      /Contact waitlist candidates for cancellation recovery[^.]*/i,
      "Fill today's cancelled hygiene opening from the waitlist"
    );
    s = s.replace(
      /Contact waitlist candidates for waitlist match[^.]*/i,
      "Offer the open hygiene slot to waitlist patients"
    );
    s = s.replace(/\bdelta_dental_ppo\b/gi, "Delta Dental PPO");
    s = s.replace(/\bhighAnxiety\b/gi, "high anxiety");
    s = s.replace(/\bprophy recall\b/gi, "Prophy recall");
    s = s.replace(/\bperio_maintenance\b/gi, "Perio maintenance");
    s = s.replace(/\bemergency_eval\b/gi, "emergency eval");
    s = s.replace(/\bnew_patient_exam\b/gi, "new patient exam");
    s = s.replace(/\bNPE\b/g, "new patient");
    s = s.replace(/\bOffice DNA\b/g, "office rules");
    s = s.replace(/\bSLA\b/g, "window");
    s = s.replace(/\bDNA\b/g, "office rules");
    return s;
  }

  function humanizeDetail(detail) {
    if (!detail) return "";
    var d = String(detail).trim();

    // Drop completeness / engine noise
    if (/^Appointment type:/i.test(d) && /Completeness:/i.test(d)) return "";
    if (/Risk flag detected in daily awareness/i.test(d)) {
      return "Needs front desk attention before patients arrive.";
    }
    if (/on-call callback SLA is 30 minutes/i.test(d)) {
      return "Intake is complete. Callback first, then schedule if appropriate.";
    }
    if (/Treatment-specific typing on call/i.test(d)) {
      return "Confirm the case is in before the patient sits down.";
    }
    if (/Constitution truth before efficiency/i.test(d)) {
      return "First impression depends on honest insurance handling and calm prep.";
    }
    if (/Emergency eval intake complete/i.test(d)) {
      return "Intake is ready — offer a same-day slot if it fits.";
    }
    if (/Cancellation recovery is highest-ROI/i.test(d)) {
      return "Fill the open hygiene slot while the opening is fresh.";
    }

    d = d.replace(/\bdelta_dental_ppo\b/gi, "Delta Dental PPO");
    d = d.replace(/\bEmotional flags:\s*highAnxiety\b/gi, "Note: high anxiety");
    d = d.replace(/\bfront_desk\b/gi, "front desk");
    d = d.replace(/\bInsurance:\s*/i, "Insurance: ");
    d = d.replace(/\bOffice DNA\b/g, "office rules");
    d = d.replace(/\bSLA\b/g, "window");
    d = d.replace(/\bDNA\b/g, "office rules");
    return d;
  }

  /** Collapse near-duplicate items that describe the same morning decision. */
  function topicKey(item) {
    var s = ((item && item.summary) || "").toLowerCase();
    if (/overnight|emergency|urgent call|same-day emergency|on-call callback/i.test(s)) {
      return "overnight_emergency";
    }
    if (/lab|crown seat/i.test(s)) return "lab_crown";
    if (/new patient|npe|08:30|insurance benefits/i.test(s)) return "new_patient_prep";
    if (/cancel/i.test(s)) return "cancellation";
    if (/prophy recall/i.test(s)) return "recall_prophy";
    if (/perio/i.test(s)) return "recall_perio";
    if (/waitlist/i.test(s)) return "waitlist";
    return s.replace(/\s+/g, " ").trim().slice(0, 48);
  }

  function actionScore(item) {
    var s = ((item && item.summary) || "").toLowerCase();
    var score = item.actionRequired ? 2 : 0;
    if (/callback|call back|schedule|verify|confirm|contact|offer|fill/i.test(s)) score += 3;
    if (/same-day care needed|emergency —/i.test(s) && !/callback|schedule/i.test(s)) score -= 1;
    score += (item.confidence || 0);
    return score;
  }

  function dedupeByTopic(items) {
    var best = {};
    var order = [];
    items.forEach(function (item) {
      var key = topicKey(item);
      if (!key) return;
      if (!best[key]) {
        best[key] = item;
        order.push(key);
        return;
      }
      if (actionScore(item) > actionScore(best[key])) {
        best[key] = item;
      }
    });
    return order.map(function (key) {
      return best[key];
    });
  }

  function isScheduleRisk(item) {
    if (!item || !item.summary) return false;
    var s = item.summary.toLowerCase();
    // Counts and capacity alone do not change morning decisions — risks do
    if (/appointments scheduled today/i.test(s)) return false;
    if (/open blocks available/i.test(s)) return false;
    return (
      item.actionRequired === true ||
      /cancel/i.test(s) ||
      /lab/i.test(s) ||
      /confirm/i.test(s) ||
      /risk/i.test(s) ||
      /conflict/i.test(s) ||
      /overbook/i.test(s)
    );
  }

  function isInsuranceOrPrepDetail(item) {
    if (!item) return false;
    var blob = ((item.summary || "") + " " + (item.detail || "")).toLowerCase();
    return (
      /insurance|verify|benefits|anxiety|emotional|new patient|npe/i.test(blob) ||
      item.actionRequired === true
    );
  }

  function buildBeforeOpen(data) {
    var emergency = sectionItems(data.sections, "emergent_followups");
    var overnight = sectionItems(data.sections, "overnight_calls").filter(function (item) {
      return item.actionRequired === true;
    });
    var alerts = sectionItems(data.sections, "alerts").filter(function (item) {
      return item.actionRequired === true;
    });

    return dedupeByTopic(emergency.concat(overnight).concat(alerts))
      .sort(function (a, b) {
        return actionScore(b) - actionScore(a);
      })
      .slice(0, LIMITS.beforeOpen);
  }

  function buildScheduleRisks(data) {
    var schedule = sectionItems(data.sections, "schedule_snapshot").filter(isScheduleRisk);
    var labs = sectionItems(data.sections, "squeeze_in_capacity").filter(function (item) {
      return /lab|crown seat|confirm/i.test(item.summary || "");
    });
    return dedupeByTopic(schedule.concat(labs)).slice(0, LIMITS.scheduleRisks);
  }

  function buildPatientPrep(data) {
    var patients = sectionItems(data.sections, "new_patients_today").filter(isInsuranceOrPrepDetail);
    var insuranceRecs = (data.topRecommendations || []).filter(function (rec) {
      return (
        rec.category === "patient_experience" ||
        /insurance|npe|new patient|anxiety/i.test(rec.recommendation || "")
      );
    });

    var fromRecs = insuranceRecs.map(function (rec) {
      return {
        id: rec.id,
        summary: rec.recommendation,
        detail: rec.reason,
        owner: rec.owner,
        actionRequired: rec.priority === "critical" || rec.priority === "high",
        confidence: rec.confidence,
      };
    });

    // Prefer the patient row (has time + insurance context) over the generic rec
    return dedupeByTopic(patients.concat(fromRecs)).slice(0, LIMITS.patientPrep);
  }

  function buildTodayMoves(data) {
    var waitlist = sectionItems(data.sections, "waitlist_cancellations");
    var recall = sectionItems(data.sections, "recall_opportunities");
    var squeeze = sectionItems(data.sections, "squeeze_in_capacity").filter(function (item) {
      return /waitlist|squeeze|open doctor|cancellation|fill/i.test(item.summary || "");
    });

    // High-impact opportunities only — exclude overnight emergencies already covered above
    var opps = (data.opportunities || [])
      .filter(function (opp) {
        if (/overnight|emergency|urgent/i.test(opp.title || "")) return false;
        return opp.estimatedImpact === "high" || opp.confidence >= 0.8;
      })
      .slice(0, 2)
      .map(function (opp) {
        return {
          id: opp.id,
          summary: opp.title,
          detail: opp.description,
          owner: opp.suggestedOwner,
          actionRequired: false,
          confidence: opp.confidence,
        };
      });

    var merged = waitlist.concat(recall).concat(squeeze).concat(opps).filter(function (item) {
      return topicKey(item) !== "overnight_emergency";
    });
    return dedupeByTopic(merged).slice(0, LIMITS.todayMoves);
  }

  function emptyState(message) {
    return '<p class="mb-empty">' + escapeHtml(message) + "</p>";
  }

  function renderItemList(items, options) {
    options = options || {};
    if (!items || items.length === 0) {
      return emptyState(options.emptyMessage || "Nothing flagged — you're clear.");
    }

    var html = '<ul class="mb-item-list">';
    items.forEach(function (item) {
      var summary = humanizeSummary(item.summary);
      var detail = humanizeDetail(item.detail);
      var urgent = item.actionRequired === true || options.forceUrgent === true;

      html +=
        '<li class="mb-item' +
        (urgent ? " mb-item-urgent" : "") +
        '">' +
        '<div class="mb-item-main">' +
        (urgent ? '<span class="mb-item-mark" aria-hidden="true"></span>' : "") +
        '<div class="mb-item-copy">' +
        '<p class="mb-item-summary">' +
        escapeHtml(summary) +
        "</p>" +
        (detail ? '<p class="mb-item-detail">' + escapeHtml(detail) + "</p>" : "") +
        "</div>" +
        "</div>" +
        (item.owner
          ? '<p class="mb-item-owner">' + escapeHtml(ownerLabel(item.owner)) + "</p>"
          : "") +
        "</li>";
    });
    html += "</ul>";
    return html;
  }

  function setSectionVisibility(sectionId, hasContent) {
    var el = $(sectionId);
    if (!el) return;
    // Keep "Before doors open" always visible — empty is a success state
    if (sectionId === "mbBeforeOpen") {
      el.hidden = false;
      return;
    }
    el.hidden = !hasContent;
  }

  function renderBeforeOpen(data) {
    var items = buildBeforeOpen(data);
    var body = $("mbBeforeOpenBody");
    if (!body) return;
    body.innerHTML = renderItemList(items, {
      emptyMessage: "Quiet overnight — nothing needs attention before doors open.",
    });
    setSectionVisibility("mbBeforeOpen", true);
  }

  function renderScheduleRisks(data) {
    var items = buildScheduleRisks(data);
    var body = $("mbScheduleRisksBody");
    if (!body) return;
    body.innerHTML = renderItemList(items, {
      emptyMessage: "Schedule looks steady — no risks flagged.",
    });
    setSectionVisibility("mbScheduleRisks", items.length > 0);
  }

  function renderPatientPrep(data) {
    var items = buildPatientPrep(data);
    var body = $("mbPatientPrepBody");
    if (!body) return;
    body.innerHTML = renderItemList(items, {
      emptyMessage: "No special patient prep flagged for today.",
    });
    setSectionVisibility("mbPatientPrep", items.length > 0);
  }

  function renderTodayMoves(data) {
    var items = buildTodayMoves(data);
    var body = $("mbTodayMovesBody");
    if (!body) return;
    body.innerHTML = renderItemList(items, {
      emptyMessage: "No same-day openings or fill opportunities right now.",
    });
    setSectionVisibility("mbTodayMoves", items.length > 0);
  }

  function renderQuietNote(note) {
    var textEl = $("mbQuietNoteText");
    var aside = $("mbQuietNote");
    if (!textEl || !aside) return;

    var cleaned = (note || "").trim();
    // Soften awkward metric phrasing from generator
    cleaned = cleaned.replace(/at\s+(\d+)\s*calls?/i, "— $1 calls");
    cleaned = cleaned.replace(/Calls captured\s*[—–-]\s*/i, "Overnight calls captured ");
    cleaned = cleaned.replace(/Overnight calls captured\s+(\d+)\s*calls?/i, "Overnight: $1 calls captured");
    cleaned = cleaned.replace(/5 calls/i, "5 calls");
    cleaned = cleaned.replace(/\s*—\s*—\s*/g, " — ");

    if (!cleaned) {
      aside.hidden = true;
      return;
    }

    textEl.textContent = cleaned;
    aside.hidden = false;
  }

  function renderSubline(data) {
    var el = $("mbSubline");
    if (!el) return;

    var before = buildBeforeOpen(data).length;
    var risks = buildScheduleRisks(data).length;
    var prep = buildPatientPrep(data).length;
    var moves = buildTodayMoves(data).length;
    var total = before + risks + prep + moves;

    if (total === 0) {
      el.textContent = "The practice is ready. Nothing needs your attention before doors open.";
      return;
    }

    if (before > 0) {
      el.textContent =
        before === 1
          ? "One thing needs attention before doors open."
          : before + " things need attention before doors open.";
      return;
    }

    el.textContent = "A few things worth knowing before the day starts.";
  }

  function renderBrief(data) {
    $("mbRecipient").textContent = data.recipientName || "Doctor";
    $("mbPracticeName").textContent = data.practiceName || "";
    $("mbDate").textContent = formatDate(data.date);

    var generatedEl = $("mbGeneratedAt");
    if (generatedEl) generatedEl.textContent = formatDateTime(data.generatedAt);

    renderSubline(data);
    renderBeforeOpen(data);
    renderScheduleRisks(data);
    renderPatientPrep(data);
    renderTodayMoves(data);
    renderQuietNote(data.stewardshipNote);
  }

  function showBrief() {
    $("mbLoading").hidden = true;
    $("mbError").hidden = true;
    $("mbDashboard").hidden = false;
  }

  function showError() {
    $("mbLoading").hidden = true;
    $("mbDashboard").hidden = true;
    $("mbError").hidden = false;
  }

  function init() {
    fetch(PREVIEW_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load preview");
        return res.json();
      })
      .then(function (data) {
        if (!data.previewMode) {
          console.warn("Morning Brief preview: expected previewMode flag");
        }
        renderBrief(data);
        showBrief();
      })
      .catch(function () {
        showError();
      });
  }

  window.MorningBriefRenderer = {
    init: init,
  };
})();
