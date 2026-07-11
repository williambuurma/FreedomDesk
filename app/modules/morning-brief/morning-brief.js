/**
 * Morning Brief — opening state of Today (not a navigation destination).
 * Problem → Patient → Recommendation → Action → Why? (collapsed)
 * Curates Practice Brain preview JSON; mock data only. No backend changes.
 */
(function () {
  "use strict";

  var PREVIEW_URL = "../data/morning-brief-preview.json";
  var SECONDARY_LIMIT = 2;
  var mountRoot = null;
  var briefData = null;
  var advancing = false;
  var eventsBound = false;

  function Flow() {
    return window.FreedomDeskDecisionFlow;
  }

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
      problem: "Perio discussion ready",
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
      problem: "Recall discussion ready",
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

    if (
      data.decisionCards &&
      data.decisionCards.some(function (c) {
        return c.kind === "recoverable_schedule_opportunity";
      })
    ) {
      found.waitlist = true;
    }

    if (
      data.decisionCards &&
      data.decisionCards.some(function (c) {
        return c.kind === "recoverable_phone_opportunity";
      })
    ) {
      found.overnight_emergency = true;
    }

    return Object.keys(found);
  }

  function buildDecisions(topics, data) {
    var pieWaitlist = null;
    var piePhone = null;
    if (data && data.decisionCards && data.decisionCards.length) {
      var rso = data.decisionCards.find(function (c) {
        return c.kind === "recoverable_schedule_opportunity";
      });
      if (rso) {
        pieWaitlist = {
          priority: 75,
          group: "opportunity",
          accent: "opportunity",
          problem: rso.situation,
          patient: rso.subject || null,
          recommendation: rso.recommendation,
          action: rso.primaryAction,
          actionHref: "#today",
          why: rso.whyText || "",
          consequence: rso.stake || "An open chair stays empty.",
        };
      }
      var phone = data.decisionCards.find(function (c) {
        return c.kind === "recoverable_phone_opportunity";
      });
      if (phone) {
        piePhone = {
          priority: 100,
          group: "do_first",
          accent: phone.accent || "urgent",
          problem: phone.situation,
          patient: phone.subject || null,
          recommendation: phone.recommendation,
          action: phone.primaryAction,
          actionHref: "#today",
          why: phone.whyText || "",
          consequence:
            phone.stake ||
            "Symptoms may worsen and the patient may seek care elsewhere.",
        };
      }
    }

    return topics
      .map(function (topic) {
        var judgment =
          topic === "overnight_emergency" && piePhone
            ? piePhone
            : topic === "waitlist" && pieWaitlist
              ? pieWaitlist
              : JUDGMENTS[topic];
        if (!judgment) return null;
        return {
          topic: topic,
          recommendationId: "judgment_" + topic,
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

  function arbitrationQueue(data) {
    var flow = Flow();
    if (!flow || !data) return [];
    return flow.buildQueue(data.decisionCards, data.waitingDecisions);
  }

  /**
   * Topics already resolved via Arbitration — keep judgments from re-surfacing them.
   */
  function resolvedArbitrationTopics(data) {
    var flow = Flow();
    var resolved = {};
    if (!flow || !data) return resolved;
    arbitrationQueue(data).forEach(function (card) {
      if (!flow.isTerminal(flow.getOutcomeStatus(flow.cardId(card)))) return;
      if (card.kind === "recoverable_phone_opportunity") {
        resolved.overnight_emergency = true;
      }
      if (card.kind === "recoverable_schedule_opportunity") {
        resolved.waitlist = true;
        resolved.cancellation = true;
      }
    });
    return resolved;
  }

  function pieCardToDecision(card) {
    if (!card) return null;
    var flow = Flow();
    var id = flow ? flow.cardId(card) : card.recommendationId || card.id;
    return {
      topic: card.kind || id,
      recommendationId: id,
      priority: card.priority === "high" ? 90 : 70,
      group:
        card.group === "urgent"
          ? "do_first"
          : card.group || "opportunity",
      accent: card.accent || "",
      problem: card.situation,
      patient: card.subject || null,
      recommendation: card.recommendation,
      action: card.primaryAction,
      why: card.whyText || "",
      consequence: card.stake || "",
      evidence: card.evidence || [],
      fromArbitration: true,
    };
  }

  /** Primary from Decision Arbitration when available; else next judgment. */
  function resolvePrimary(decisions, data) {
    var flow = Flow();
    if (flow && data) {
      var queue = arbitrationQueue(data);
      if (queue.length) {
        var primaryCard = flow.primaryDecision(queue);
        if (primaryCard) return pieCardToDecision(primaryCard);
        // Queue exhausted — continue with remaining morning judgments.
      }
    }
    return decisions[0] || null;
  }

  function timeAwareGreeting() {
    var hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good morning.";
    if (hour >= 12 && hour < 17) return "Good afternoon.";
    return "Good evening.";
  }

  function paintGreeting() {
    var title = mountRoot
      ? mountRoot.querySelector(".mb-intro-title")
      : document.querySelector(".mb-intro-title");
    if (title) title.textContent = timeAwareGreeting();
  }

  function paintRemainingHint(count) {
    var el = $("mbRemainingHint");
    if (!el) return;
    var flow = Flow();
    var label = flow && flow.remainingLabel ? flow.remainingLabel(count) : "";
    if (!label) {
      el.textContent = "";
      el.hidden = true;
      return;
    }
    el.textContent = label;
    el.hidden = false;
  }

  function renderDecisionCard(decision, isPrimary) {
    var UI = window.FreedomDeskUI;
    var flow = Flow();
    if (!UI || !UI.renderDecisionCard || !decision) return "";

    var id =
      decision.recommendationId || decision.topic || decision.problem || "";
    var status = flow && id ? flow.getOutcomeStatus(id) : "";
    var isTerminal = flow && flow.isTerminal(status);
    var isAccepted = status === "accepted";
    // Primary always gets outcome controls — judgments included after arbitration.
    var interactive = !!(isPrimary && flow && id);

    if (interactive) {
      var secondaryActions = isTerminal
        ? []
        : isAccepted
          ? [
              {
                label: "Later",
                attrs:
                  ' data-decision-outcome="snoozed" data-recommendation-id="' +
                  id +
                  '"',
              },
              {
                label: "Not needed",
                attrs:
                  ' data-decision-outcome="dismissed" data-recommendation-id="' +
                  id +
                  '"',
              },
            ]
          : [
              {
                label: "Done",
                strong: true,
                attrs:
                  ' data-decision-outcome="completed" data-recommendation-id="' +
                  id +
                  '"',
              },
              {
                label: "Later",
                attrs:
                  ' data-decision-outcome="snoozed" data-recommendation-id="' +
                  id +
                  '"',
              },
              {
                label: "Not needed",
                attrs:
                  ' data-decision-outcome="dismissed" data-recommendation-id="' +
                  id +
                  '"',
              },
            ];

      return UI.renderDecisionCard({
        id: id,
        situation: decision.problem,
        subject: decision.patient || "",
        stake: decision.consequence || "",
        guidance: decision.recommendation || "",
        whyText: decision.why || "",
        evidence: decision.evidence || [],
        accent: decision.accent || "",
        prominence: "primary",
        group: decision.group || "",
        resolvedLabel: isTerminal ? flow.outcomeLabel(status) : "",
        statusHint: isAccepted
          ? "Place the call, then mark Done."
          : "",
        actionLabel: isTerminal
          ? ""
          : isAccepted
            ? "Done"
            : decision.action || "Act",
        primaryAttrs: isAccepted
          ? ' data-decision-outcome="completed" data-recommendation-id="' +
            id +
            '"'
          : ' data-decision-outcome="accepted" data-recommendation-id="' +
            id +
            '"',
        secondaryActions: secondaryActions,
      });
    }

    return UI.renderDecisionCard({
      id: id,
      situation: decision.problem,
      subject: decision.patient || "",
      stake: decision.consequence || "",
      guidance: decision.recommendation || "",
      // Secondary rows are awareness only — no competing next action.
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
    // Progress lives in the remaining hint; clear state lives on the card.
    el.textContent = "";
    el.hidden = true;
  }

  function secondaryFromJudgments(decisions, primary, data) {
    var primaryKind = primary && primary.topic;
    var primaryProblem = primary && primary.problem;
    var resolved = resolvedArbitrationTopics(data);
    return decisions.filter(function (d) {
      if (!d) return false;
      if (resolved[d.topic] || resolved[canonicalTopic(d.topic)]) return false;
      if (primary && d.topic === primaryKind) return false;
      // Avoid duplicating the arbitration primary when judgment aliases match.
      if (
        primaryProblem &&
        d.problem &&
        d.problem === primaryProblem
      ) {
        return false;
      }
      if (
        primary &&
        primary.fromArbitration &&
        (d.topic === "overnight_emergency" || d.topic === "waitlist")
      ) {
        return false;
      }
      return true;
    });
  }

  function renderPrimarySlot(layout, primary, options) {
    var opts = options || {};
    var flow = Flow();
    if (!layout) return;

    var primaryHost = layout.querySelector(".mb-section--primary .mb-section-cards");
    if (!primaryHost) {
      // Full layout not yet built — caller handles first paint.
      return;
    }

    if (!primary) {
      primaryHost.innerHTML =
        '<div class="td-decision-clear fd-dc-clear" role="status">' +
        '<p class="td-decision-clear-title">You\'re clear.</p>' +
        '<p class="td-decision-clear-body">Nothing needs your attention right now.</p>' +
        "</div>";
      renderSubline(false);
      paintRemainingHint(0);
      return;
    }

    primaryHost.innerHTML = renderDecisionCard(primary, true);
    renderSubline(true);

    if (opts.entering && flow) {
      var card = primaryHost.querySelector(".fd-dc--primary");
      flow.markEntering(card);
    }
    if (flow && flow.focusPrimaryAction) {
      window.setTimeout(function () {
        flow.focusPrimaryAction(primaryHost);
      }, opts.entering ? 80 : 0);
    }
  }

  function renderBrief(data, options) {
    var opts = options || {};
    briefData = data;

    paintGreeting();

    $("mbPracticeName").textContent = data.practiceName || "";
    $("mbDate").textContent = formatDate(data.date);

    var generatedEl = $("mbGeneratedAt");
    if (generatedEl) generatedEl.textContent = formatDateTime(data.generatedAt);

    var flow = Flow();
    var resolved = resolvedArbitrationTopics(data);
    var decisions = buildDecisions(detectTopics(data), data).filter(function (d) {
      if (resolved[d.topic] || resolved[canonicalTopic(d.topic)]) return false;
      // Judgment outcomes (Done / Later / Not needed) stay dismissed.
      if (
        flow &&
        d.recommendationId &&
        flow.isTerminal(flow.getOutcomeStatus(d.recommendationId))
      ) {
        return false;
      }
      return true;
    });
    var primary = resolvePrimary(decisions, data);
    var rest = secondaryFromJudgments(decisions, primary, data);
    var secondary = rest.slice(0, SECONDARY_LIMIT);
    var remaining = rest.slice(SECONDARY_LIMIT);
    // Count only decisions that will become primary — not quiet awareness rows
    // while Arbitration still owns the queue.
    var arbQueue = arbitrationQueue(data);
    var waitingCount =
      flow && arbQueue.length && flow.primaryDecision(arbQueue)
        ? flow.remainingAfterPrimary(arbQueue)
        : rest.length;

    renderSubline(!!primary);
    paintRemainingHint(primary ? waitingCount : 0);

    var layout = $("mbDecisions");
    if (!layout) return;

    if (!primary && !secondary.length) {
      layout.innerHTML =
        '<div class="td-decision-clear fd-dc-clear" role="status">' +
        '<p class="td-decision-clear-title">You\'re clear.</p>' +
        '<p class="td-decision-clear-body">Nothing needs your attention right now.</p>' +
        "</div>";
      renderRemaining([]);
      return;
    }

    // Never claim clear while quieter work remains — promote next judgment.
    if (!primary && secondary.length) {
      primary = secondary[0];
      secondary = secondary.slice(1);
      remaining = rest.slice(SECONDARY_LIMIT + 1);
      waitingCount = secondary.length + remaining.length;
      renderSubline(true);
      paintRemainingHint(waitingCount);
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

    if (opts.primaryOnly && layout.querySelector(".mb-section--primary") && primary) {
      renderPrimarySlot(layout, primary, { entering: !!opts.entering });
      paintRemainingHint(waitingCount);
      return;
    }

    var html = primary
      ? renderSection("do_first", [primary], { primary: true })
      : "";
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

    if (opts.entering && Flow() && primary) {
      var card = layout.querySelector(".fd-dc--primary");
      Flow().markEntering(card);
    }

    if (Flow() && Flow().focusPrimaryAction && primary) {
      window.setTimeout(function () {
        Flow().focusPrimaryAction(layout);
      }, opts.entering ? 80 : 0);
    }

    // Why? is bound once on the Today host — do not double-bind here.
    bindOutcomeEvents(layout);
  }

  function handleBriefOutcome(outcomeBtn) {
    var flow = Flow();
    if (!flow || advancing || !briefData) return;

    var recommendationId = outcomeBtn.getAttribute("data-recommendation-id");
    var outcomeStatus = outcomeBtn.getAttribute("data-decision-outcome");
    if (!recommendationId || !outcomeStatus) return;

    flow.setOutcome(recommendationId, outcomeStatus);

    var layout = $("mbDecisions");
    var cardEl = outcomeBtn.closest(".fd-dc");

    if (!flow.isTerminal(outcomeStatus)) {
      renderBrief(briefData, { primaryOnly: true });
      return;
    }

    advancing = true;
    var buttons = cardEl ? cardEl.querySelectorAll("button, a") : [];
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.disabled = true;
    });

    if (cardEl) {
      var act = cardEl.querySelector(".fd-dc-act");
      if (act) {
        act.innerHTML =
          '<span class="fd-dc-resolved">' +
          flow.outcomeLabel(outcomeStatus) +
          "</span>";
      }
      cardEl.classList.add("fd-dc--resolved");
    }

    flow.animateAdvance(cardEl, {
      resolvedLabel: flow.outcomeLabel(outcomeStatus),
      onReady: function () {
        advancing = false;
        // Full re-render when advancing — keeps secondary list honest.
        renderBrief(briefData, { entering: true });
      },
    });
  }

  function bindOutcomeEvents(layout) {
    if (eventsBound || !layout) return;
    eventsBound = true;
    layout.addEventListener("click", function (event) {
      var outcomeBtn = event.target.closest("[data-decision-outcome]");
      if (!outcomeBtn || !layout.contains(outcomeBtn)) return;
      event.preventDefault();
      handleBriefOutcome(outcomeBtn);
    });
  }

  function bindKeyboardShortcuts() {
    if (bindKeyboardShortcuts._bound) return;
    bindKeyboardShortcuts._bound = true;
    document.addEventListener("keydown", function (event) {
      if (!mountRoot || !briefData || advancing) return;
      if (!document.body.contains(mountRoot)) return;
      if (mountRoot.closest("[hidden]")) return;
      var flow = Flow();
      if (!flow || !flow.matchShortcut) return;
      var outcome = flow.matchShortcut(event);
      if (!outcome) return;
      if (flow.invokeShortcut(mountRoot, outcome)) {
        event.preventDefault();
      }
    });
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
        bindKeyboardShortcuts();
        return true;
      })
      .catch(function () {
        showError();
        return false;
      });
  }

  function init() {
    mountRoot = null;
    loadAndRender();
  }

  /**
   * Render morning brief markup into a host (Today morning state).
   * Returns a promise that resolves to true when content rendered.
   */
  function renderInto(host) {
    if (!host) return Promise.resolve(false);
    mountRoot = host;
    eventsBound = false;
    advancing = false;
    briefData = null;

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
