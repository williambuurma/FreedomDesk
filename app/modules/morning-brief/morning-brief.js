/**
 * Morning Brief — opening state of Today (not a navigation destination).
 * Problem → Patient → Recommendation → Action → Why? (collapsed)
 * Curates Practice Brain preview JSON; mock data only. No backend changes.
 */
(function () {
  "use strict";

  var PREVIEW_URL = "../data/morning-brief-preview.json";
  var SECONDARY_LIMIT = 2;
  var whyBound = false;
  var mountRoot = null;

  /**
   * Ops judgments: operational problem first, patient second.
   * Labels are not shown — typography carries hierarchy.
   */
  var JUDGMENTS = {
    overnight_emergency: {
      priority: 100,
      group: "do_first",
      accent: "urgent",
      problem: "Possible dental infection",
      patient: "Liam Johnson",
      recommendation: "Same-day limited exam",
      action: "Call before first patient",
      actionHref: "#today",
      why: "Overnight swelling. Intake ready.",
      consequence: "Pain worsens; same-day slot fills.",
    },
    lab_crown: {
      priority: 80,
      group: "protect",
      accent: "protect",
      problem: "Crown seat at risk",
      patient: "Robert Hayes",
      recommendation: "Confirm lab before 10:00",
      action: "Confirm lab",
      actionHref: "#today",
      why: "10:00 seat. Lab status unconfirmed.",
      consequence: "Seat may need to postpone.",
    },
    waitlist: {
      priority: 70,
      group: "opportunity",
      accent: "opportunity",
      problem: "Open hygiene chair",
      patient: null,
      recommendation: "Short-call waitlist",
      action: "Call candidates",
      actionHref: "#today",
      why: "Morning cancel. Candidates ready.",
      consequence: "~$250 at risk.",
    },
    cancellation: {
      priority: 70,
      group: "opportunity",
      accent: "opportunity",
      problem: "Open hygiene chair",
      patient: null,
      recommendation: "Short-call waitlist",
      action: "Call candidates",
      actionHref: "#today",
      why: "Morning cancel. Candidates ready.",
      consequence: "~$250 at risk.",
    },
    new_patient_prep: {
      priority: 60,
      group: "protect",
      accent: "protect",
      problem: "Benefits not verified",
      patient: "Maya Chen",
      recommendation: "Verify before arrival",
      action: "Verify benefits",
      actionHref: "#today",
      why: "First visit today.",
      consequence: "Check-in stalls.",
    },
    recall_perio: {
      priority: 55,
      group: "opportunity",
      accent: "opportunity",
      problem: "Patient ready for treatment discussion",
      patient: null,
      recommendation: "Discuss perio before dismissal",
      action: "Open patient",
      actionHref: "#patients",
      why: "On schedule. Recall past due.",
      consequence: "Missed chairside opportunity.",
    },
    recall_prophy: {
      priority: 50,
      group: "opportunity",
      accent: "opportunity",
      problem: "Patient ready for treatment discussion",
      patient: null,
      recommendation: "Discuss recall before dismissal",
      action: "Open patient",
      actionHref: "#patients",
      why: "On schedule. Recall past due.",
      consequence: "Missed chairside opportunity.",
    },
  };

  var GROUP_LABELS = {
    do_first: "Do first",
    protect: "Protect today",
    opportunity: "Opportunities",
    other: "Later",
  };

  var TOPIC_ALIASES = {
    cancellation: "waitlist",
  };

  function $(id) {
    if (mountRoot && mountRoot.querySelector) {
      var scoped = mountRoot.querySelector("#" + id);
      if (scoped) return scoped;
    }
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

  function topicKey(item) {
    var s = ((item && item.summary) || "").toLowerCase();
    if (/overnight|emergency|urgent call|same-day emergency|on-call callback|same-day care needed|swelling/i.test(s)) {
      return "overnight_emergency";
    }
    if (/lab|crown seat|crown benefits|verify benefits.*crown/i.test(s)) return "lab_crown";
    if (/new patient|npe|08:30|insurance benefits|verify insurance/i.test(s)) return "new_patient_prep";
    if (/cancel/i.test(s)) return "cancellation";
    if (/prophy recall/i.test(s)) return "recall_prophy";
    if (/perio/i.test(s)) return "recall_perio";
    if (/waitlist|hygiene opening|short-call|open hygiene/i.test(s)) return "waitlist";
    return null;
  }

  function canonicalTopic(key) {
    return TOPIC_ALIASES[key] || key;
  }

  function isScheduleRisk(item) {
    if (!item || !item.summary) return false;
    var s = item.summary.toLowerCase();
    if (/appointments scheduled today/i.test(s)) return false;
    if (/open blocks available/i.test(s)) return false;
    return (
      item.actionRequired === true ||
      /cancel/i.test(s) ||
      /lab/i.test(s) ||
      /crown/i.test(s) ||
      /risk/i.test(s)
    );
  }

  function isInsuranceOrPrepDetail(item) {
    if (!item) return false;
    var blob = ((item.summary || "") + " " + (item.detail || "")).toLowerCase();
    return /insurance|verify|benefits|new patient|npe/i.test(blob) || item.actionRequired === true;
  }

  function detectTopics(data) {
    var found = {};

    function note(item) {
      var key = topicKey(item);
      if (!key) return;
      found[canonicalTopic(key)] = true;
    }

    sectionItems(data.sections, "emergent_followups").forEach(note);
    sectionItems(data.sections, "overnight_calls")
      .filter(function (item) {
        return item.actionRequired === true;
      })
      .forEach(note);
    sectionItems(data.sections, "alerts")
      .filter(function (item) {
        return item.actionRequired === true;
      })
      .forEach(note);
    sectionItems(data.sections, "schedule_snapshot").filter(isScheduleRisk).forEach(note);
    sectionItems(data.sections, "squeeze_in_capacity")
      .filter(function (item) {
        return /lab|crown|waitlist|cancel|fill/i.test(item.summary || "");
      })
      .forEach(note);
    sectionItems(data.sections, "new_patients_today").filter(isInsuranceOrPrepDetail).forEach(note);
    sectionItems(data.sections, "waitlist_cancellations").forEach(note);
    sectionItems(data.sections, "recall_opportunities").forEach(note);

    (data.topRecommendations || []).forEach(function (rec) {
      note({ summary: rec.recommendation || "", detail: rec.reason || "" });
    });

    (data.opportunities || []).forEach(function (opp) {
      if (/overnight|emergency|urgent/i.test(opp.title || "")) return;
      note({ summary: opp.title || "", detail: opp.description || "" });
    });

    return Object.keys(found);
  }

  function buildDecisions(topics) {
    return topics
      .map(function (topic) {
        var judgment = JUDGMENTS[topic];
        if (!judgment) return null;
        return {
          topic: topic,
          priority: judgment.priority,
          group: judgment.group || "other",
          accent: judgment.accent || "",
          problem: judgment.problem,
          patient: judgment.patient,
          recommendation: judgment.recommendation,
          action: judgment.action,
          actionHref: judgment.actionHref,
          why: judgment.why,
          consequence: judgment.consequence,
        };
      })
      .filter(Boolean)
      .sort(function (a, b) {
        return b.priority - a.priority;
      });
  }

  function renderDecisionCard(decision, isPrimary, kicker) {
    var UI = window.FreedomDeskUI;
    if (!UI || !UI.renderDecisionCard) return "";

    return UI.renderDecisionCard({
      id: decision.topic || decision.problem,
      situation: decision.problem,
      subject: decision.patient || "",
      stake: decision.consequence || "",
      guidance: decision.recommendation || "",
      actionLabel: decision.action || "",
      href: decision.actionHref || "#",
      whyText: decision.why || "",
      accent: decision.accent || "",
      prominence: isPrimary ? "primary" : "secondary",
      group: decision.group || "",
    });
  }

  function renderSection(groupKey, decisions, options) {
    var opts = options || {};
    if (!decisions || !decisions.length) return "";
    var isPrimary = !!opts.primary;
    // Primary needs no label — size and position carry the hierarchy.
    // Secondary groups share one quiet label so the page doesn't segment.
    var label = "";
    if (!isPrimary && opts.showLabel !== false) {
      label = opts.label || GROUP_LABELS[groupKey] || "";
    }
    var cards = decisions
      .map(function (d, i) {
        return renderDecisionCard(d, isPrimary && i === 0);
      })
      .join("");

    return (
      '<section class="mb-section mb-section--' +
      escapeHtml(groupKey) +
      (isPrimary ? " mb-section--primary" : "") +
      '">' +
      (label
        ? '<h2 class="mb-section-label">' + escapeHtml(label) + "</h2>"
        : "") +
      '<div class="mb-section-cards">' +
      cards +
      "</div>" +
      "</section>"
    );
  }

  function renderRemaining(remaining) {
    var wrap = $("mbRemaining");
    var body = $("mbRemainingBody");
    if (!wrap || !body) return;

    if (!remaining || remaining.length === 0) {
      wrap.hidden = true;
      return;
    }

    body.innerHTML = remaining
      .map(function (d) {
        return (
          '<li class="mb-remaining-item">' +
          '<span class="mb-remaining-problem">' +
          escapeHtml(d.problem) +
          "</span>" +
          (d.patient
            ? '<span class="mb-remaining-patient">' + escapeHtml(d.patient) + "</span>"
            : "") +
          "</li>"
        );
      })
      .join("");
    wrap.hidden = false;
  }

  function renderSubline(hasPrimary) {
    var el = $("mbSubline");
    if (!el) return;
    el.textContent = hasPrimary ? "One decision first." : "Clear morning.";
  }

  function renderBrief(data) {
    $("mbPracticeName").textContent = data.practiceName || "";
    $("mbDate").textContent = formatDate(data.date);

    var generatedEl = $("mbGeneratedAt");
    if (generatedEl) generatedEl.textContent = formatDateTime(data.generatedAt);

    var decisions = buildDecisions(detectTopics(data));
    var primary = decisions[0] || null;
    var rest = decisions.slice(1);
    var secondary = rest.slice(0, SECONDARY_LIMIT);
    var remaining = rest.slice(SECONDARY_LIMIT);

    renderSubline(!!primary);

    var layout = $("mbDecisions");
    if (!layout) return;

    if (!primary) {
      layout.innerHTML = '<p class="mb-empty">Clear morning.</p>';
      renderRemaining([]);
      return;
    }

    var protect = [];
    var opportunity = [];
    var other = [];
    secondary.forEach(function (d) {
      var group = d.group || "other";
      if (group === "do_first") group = "protect";
      if (group === "protect") protect.push(d);
      else if (group === "opportunity") opportunity.push(d);
      else other.push(d);
    });

    var html = renderSection("do_first", [primary], { primary: true });
    var secondaryAll = protect.concat(opportunity).concat(other);
    if (secondaryAll.length) {
      // No section label — primary card vs quiet rows is enough hierarchy.
      html +=
        '<div class="mb-secondary-row">' +
        renderSection("next", secondaryAll, { showLabel: false }) +
        "</div>";
    }
    layout.innerHTML = html;
    renderRemaining(remaining);
    if (!whyBound && window.FreedomDeskUI && window.FreedomDeskUI.bindReasoningToggles) {
      window.FreedomDeskUI.bindReasoningToggles(layout);
      whyBound = true;
    }
  }

  function showBrief() {
    var loading = $("mbLoading");
    var err = $("mbError");
    var dash = $("mbDashboard");
    if (loading) loading.hidden = true;
    if (err) err.hidden = true;
    if (dash) dash.hidden = false;
  }

  function showError() {
    var loading = $("mbLoading");
    var err = $("mbError");
    var dash = $("mbDashboard");
    if (loading) loading.hidden = true;
    if (dash) dash.hidden = true;
    if (err) err.hidden = false;
  }

  function loadAndRender() {
    return fetch(PREVIEW_URL)
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
        return true;
      })
      .catch(function () {
        showError();
        return false;
      });
  }

  function init() {
    mountRoot = null;
    whyBound = false;
    loadAndRender();
  }

  /**
   * Render morning brief markup into a host (Today morning state).
   * Returns a promise that resolves to true when content rendered.
   */
  function renderInto(host) {
    if (!host) return Promise.resolve(false);
    mountRoot = host;
    whyBound = false;

    return fetch("modules/morning-brief/template.html")
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load morning template");
        return res.text();
      })
      .then(function (html) {
        host.innerHTML = html;
        return loadAndRender();
      })
      .catch(function () {
        host.innerHTML = "";
        return false;
      });
  }

  window.MorningBriefRenderer = {
    init: init,
    renderInto: renderInto,
  };
})();
