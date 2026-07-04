/**
 * Morning Brief dashboard — renders Practice Brain preview JSON.
 * Mock data only; no PMS or live API.
 */
(function () {
  "use strict";

  var PREVIEW_URL = "../data/morning-brief-preview.json";

  var SECTION_IDS = {
    schedule: "schedule_snapshot",
    overnight: "overnight_calls",
    emergency: "emergent_followups",
    newPatients: "new_patients_today",
  };

  var SECTION_TITLES = {
    schedule: "Today's Schedule",
    overnight: "Overnight Calls",
    emergency: "Emergencies",
    newPatients: "New Patients",
  };

  var OWNER_LABELS = {
    front_desk: "Front desk",
    dentist: "Doctor",
    office_manager: "Office manager",
    hygiene_coordinator: "Hygiene coordinator",
    assistant: "Assistant",
    freedomdesk_ops: "FreedomDesk",
  };

  var PRIORITY_LABELS = {
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
  };

  var IMPACT_LABELS = {
    high: "High impact",
    medium: "Medium impact",
    low: "Low impact",
  };

  var SNAPSHOT_LIMIT = 4;

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
        year: "numeric",
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
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch (_e) {
      return iso;
    }
  }

  function ownerLabel(role) {
    return OWNER_LABELS[role] || role.replace(/_/g, " ");
  }

  function findSection(sections, id) {
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].id === id) return sections[i];
    }
    return null;
  }

  function formatKpiValue(kpi) {
    if (kpi.unit === "%") return kpi.value + "%";
    if (kpi.unit === "calls") return kpi.value + " calls";
    if (kpi.unit === "min") return kpi.value + " min";
    if (kpi.unit === "score") return Math.round(kpi.value * 100) + "%";
    if (kpi.unit === "flag") return kpi.value ? "Active" : "None";
    if (kpi.unit === "events") return kpi.value + (kpi.value === 1 ? " event" : " events");
    if (kpi.unit === "blocks" || kpi.unit === "slots") return kpi.value + " open";
    return kpi.value + (kpi.unit ? " " + kpi.unit : "");
  }

  function selectSnapshotKpis(metrics) {
    if (!metrics || !metrics.departments) return [];

    var kpis = [];
    metrics.departments.forEach(function (dept) {
      dept.kpis.forEach(function (kpi) {
        if (kpi.health !== "insufficient_data") {
          kpis.push(kpi);
        }
      });
    });

    var healthOrder = { critical: 0, warning: 1, healthy: 2 };
    kpis.sort(function (a, b) {
      return (healthOrder[a.health] ?? 2) - (healthOrder[b.health] ?? 2);
    });

    return kpis.slice(0, SNAPSHOT_LIMIT);
  }

  function renderMetrics(metrics) {
    var container = $("mbMetrics");
    if (!container) return;

    var featured = selectSnapshotKpis(metrics);

    if (featured.length === 0) {
      container.innerHTML = '<p class="mb-empty">Practice metrics will appear here.</p>';
      return;
    }

    container.innerHTML = featured
      .map(function (kpi) {
        return (
          '<div class="mb-snapshot-card mb-metric-health-' +
          escapeHtml(kpi.health) +
          '">' +
          '<span class="mb-snapshot-value">' +
          escapeHtml(formatKpiValue(kpi)) +
          "</span>" +
          '<span class="mb-snapshot-name">' +
          escapeHtml(kpi.name) +
          "</span>" +
          (kpi.target != null
            ? '<span class="mb-snapshot-target">Target ' +
              escapeHtml(String(kpi.target)) +
              (kpi.unit === "%" ? "%" : kpi.unit ? " " + escapeHtml(kpi.unit) : "") +
              "</span>"
            : "") +
          "</div>"
        );
      })
      .join("");
  }

  function renderTodaysFocus(recommendations) {
    var container = $("mbFocus");
    if (!container) return;

    var focusItems = (recommendations || [])
      .filter(function (rec) {
        return rec.priority === "critical" || rec.priority === "high";
      })
      .slice(0, 3);

    if (focusItems.length === 0) {
      focusItems = (recommendations || []).slice(0, 2);
    }

    if (focusItems.length === 0) {
      container.innerHTML =
        '<p class="mb-focus-calm">Your morning looks clear. Review the schedule and opportunities below when you are ready.</p>';
      return;
    }

    var html = '<ol class="mb-focus-list">';
    focusItems.forEach(function (rec, index) {
      html +=
        '<li class="mb-focus-item mb-priority-' +
        escapeHtml(rec.priority) +
        '">' +
        '<span class="mb-focus-num" aria-hidden="true">' +
        (index + 1) +
        "</span>" +
        '<div class="mb-focus-body">' +
        '<p class="mb-focus-text">' +
        escapeHtml(rec.recommendation) +
        "</p>" +
        '<p class="mb-focus-meta">' +
        '<span class="mb-priority-badge mb-priority-' +
        escapeHtml(rec.priority) +
        '">' +
        escapeHtml(PRIORITY_LABELS[rec.priority] || rec.priority) +
        "</span>" +
        '<span class="mb-item-owner">' +
        escapeHtml(ownerLabel(rec.owner)) +
        "</span>" +
        "</p>" +
        "</div>" +
        "</li>";
    });
    html += "</ol>";
    container.innerHTML = html;
  }

  function renderSectionCard(containerId, headingId, section, displayTitle) {
    var container = $(containerId);
    if (!container) return;

    if (!section || !section.items || section.items.length === 0) {
      container.innerHTML =
        '<div class="mb-card-header">' +
        '<h3 class="mb-card-title" id="' +
        headingId +
        '">' +
        escapeHtml(displayTitle) +
        '</h3></div><p class="mb-empty">All clear — nothing flagged.</p>';
      return;
    }

    var priorityClass = section.priority ? " mb-priority-" + section.priority : "";
    var html =
      '<div class="mb-card-header">' +
      '<h3 class="mb-card-title" id="' +
      headingId +
      '">' +
      escapeHtml(displayTitle) +
      "</h3>" +
      (section.priority
        ? '<span class="mb-priority-badge' +
          priorityClass +
          '">' +
          escapeHtml(PRIORITY_LABELS[section.priority] || section.priority) +
          "</span>"
        : "") +
      "</div>" +
      '<ul class="mb-item-list">';

    section.items.forEach(function (item) {
      html +=
        '<li class="mb-item' +
        (item.actionRequired ? " mb-item-action" : "") +
        '">' +
        '<div class="mb-item-main">' +
        (item.actionRequired
          ? '<span class="mb-action-dot" aria-label="Action required"></span>'
          : "") +
        '<p class="mb-item-summary">' +
        escapeHtml(item.summary) +
        "</p>" +
        (item.detail ? '<p class="mb-item-detail">' + escapeHtml(item.detail) + "</p>" : "") +
        "</div>" +
        '<div class="mb-item-meta">' +
        '<span class="mb-item-owner">' +
        escapeHtml(ownerLabel(item.owner)) +
        "</span>" +
        (item.confidence != null
          ? '<span class="mb-item-confidence">' +
            Math.round(item.confidence * 100) +
            "% confidence</span>"
          : "") +
        "</div>" +
        "</li>";
    });

    html += "</ul>";
    container.innerHTML = html;
  }

  function renderOpportunities(opportunities) {
    var container = $("mbOpportunities");
    if (!container) return;

    if (!opportunities || opportunities.length === 0) {
      container.innerHTML =
        '<div class="mb-card-header">' +
        '<h3 class="mb-card-title" id="mbOpportunitiesHeading">Top Opportunities</h3>' +
        '</div><p class="mb-empty">No opportunities detected today.</p>';
      return;
    }

    var html =
      '<div class="mb-card-header">' +
      '<h3 class="mb-card-title" id="mbOpportunitiesHeading">Top Opportunities</h3>' +
      '<span class="mb-count-badge">' +
      opportunities.length +
      "</span>" +
      "</div>" +
      '<ul class="mb-opp-list">';

    opportunities.slice(0, 5).forEach(function (opp) {
      html +=
        '<li class="mb-opp">' +
        '<p class="mb-opp-title">' +
        escapeHtml(opp.title) +
        "</p>" +
        '<p class="mb-opp-desc">' +
        escapeHtml(opp.description) +
        "</p>" +
        '<div class="mb-opp-meta">' +
        '<span class="mb-opp-type">' +
        escapeHtml(opp.type.replace(/_/g, " ")) +
        "</span>" +
        (opp.estimatedImpact
          ? '<span class="mb-opp-impact">' +
            escapeHtml(IMPACT_LABELS[opp.estimatedImpact] || opp.estimatedImpact) +
            "</span>"
          : "") +
        '<span class="mb-item-confidence">' +
        Math.round(opp.confidence * 100) +
        "%</span>" +
        "</div>" +
        "</li>";
    });

    html += "</ul>";
    container.innerHTML = html;
  }

  function renderRecommendations(recommendations) {
    var container = $("mbRecommendations");
    if (!container) return;

    if (!recommendations || recommendations.length === 0) {
      container.innerHTML =
        '<div class="mb-card-header">' +
        '<h3 class="mb-card-title" id="mbRecommendationsHeading">Recommended Actions</h3>' +
        '</div><p class="mb-empty">No recommendations for today.</p>';
      return;
    }

    var html =
      '<div class="mb-card-header">' +
      '<h3 class="mb-card-title" id="mbRecommendationsHeading">Recommended Actions</h3>' +
      "</div>" +
      '<ul class="mb-rec-list">';

    recommendations.slice(0, 5).forEach(function (rec) {
      html +=
        '<li class="mb-rec mb-priority-' +
        escapeHtml(rec.priority) +
        '">' +
        '<div class="mb-rec-header">' +
        '<span class="mb-priority-badge mb-priority-' +
        escapeHtml(rec.priority) +
        '">' +
        escapeHtml(PRIORITY_LABELS[rec.priority] || rec.priority) +
        "</span>" +
        '<span class="mb-item-owner">' +
        escapeHtml(ownerLabel(rec.owner)) +
        "</span>" +
        "</div>" +
        '<p class="mb-rec-text">' +
        escapeHtml(rec.recommendation) +
        "</p>" +
        '<p class="mb-rec-reason">' +
        escapeHtml(rec.reason) +
        "</p>" +
        "</li>";
    });

    html += "</ul>";
    container.innerHTML = html;
  }

  function renderStewardship(note) {
    var textEl = $("mbStewardshipText");
    if (textEl) textEl.textContent = note || "Practice operating within normal parameters.";
  }

  function renderDashboard(data) {
    $("mbRecipient").textContent = data.recipientName || "Doctor";
    $("mbPracticeName").textContent = data.practiceName || "";
    $("mbDate").textContent = formatDate(data.date);
    $("mbReadTime").textContent = String(data.estimatedReadMinutes || 3);

    var generatedEl = $("mbGeneratedAt");
    if (generatedEl) generatedEl.textContent = formatDateTime(data.generatedAt);

    renderTodaysFocus(data.topRecommendations);
    renderMetrics(data.metrics);

    renderSectionCard(
      "mbSchedule",
      "mbScheduleHeading",
      findSection(data.sections, SECTION_IDS.schedule),
      SECTION_TITLES.schedule
    );
    renderSectionCard(
      "mbOvernight",
      "mbOvernightHeading",
      findSection(data.sections, SECTION_IDS.overnight),
      SECTION_TITLES.overnight
    );
    renderSectionCard(
      "mbEmergency",
      "mbEmergencyHeading",
      findSection(data.sections, SECTION_IDS.emergency),
      SECTION_TITLES.emergency
    );
    renderSectionCard(
      "mbNewPatients",
      "mbNewPatientsHeading",
      findSection(data.sections, SECTION_IDS.newPatients),
      SECTION_TITLES.newPatients
    );

    renderOpportunities(data.opportunities);
    renderRecommendations(data.topRecommendations);
    renderStewardship(data.stewardshipNote);
  }

  function showDashboard() {
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
        renderDashboard(data);
        showDashboard();
      })
      .catch(function () {
        showError();
      });
  }

  window.MorningBriefRenderer = {
    init: init,
  };
})();
