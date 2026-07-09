/**
 * Reusable workspace UI renderers — Today, Morning Brief state, and role views.
 */
(function () {
  "use strict";

  var Labels = window.FreedomDeskLabels;
  var Utils = window.FreedomDeskUtils;

  function escapeHtml(str) {
    return Utils.escapeHtml(str);
  }

  function renderEmptyState(message) {
    return '<p class="fd-ui-empty">' + escapeHtml(message) + "</p>";
  }

  /**
   * FreedomDesk Decision Card — the product's atomic unit.
   *
   * Face (≤2s): Situation → Subject → Guidance → Act
   * Supporting detail (stake, because, evidence) lives behind Why?
   *
   * options:
   *   situation, subject, guidance, stake, actionLabel
   *   accent: "urgent" | "protect" | "opportunity" | ""
   *   prominence: "primary" | "secondary" (default primary)
   *   whyText, evidence[] ({ description })
   *   id — for Why? panel ids
   *   href — primary action as link (Morning Brief)
   *   primaryAttrs — extra attrs on primary button (Next)
   *   secondaryActions — [{ label, attrs, strong? }]
   *   resolvedLabel — replaces act row when done
   */
  function renderDecisionCard(options) {
    var opts = options || {};
    var situation = opts.situation || "";
    if (!situation) return "";

    var prominence = opts.prominence === "secondary" ? "secondary" : "primary";
    var accent = opts.accent || "";
    var classes = "fd-dc fd-dc--" + prominence;
    if (accent === "urgent") classes += " fd-dc--urgent";
    else if (accent === "protect") classes += " fd-dc--protect";
    else if (accent === "opportunity") classes += " fd-dc--opportunity";
    if (opts.resolvedLabel) classes += " fd-dc--resolved";

    var subject = opts.subject
      ? '<p class="fd-dc-subject">' + escapeHtml(opts.subject) + "</p>"
      : "";
    var guidance = opts.guidance
      ? '<p class="fd-dc-guidance">' + escapeHtml(opts.guidance) + "</p>"
      : "";

    var reasonId = opts.id ? "fd-dc-reason-" + opts.id : "";
    var hasWhy = !!(opts.stake || opts.whyText || (opts.evidence && opts.evidence.length));
    var whyButton = "";
    var whyPanel = "";

    // Why? only on the primary decision — secondary stays quiet until acted on.
    if (hasWhy && prominence === "primary") {
      var evidenceHtml = "";
      if (opts.evidence && opts.evidence.length) {
        evidenceHtml =
          '<ul class="fd-dc-evidence">' +
          opts.evidence
            .map(function (item) {
              return (
                "<li>" +
                escapeHtml(item.description || item.source || "") +
                "</li>"
              );
            })
            .join("") +
          "</ul>";
      }

      whyButton =
        '<button type="button" class="fd-dc-why" data-reason-toggle="' +
        escapeHtml(opts.id || "") +
        '" aria-expanded="false"' +
        (reasonId ? ' aria-controls="' + escapeHtml(reasonId) + '"' : "") +
        ">Why?</button>";

      whyPanel =
        '<div class="fd-dc-reason" id="' +
        escapeHtml(reasonId) +
        '" hidden>' +
        (opts.stake
          ? '<p class="fd-dc-stake">' + escapeHtml(opts.stake) + "</p>"
          : "") +
        (opts.whyText
          ? '<p class="fd-dc-reason-text">' + escapeHtml(opts.whyText) + "</p>"
          : "") +
        evidenceHtml +
        "</div>";
    }

    var actRow = "";
    if (opts.resolvedLabel) {
      actRow =
        '<div class="fd-dc-act">' +
        '<span class="fd-dc-resolved">' +
        escapeHtml(opts.resolvedLabel) +
        "</span>" +
        (whyButton || "") +
        "</div>";
    } else if (opts.actionLabel) {
      var primary;
      if (opts.href) {
        primary =
          '<a class="fd-dc-primary" href="' +
          escapeHtml(opts.href) +
          '">' +
          escapeHtml(opts.actionLabel) +
          "</a>";
      } else {
        primary =
          '<button type="button" class="fd-dc-primary"' +
          (opts.primaryAttrs || "") +
          ">" +
          escapeHtml(opts.actionLabel) +
          "</button>";
      }

      var secondary = "";
      if (opts.secondaryActions && opts.secondaryActions.length) {
        secondary =
          '<div class="fd-dc-secondary-actions">' +
          opts.secondaryActions
            .map(function (a) {
              return (
                '<button type="button" class="fd-dc-secondary-btn' +
                (a.strong ? " fd-dc-secondary-btn--strong" : "") +
                '"' +
                (a.attrs || "") +
                ">" +
                escapeHtml(a.label) +
                "</button>"
              );
            })
            .join("") +
          "</div>";
      }

      actRow =
        '<div class="fd-dc-act">' +
        primary +
        (whyButton || "") +
        secondary +
        "</div>";
    } else if (whyButton) {
      actRow = '<div class="fd-dc-act">' + whyButton + "</div>";
    }

    return (
      '<article class="' +
      classes +
      '"' +
      (opts.id ? ' data-id="' + escapeHtml(opts.id) + '"' : "") +
      (opts.group ? ' data-group="' + escapeHtml(opts.group) + '"' : "") +
      ">" +
      '<h2 class="fd-dc-situation">' +
      escapeHtml(situation) +
      "</h2>" +
      subject +
      guidance +
      actRow +
      whyPanel +
      "</article>"
    );
  }

  function renderPriorityBadge(priority, options) {
    var opts = options || {};
    if (priority === "critical") {
      if (!opts.urgentLabel) return "";
      return (
        '<span class="fd-ui-priority fd-ui-priority-critical">' +
        escapeHtml(opts.urgentLabel) +
        "</span>"
      );
    }
    if (priority !== "high") return "";
    return (
      '<span class="fd-ui-priority fd-ui-priority-' +
      escapeHtml(priority) +
      '">' +
      escapeHtml(Labels.priorityLabel(priority)) +
      "</span>"
    );
  }

  function renderReasoningToggle(itemId) {
    return (
      '<button type="button" class="fd-ui-why" data-reason-toggle="' +
      escapeHtml(itemId) +
      '" aria-expanded="false" aria-controls="reason-' +
      escapeHtml(itemId) +
      '">Why this matters</button>'
    );
  }

  function renderReasoningPanel(itemId, reason) {
    if (!reason) return "";
    return (
      '<div class="fd-ui-reason" id="reason-' +
      escapeHtml(itemId) +
      '" hidden>' +
      '<p class="fd-ui-reason-kicker">How I know</p>' +
      '<p class="fd-ui-reason-text">' +
      escapeHtml(reason) +
      "</p>" +
      "</div>"
    );
  }

  function renderStatusBadge(status) {
    if (!status) return "";
    var labels = {
      "needs-action": "Needs action",
      waiting: "Waiting",
      ready: "Ready",
      available: "Open",
      open: "Open",
      verified: "Verified",
      completed: "Done",
    };
    var label = labels[status];
    if (!label) return "";
    return (
      '<span class="fd-ui-status fd-ui-status-' +
      escapeHtml(status) +
      '">' +
      escapeHtml(label) +
      "</span>"
    );
  }

  /**
   * Receptionist welcome — greeting, calm subline, practice meta.
   */
  function quietGreeting(welcome) {
    var timeGreeting = timeGreetingForHour(new Date().getHours());
    // Role switch already identifies the person — keep the greeting impersonal.
    return timeGreeting + ".";
  }

  function renderReceptionistWelcome(options) {
    var opts = options || {};
    var welcome = opts.welcome || {};
    var subline =
      welcome.subline ||
      welcome.priority ||
      "You're well prepared. Let's start with today's priorities.";

    return (
      '<header class="fd-ui-receptionist-welcome" aria-live="polite">' +
      '<div class="fd-ui-receptionist-welcome-main">' +
      '<p class="fd-ui-welcome-greeting">' +
      escapeHtml(quietGreeting(welcome)) +
      "</p>" +
      '<p class="fd-ui-welcome-subline">' +
      escapeHtml(subline) +
      "</p>" +
      "</div>" +
      "</header>"
    );
  }

  /**
   * Attention cards — since yesterday at a glance.
   */
  function renderAttentionCards(cards) {
    if (!cards || cards.length === 0) {
      return (
        '<p class="fd-ui-attention-empty">' +
        escapeHtml("Nothing new overnight — you're starting fresh.") +
        "</p>"
      );
    }

    var html = '<div class="fd-ui-attention-grid">';
    cards.forEach(function (card) {
      var variant =
        card.variant === "red"
          ? " fd-ui-attention-card-red"
          : card.variant === "amber"
            ? " fd-ui-attention-card-amber"
            : " fd-ui-attention-card-blue";

      html += '<article class="fd-ui-attention-card' + variant + '">';

      if (card.type === "callback-preview") {
        html +=
          '<p class="fd-ui-attention-title">' +
          escapeHtml(card.title || "Callback waiting") +
          "</p>" +
          '<p class="fd-ui-attention-patient">' +
          escapeHtml(card.patientName || "") +
          "</p>" +
          '<p class="fd-ui-attention-preview">' +
          escapeHtml(card.preview || "") +
          "</p>" +
          '<button type="button" class="fd-ui-attention-btn"' +
          ' data-panel="' +
          escapeHtml(card.panel || "view-summary") +
          '" data-task-id="' +
          escapeHtml(card.taskId || "") +
          '">' +
          escapeHtml(card.actionLabel || "Open") +
          "</button>";
      } else if (card.type === "call-preview") {
        html +=
          '<p class="fd-ui-attention-patient">' +
          escapeHtml(card.patientName || "") +
          "</p>" +
          '<p class="fd-ui-attention-preview">' +
          escapeHtml(card.preview || "") +
          "</p>" +
          '<button type="button" class="fd-ui-attention-btn"' +
          ' data-panel="' +
          escapeHtml(card.panel || "view-summary") +
          '" data-task-id="' +
          escapeHtml(card.taskId || "") +
          '">' +
          escapeHtml(card.actionLabel || "Open") +
          "</button>";
      } else {
        html +=
          '<p class="fd-ui-attention-title">' +
          escapeHtml(card.title) +
          "</p>" +
          '<p class="fd-ui-attention-desc">' +
          escapeHtml(card.description) +
          "</p>";
      }

      html += "</article>";
    });
    html += "</div>";
    return html;
  }

  function renderWorkTaskButton(task) {
    var actionLabel = task.actionLabel || "Open";
    var panel = task.panel || task.actionId;

    if (task.panel || task.actionId === "verify-insurance" || task.actionId === "view-summary") {
      return (
        '<button type="button" class="fd-ui-work-btn"' +
        ' data-panel="' +
        escapeHtml(task.panel || task.actionId) +
        '" data-task-id="' +
        escapeHtml(task.id || "") +
        '">' +
        escapeHtml(actionLabel) +
        "</button>"
      );
    }

    var actionTag = task.actionHref ? "a" : "button";
    var actionAttrs = task.actionHref
      ? ' href="' + escapeHtml(task.actionHref) + '"'
      : ' type="button" data-action="' + escapeHtml(task.actionId || task.id || "") + '"';

    return (
      "<" +
      actionTag +
      ' class="fd-ui-work-btn"' +
      actionAttrs +
      ">" +
      escapeHtml(actionLabel) +
      "</" +
      actionTag +
      ">"
    );
  }

  /**
   * Urgent block — highest priority visual anchor.
   */
  function renderUrgentSection(tasks, emptyMessage) {
    var body =
      !tasks || tasks.length === 0
        ? renderEmptyState(emptyMessage || "You're clear — nothing urgent.")
        : renderWorkTaskList(tasks, emptyMessage, { anchor: true, urgentBlock: true });

    return (
      '<section class="fd-ui-urgent-block" aria-labelledby="mdUrgentHeading">' +
      '<h2 class="fd-ui-urgent-heading" id="mdUrgentHeading">Do first</h2>' +
      '<div class="fd-ui-urgent-inner">' +
      body +
      "</div></section>"
    );
  }

  /**
   * Today — tasks plus open schedule gaps.
   */
  function renderTodaySection(todayTasks, scheduleGaps, emptyMessage) {
    var html = "";

    if (scheduleGaps && scheduleGaps.length > 0) {
      html += '<ul class="fd-ui-schedule-gap-list">';
      scheduleGaps.forEach(function (gap) {
        var timeLabel = gap.time || gap.timeRange || "";
        html +=
          '<li class="fd-ui-schedule-gap">' +
          '<p class="fd-ui-schedule-gap-label">' +
          escapeHtml(gap.label || "Open") +
          renderStatusBadge(gap.status || "available") +
          "</p>" +
          '<p class="fd-ui-schedule-gap-time">' +
          escapeHtml(timeLabel) +
          "</p>" +
          '<p class="fd-ui-schedule-gap-provider">' +
          escapeHtml(gap.provider) +
          "</p>" +
          '<p class="fd-ui-schedule-gap-duration">' +
          escapeHtml(gap.duration) +
          "</p>" +
          "</li>";
      });
      html += "</ul>";
    }

    html += renderWorkTaskList(
      todayTasks,
      emptyMessage || "Nothing else on your list — keep the schedule moving.",
      { anchor: false }
    );

    return html;
  }

  function renderCallSummaryPanel(task, options) {
    var opts = options || {};
    var summary = task.callSummary || {};
    var urgency = summary.urgency || (task.priority === "critical" ? "Urgent" : "Routine");
    var urgencyClass =
      /urgent|critical|high/i.test(urgency) ? " fd-ui-panel-urgency-high" : " fd-ui-panel-urgency-routine";

    function fact(label, value) {
      if (!value) return "";
      return (
        '<dl class="fd-ui-panel-facts"><dt>' +
        escapeHtml(label) +
        "</dt><dd>" +
        escapeHtml(value) +
        "</dd></dl>"
      );
    }

    var headerHtml = "";
    if (!opts.compact) {
      headerHtml =
        '<p class="fd-ui-panel-patient-name">' +
        escapeHtml(summary.patientName || task.label || "Patient") +
        "</p>" +
        '<span class="fd-ui-panel-urgency' +
        urgencyClass +
        '">' +
        escapeHtml(urgency) +
        "</span>";
    }

    var nextStepHtml = "";
    if (!opts.compact && (summary.recommendedNextStep || summary.nextStep)) {
      nextStepHtml =
        '<div class="fd-ui-panel-next-block">' +
        '<p class="fd-ui-panel-subhead">Recommended next step</p>' +
        '<p class="fd-ui-panel-next-text">' +
        escapeHtml(summary.recommendedNextStep || summary.nextStep) +
        "</p></div>";
    }

    return (
      '<div class="fd-ui-panel-call-summary">' +
      headerHtml +
      fact("Caller", summary.caller) +
      fact("Date & time", summary.calledAt) +
      fact("Chief concern", summary.chiefConcern || summary.intent) +
      (summary.aiSummary
        ? '<div class="fd-ui-panel-ai-block">' +
          '<p class="fd-ui-panel-subhead">FreedomDesk summary</p>' +
          '<p class="fd-ui-panel-ai-text">' +
          escapeHtml(summary.aiSummary) +
          "</p></div>"
        : fact("Reason for call", summary.intent)) +
      nextStepHtml +
      (summary.phone
        ? '<p class="fd-ui-panel-phone"><span>Callback number</span> ' +
          escapeHtml(summary.phone) +
          "</p>"
        : "") +
      '<button type="button" class="fd-ui-panel-primary" data-action="start-callback">Start callback</button>' +
      "</div>"
    );
  }

  function renderInsurancePanel(task) {
    var ins = task.insurancePanel || {};
    var missing = ins.missing || [];

    var missingHtml = "";
    if (missing.length > 0) {
      missingHtml = '<ul class="fd-ui-panel-missing">';
      missing.forEach(function (item) {
        missingHtml += "<li>" + escapeHtml(item) + "</li>";
      });
      missingHtml += "</ul>";
    }

    return (
      '<div class="fd-ui-panel-insurance">' +
      '<dl class="fd-ui-panel-insurance-grid">' +
      "<dt>Insurance company</dt><dd>" +
      escapeHtml(ins.company || "—") +
      "</dd>" +
      "<dt>Subscriber</dt><dd>" +
      escapeHtml(ins.subscriber || "—") +
      "</dd>" +
      "<dt>Verification status</dt><dd>" +
      escapeHtml(ins.status || "Not verified") +
      "</dd>" +
      "<dt>Coverage</dt><dd>" +
      escapeHtml(ins.coverage || "Primary") +
      "</dd>" +
      "<dt>Last verified</dt><dd>" +
      escapeHtml(ins.lastVerified || "Never") +
      "</dd>" +
      "</dl>" +
      (missing.length > 0
        ? '<div class="fd-ui-panel-missing-wrap"><p class="fd-ui-panel-subhead">Missing information</p>' +
          missingHtml +
          "</div>"
        : "") +
      (ins.benefitsNote
        ? '<p class="fd-ui-panel-note">' + escapeHtml(ins.benefitsNote) + "</p>"
        : "") +
      '<button type="button" class="fd-ui-panel-primary" data-action="verify-now">Verify now</button>' +
      "</div>"
    );
  }

  function panelTitleFor(panelType, task) {
    if (panelType === "verify-insurance") return "Verify insurance";
    if (panelType === "view-summary" || panelType === "call-summary") return "Call summary";
    return task.label || "Details";
  }

  function renderPanelContent(panelType, task, options) {
    var opts = options || {};
    if (panelType === "verify-insurance") return renderInsurancePanel(task);
    return renderCallSummaryPanel(task, opts);
  }

  function renderContextPanel(panelType, task, contextOptions) {
    var ctxOpts = contextOptions || {};
    var Engine = window.FreedomDeskContextEngine;
    if (!Engine) {
      return renderPanelContent(panelType, task);
    }

    var ctx = Engine.resolve(panelType, task || {});
    var html =
      Engine.renderSituationHeader(ctx) +
      Engine.renderRecommendation(ctx) +
      '<div class="fd-ctx-detail">' +
      renderPanelContent(panelType, task, { compact: true }) +
      "</div>" +
      Engine.renderContextCapture(ctx, ctxOpts.attachedNotes || []);

    return '<div class="fd-coord-context">' + html + "</div>";
  }

  function openWorkPanel(panelType, task, _elements) {
    var Coord = window.FreedomDeskCoordinationPanel;
    if (Coord) {
      Coord.openContext(panelType, task || {});
      return;
    }
  }

  function closeWorkPanel(_elements) {
    var Coord = window.FreedomDeskCoordinationPanel;
    if (Coord) {
      Coord.close();
    }
  }

  /**
   * Since yesterday — legacy token line (doctor / fallback).
   */
  function renderSinceYesterday(sinceYesterday) {
    var data = sinceYesterday || {};
    var tokens = data.tokens || [];

    if (tokens.length === 0) {
      return (
        '<p class="fd-ui-since-yesterday fd-ui-since-yesterday-empty">' +
        '<span class="fd-ui-since-label">Since yesterday:</span> ' +
        escapeHtml(data.emptyMessage || "Nothing new overnight.") +
        "</p>"
      );
    }

    var html =
      '<p class="fd-ui-since-yesterday">' +
      '<span class="fd-ui-since-label">Since yesterday:</span> ';

    tokens.forEach(function (token, index) {
      if (index > 0) html += '<span class="fd-ui-since-sep" aria-hidden="true">·</span>';
      html += '<span class="fd-ui-since-token">' + escapeHtml(token.text) + "</span>";
    });

    html += "</p>";
    return html;
  }

  /**
   * Work task — label, instruction, verb-first action button.
   */
  function renderWorkTaskItem(task, index, options) {
    var opts = options || {};
    var priority = task.priority || "medium";
    var isFirstCritical =
      opts.anchor && priority === "critical" && opts.showFirstCritical;
    var extraClass = "";
    if (isFirstCritical && !opts.urgentBlock) extraClass = " fd-ui-work-item-critical";
    if (opts.urgentBlock) extraClass += " fd-ui-work-item-urgent-block";

    var recommendationHtml = "";
    if (opts.urgentBlock && task.recommendedNextStep) {
      recommendationHtml =
        '<p class="fd-ui-work-recommendation">' +
        '<span class="fd-ui-work-recommendation-label">Recommended next step:</span> ' +
        escapeHtml(task.recommendedNextStep) +
        "</p>";
    }

    return (
      '<li class="fd-ui-work-item' +
      extraClass +
      '">' +
      '<div class="fd-ui-work-body">' +
      '<p class="fd-ui-work-label">' +
      escapeHtml(task.label) +
      renderStatusBadge(task.status) +
      "</p>" +
      '<p class="fd-ui-work-instruction">' +
      escapeHtml(task.instruction) +
      "</p>" +
      recommendationHtml +
      "</div>" +
      renderWorkTaskButton(task) +
      "</li>"
    );
  }

  function renderWorkTaskList(tasks, emptyMessage, options) {
    if (!tasks || tasks.length === 0) {
      return renderEmptyState(emptyMessage || "You're clear — nothing here.");
    }

    var opts = options || {};
    var criticalShown = false;
    var html = '<ul class="fd-ui-work-list' + (opts.urgentBlock ? " fd-ui-work-list-urgent" : "") + '">';
    tasks.forEach(function (task, index) {
      var isCritical = (task.priority || "medium") === "critical";
      var showFirst = isCritical && opts.anchor && !criticalShown && !opts.urgentBlock;
      if (showFirst) criticalShown = true;
      html += renderWorkTaskItem(task, index, {
        anchor: opts.anchor,
        showFirstCritical: showFirst,
        urgentBlock: opts.urgentBlock,
      });
    });
    html += "</ul>";
    return html;
  }

  /**
   * Small contextual icon for reminder rows — inferred from text, not stored in data.
   */
  function headsUpIcon(text) {
    var t = (text || "").toLowerCase();
    if (/crown|seat|#1[0-9]/.test(t)) return "🦷";
    if (/new patient|npe|first visit/.test(t)) return "👤";
    if (/rep|patterson|vendor|sales/.test(t)) return "📋";
    if (/lab|pickup|case/.test(t)) return "📦";
    if (/huddle|meeting|team/.test(t)) return "👥";
    if (/payroll|admin|billing/.test(t)) return "📌";
    if (/hygiene|recall|prophy/.test(t)) return "🪥";
    return "•";
  }

  /**
   * Heads up — time + short phrase, awareness only.
   */
  function renderHeadsUpList(items, emptyMessage) {
    if (!items || items.length === 0) {
      return renderEmptyState(emptyMessage || "Nothing else on the radar today.");
    }

    var html = '<ul class="fd-ui-heads-up-list">';
    items.forEach(function (item) {
      html +=
        '<li class="fd-ui-heads-up-item">' +
        (item.time
          ? '<span class="fd-ui-heads-up-time">' + escapeHtml(item.time) + "</span>"
          : '<span class="fd-ui-heads-up-time fd-ui-heads-up-time-empty" aria-hidden="true"></span>') +
        '<span class="fd-ui-heads-up-text">' +
        escapeHtml(item.text) +
        "</span>" +
        "</li>";
    });
    html += "</ul>";
    return html;
  }

  /**
   * Task row with a direct action — legacy receptionist format (doctor modules).
   */
  function renderTaskItem(task, index, options) {
    var opts = options || {};
    var id = task.id || "task-" + index;
    var priority = task.priority || "medium";
    var isImmediate = priority === "critical" && opts.showImmediateAttention;
    var needsAttention = isImmediate ? " fd-ui-task-needs-attention" : "";
    var actionLabel = task.actionLabel || "View summary";
    var actionTag = task.actionHref ? "a" : "button";
    var actionAttrs = task.actionHref
      ? ' href="' + escapeHtml(task.actionHref) + '"'
      : ' type="button" data-action="' + escapeHtml(task.actionId || id) + '"';

    return (
      '<li class="fd-ui-task-item fd-ui-task-' +
      escapeHtml(priority) +
      needsAttention +
      '">' +
      '<div class="fd-ui-task-content">' +
      '<p class="fd-ui-task-action">' +
      escapeHtml(task.action) +
      "</p>" +
      (task.context
        ? '<p class="fd-ui-task-context">' + escapeHtml(task.context) + "</p>"
        : "") +
      '<div class="fd-ui-task-meta">' +
      renderPriorityBadge(priority, {
        urgentLabel: isImmediate ? "Needs you now" : "",
      }) +
      (task.reason ? renderReasoningToggle(id) : "") +
      "</div>" +
      (task.reason ? renderReasoningPanel(id, task.reason) : "") +
      "</div>" +
      "<" +
      actionTag +
      ' class="fd-ui-task-btn"' +
      actionAttrs +
      ">" +
      escapeHtml(actionLabel) +
      "</" +
      actionTag +
      ">" +
      "</li>"
    );
  }

  function renderTaskList(tasks, emptyMessage, options) {
    if (!tasks || tasks.length === 0) {
      return renderEmptyState(emptyMessage || "You're clear for now — nothing here.");
    }

    var opts = options || {};
    var immediateShown = false;
    var html = '<ol class="fd-ui-task-list">';
    tasks.forEach(function (task, index) {
      var isCritical = (task.priority || "medium") === "critical";
      var showImmediate = isCritical && opts.anchorUrgent && !immediateShown;
      if (showImmediate) immediateShown = true;
      html += renderTaskItem(task, index, {
        showImmediateAttention: showImmediate,
      });
    });
    html += "</ol>";
    return html;
  }

  /**
   * Brief change log — since your last login.
   */
  function renderChangeList(changes, emptyMessage) {
    if (!changes || changes.length === 0) {
      return renderEmptyState(emptyMessage || "Nothing new since you were last here.");
    }

    var html = '<ul class="fd-ui-change-list">';
    changes.forEach(function (change) {
      html +=
        '<li class="fd-ui-change-item">' +
        '<p class="fd-ui-change-text">' +
        escapeHtml(change.text) +
        "</p>" +
        (change.detail
          ? '<p class="fd-ui-change-detail">' + escapeHtml(change.detail) + "</p>"
          : "") +
        "</li>";
    });
    html += "</ul>";
    return html;
  }

  /**
   * Awareness items — coming up and reminders (no primary action required).
   */
  function renderAwarenessList(items, emptyMessage) {
    if (!items || items.length === 0) {
      return renderEmptyState(emptyMessage || "Nothing flagged here.");
    }

    var html = '<ul class="fd-ui-awareness-list">';
    items.forEach(function (item, index) {
      var id = item.id || "aware-" + index;
      html +=
        '<li class="fd-ui-awareness-item">' +
        '<p class="fd-ui-awareness-action">' +
        escapeHtml(item.action || item.text) +
        "</p>" +
        (item.context
          ? '<p class="fd-ui-awareness-context">' + escapeHtml(item.context) + "</p>"
          : "") +
        (item.actionLabel && (item.actionHref || item.actionId)
          ? (function () {
              var tag = item.actionHref ? "a" : "button";
              var attrs = item.actionHref
                ? ' href="' + escapeHtml(item.actionHref) + '"'
                : ' type="button" data-action="' + escapeHtml(item.actionId || id) + '"';
              return (
                "<" +
                tag +
                ' class="fd-ui-awareness-link"' +
                attrs +
                ">" +
                escapeHtml(item.actionLabel) +
                "</" +
                tag +
                ">"
              );
            })()
          : "") +
        "</li>";
    });
    html += "</ul>";
    return html;
  }

  function renderReminderList(reminders, emptyMessage) {
    if (!reminders || reminders.length === 0) {
      return renderEmptyState(emptyMessage || "No reminders for today.");
    }

    var html = '<ul class="fd-ui-reminder-list">';
    reminders.forEach(function (item) {
      html +=
        '<li class="fd-ui-reminder-item">' +
        '<p class="fd-ui-reminder-text">' +
        escapeHtml(item.text) +
        "</p>" +
        "</li>";
    });
    html += "</ul>";
    return html;
  }

  /**
   * Numbered priority action — expandable reasoning on demand (doctor view).
   */
  function renderPriorityItem(item, index, options) {
    var opts = options || {};
    var id = item.id || "priority-" + index;
    var priority = item.priority || "medium";
    var isImmediate = priority === "critical" && opts.showImmediateAttention;
    var needsAttention = isImmediate ? " fd-ui-priority-needs-attention" : "";
    return (
      '<li class="fd-ui-priority-item fd-ui-priority-' +
      escapeHtml(priority) +
      needsAttention +
      '">' +
      '<p class="fd-ui-priority-action">' +
      escapeHtml(item.action || item.recommendation || item.title) +
      "</p>" +
      '<div class="fd-ui-priority-meta">' +
      renderPriorityBadge(priority, {
        urgentLabel: isImmediate ? "Needs you now" : "",
      }) +
      (item.owner ? '<span class="fd-ui-owner">' + escapeHtml(Labels.ownerLabel(item.owner)) + "</span>" : "") +
      renderReasoningToggle(id) +
      "</div>" +
      renderReasoningPanel(id, item.reason) +
      "</li>"
    );
  }

  function renderPriorityList(items, emptyMessage) {
    if (!items || items.length === 0) {
      return renderEmptyState(emptyMessage || "You're clear for now — nothing urgent flagged.");
    }

    var immediateShown = false;
    var html = '<ol class="fd-ui-priority-list">';
    items.forEach(function (item, index) {
      var isCritical = (item.priority || "medium") === "critical";
      var showImmediate = isCritical && !immediateShown;
      if (showImmediate) immediateShown = true;
      html += renderPriorityItem(item, index, { showImmediateAttention: showImmediate });
    });
    html += "</ol>";
    return html;
  }

  function renderPatientItem(patient, index) {
    var id = patient.id || "patient-" + index;
    var actionLine = patient.action && patient.action !== patient.issue ? patient.action : patient.issue;
    var contextLine = patient.action && patient.action !== patient.issue ? patient.issue : "";
    return (
      '<li class="fd-ui-patient-item">' +
      '<div class="fd-ui-patient-header">' +
      '<span class="fd-ui-patient-name">' +
      escapeHtml(patient.name) +
      "</span>" +
      "</div>" +
      '<p class="fd-ui-patient-action">' +
      escapeHtml(actionLine) +
      "</p>" +
      (contextLine ? '<p class="fd-ui-patient-issue">' + escapeHtml(contextLine) + "</p>" : "") +
      (patient.reason
        ? '<div class="fd-ui-patient-meta">' + renderReasoningToggle(id) + "</div>" + renderReasoningPanel(id, patient.reason)
        : "") +
      "</li>"
    );
  }

  function renderPatientList(patients, emptyMessage) {
    if (!patients || patients.length === 0) {
      return renderEmptyState(emptyMessage || "No patients need special attention right now.");
    }

    var html = '<ul class="fd-ui-patient-list">';
    patients.forEach(function (patient, index) {
      html += renderPatientItem(patient, index);
    });
    html += "</ul>";
    return html;
  }

  function renderOpportunityItem(opp, index) {
    var id = opp.id || "opp-" + index;
    var actionLine = opp.action || opp.title;
    var contextLine = opp.action ? opp.title : opp.description;
    return (
      '<li class="fd-ui-opp-item">' +
      '<p class="fd-ui-opp-action">' +
      escapeHtml(actionLine) +
      "</p>" +
      (contextLine
        ? '<p class="fd-ui-opp-desc">' + escapeHtml(contextLine) + "</p>"
        : "") +
      (opp.reason
        ? '<div class="fd-ui-opp-meta">' + renderReasoningToggle(id) + "</div>" + renderReasoningPanel(id, opp.reason)
        : "") +
      "</li>"
    );
  }

  function renderOpportunityList(opportunities, emptyMessage) {
    if (!opportunities || opportunities.length === 0) {
      return renderEmptyState(emptyMessage || "No opportunities flagged today.");
    }

    var html = '<ul class="fd-ui-opp-list">';
    opportunities.forEach(function (opp, index) {
      html += renderOpportunityItem(opp, index);
    });
    html += "</ul>";
    return html;
  }

  function renderInsight(insight) {
    if (!insight || !insight.text) {
      return renderEmptyState("Practice insights will appear as data accumulates.");
    }

    return (
      '<div class="fd-ui-insight">' +
      '<p class="fd-ui-insight-text">' +
      escapeHtml(insight.text) +
      "</p>" +
      (insight.detail
        ? '<p class="fd-ui-insight-detail">' + escapeHtml(insight.detail) + "</p>"
        : "") +
      "</div>"
    );
  }

  function renderQuickActions(actions) {
    if (!actions || actions.length === 0) {
      return renderEmptyState("Quick actions will appear here.");
    }

    var html = '<div class="fd-ui-actions">';
    actions.forEach(function (action) {
      var tag = action.href ? "a" : "button";
      var attrs = action.href
        ? ' href="' + escapeHtml(action.href) + '"'
        : ' type="button" data-action="' + escapeHtml(action.id || "") + '"';
      html +=
        "<" +
        tag +
        ' class="fd-ui-action-btn"' +
        attrs +
        '><span class="fd-ui-action-label">' +
        escapeHtml(action.label) +
        '</span><span class="fd-ui-action-arrow" aria-hidden="true">→</span></' +
        tag +
        ">";
    });
    html += "</div>";
    return html;
  }

  function timeGreetingForHour(hour) {
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }

  function renderGreeting(options) {
    var opts = options || {};
    var timeGreeting = timeGreetingForHour(new Date().getHours());

    return (
      '<header class="fd-ui-greeting">' +
      '<div class="fd-ui-greeting-main">' +
      '<p class="fd-ui-greeting-kicker">Today</p>' +
      '<h2 class="fd-ui-greeting-title">' +
      escapeHtml(timeGreeting) +
      ", <span>" +
      escapeHtml(opts.recipientName || "there") +
      "</span></h2>" +
      '<p class="fd-ui-greeting-meta">' +
      escapeHtml(opts.practiceName || "") +
      " · " +
      escapeHtml(Utils.formatDate(opts.date || new Date().toISOString().slice(0, 10))) +
      "</p>" +
      "</div>" +
      "</header>"
    );
  }

  /**
   * Doctor clinical briefing — calm welcome block.
   */
  function renderDoctorClinicalWelcome(options) {
    var opts = options || {};
    var welcome = opts.welcome || {};

    return (
      '<header class="fd-ui-doctor-welcome" aria-live="polite">' +
      '<p class="fd-ui-welcome-greeting">' +
      escapeHtml(quietGreeting(welcome)) +
      "</p>" +
      '<p class="fd-ui-welcome-subline">' +
      escapeHtml(welcome.subline || "You have a full clinical day.") +
      "</p>" +
      "</header>"
    );
  }

  function renderDoctorSchedule(appointments, emptyMessage) {
    if (!appointments || appointments.length === 0) {
      return renderEmptyState(emptyMessage || "Schedule unavailable.");
    }

    var html = '<ol class="fd-ui-doctor-schedule">';
    appointments.forEach(function (appt) {
      var rowClass = "fd-ui-doctor-schedule-row";
      if (appt.isBlock) rowClass += " fd-ui-doctor-schedule-row-block";
      if (appt.isOpen) rowClass += " fd-ui-doctor-schedule-row-open";

      html += '<li class="' + rowClass + '">';
      html += '<span class="fd-ui-doctor-schedule-time">' + escapeHtml(appt.time) + "</span>";
      html += '<div class="fd-ui-doctor-schedule-detail">';

      if (appt.patientName && !appt.isBlock) {
        html +=
          '<p class="fd-ui-doctor-schedule-patient">' +
          escapeHtml(appt.patientName) +
          "</p>";
      }

      html +=
        '<p class="fd-ui-doctor-schedule-procedure">' +
        escapeHtml(appt.procedure) +
        "</p></div></li>";
    });
    html += "</ol>";
    return html;
  }

  function renderDoctorTasks(tasks, emptyMessage) {
    if (!tasks || tasks.length === 0) {
      return renderEmptyState(emptyMessage || "No clinical tasks flagged today.");
    }

    var html = '<ul class="fd-ui-doctor-task-list">';
    tasks.forEach(function (task) {
      html +=
        '<li class="fd-ui-doctor-task-item">' +
        '<p class="fd-ui-doctor-task-label">' +
        escapeHtml(task.label) +
        "</p>" +
        '<p class="fd-ui-doctor-task-detail">' +
        escapeHtml(task.detail || "") +
        "</p>" +
        "</li>";
    });
    html += "</ul>";
    return html;
  }

  function renderClinicalPriorities(priorities, emptyMessage) {
    if (!priorities || priorities.length === 0) {
      return renderEmptyState(emptyMessage || "No clinical priorities flagged today.");
    }

    var html = '<ol class="fd-ui-clinical-list">';
    priorities.forEach(function (item) {
      html +=
        '<li class="fd-ui-clinical-item">' +
        '<p class="fd-ui-clinical-label">' +
        escapeHtml(item.label) +
        "</p>" +
        '<p class="fd-ui-clinical-detail">' +
        escapeHtml(item.detail) +
        "</p>" +
        "</li>";
    });
    html += "</ol>";
    return html;
  }

  function renderDoctorScheduleSummary(lines, emptyMessage) {
    if (!lines || lines.length === 0) {
      return renderEmptyState(emptyMessage || "Schedule summary unavailable.");
    }

    var html = '<ul class="fd-ui-schedule-summary-list">';
    lines.forEach(function (line) {
      html += '<li class="fd-ui-schedule-summary-item">' + escapeHtml(line) + "</li>";
    });
    html += "</ul>";
    return html;
  }

  function renderClinicalOpportunity(opportunity) {
    if (!opportunity || !opportunity.text) return "";
    return '<p class="fd-ui-clinical-opportunity-text">' + escapeHtml(opportunity.text) + "</p>";
  }

  function renderMorningSummary(options) {
    var opts = options || {};
    var summary = opts.summary || {};
    var timeGreeting = timeGreetingForHour(new Date().getHours());
    var greetingLine =
      summary.greeting ||
      timeGreeting + ", " + (opts.recipientName || "there") + ".";
    var bodyLine =
      summary.body ||
      "Today looks well prepared. No urgent issues detected.";
    var signoffLine =
      summary.signoff ||
      "I've already looked over today's schedule — here's what I'd focus on.";

    return (
      '<header class="fd-ui-morning-summary" aria-live="polite">' +
      '<div class="fd-ui-morning-summary-main">' +
      '<p class="fd-ui-morning-greeting">' +
      escapeHtml(greetingLine) +
      "</p>" +
      '<p class="fd-ui-morning-body">' +
      escapeHtml(bodyLine) +
      "</p>" +
      '<p class="fd-ui-morning-signoff">' +
      escapeHtml(signoffLine) +
      "</p>" +
      '<p class="fd-ui-morning-meta">' +
      escapeHtml(opts.practiceName || "") +
      " · " +
      escapeHtml(Utils.formatDate(opts.date || new Date().toISOString().slice(0, 10))) +
      "</p>" +
      "</div>" +
      "</header>"
    );
  }

  /**
   * Single-sentence emotional takeaway — the closing thought of the page.
   */
  function renderTodaysFocus(text) {
    if (!text) return "";

    return (
      '<footer class="fd-ui-todays-focus" aria-label="Today\'s focus">' +
      '<p class="fd-ui-todays-focus-label">Today\'s focus</p>' +
      '<p class="fd-ui-todays-focus-text">' +
      escapeHtml(text) +
      "</p>" +
      "</footer>"
    );
  }

  function renderRoleSwitcher(roles, activeRoleId) {
    var html = '<div class="fd-ui-role-switcher" role="tablist" aria-label="View as">';
    Object.keys(roles).forEach(function (roleId) {
      var role = roles[roleId];
      var isActive = roleId === activeRoleId;
      html +=
        '<button type="button" class="fd-ui-role-btn' +
        (isActive ? " fd-ui-role-btn-active" : "") +
        '" role="tab" aria-selected="' +
        isActive +
        '" data-role="' +
        escapeHtml(roleId) +
        '">' +
        escapeHtml(role.label) +
        "</button>";
    });
    html += "</div>";
    return html;
  }

  function renderSectionCard(title, bodyHtml, options) {
    var opts = options || {};
    var extraClass = opts.compact ? " fd-ui-card-compact" : "";
    extraClass += opts.emphasis ? " fd-ui-card-emphasis" : "";
    extraClass += opts.quiet ? " fd-ui-card-quiet" : "";
    var idAttr = opts.id ? ' id="' + escapeHtml(opts.id) + '"' : "";
    var headingId = opts.id ? opts.id + "-heading" : "";
    var labelledBy = title && headingId ? ' aria-labelledby="' + escapeHtml(headingId) + '"' : "";
    var titleHtml = title
      ? '<h3 class="fd-ui-section-title" id="' +
        escapeHtml(headingId || "section-heading") +
        '">' +
        escapeHtml(title) +
        "</h3>"
      : "";

    return (
      '<section class="fd-ui-card' +
      extraClass +
      '"' +
      idAttr +
      labelledBy +
      ">" +
      titleHtml +
      '<div class="fd-ui-card-body">' +
      bodyHtml +
      "</div>" +
      "</section>"
    );
  }

  function bindReasoningToggles(container) {
    if (!container) return;

    container.addEventListener("click", function (event) {
      var btn = event.target.closest("[data-reason-toggle]");
      if (!btn || !container.contains(btn)) return;

      var targetId = btn.getAttribute("data-reason-toggle");
      var panel =
        container.querySelector("#fd-dc-reason-" + CSS.escape(targetId)) ||
        container.querySelector("#reason-" + CSS.escape(targetId));
      if (!panel) return;

      var isExpanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", isExpanded ? "false" : "true");
      panel.hidden = isExpanded;
    });
  }

  window.FreedomDeskUI = {
    renderGreeting: renderGreeting,
    renderMorningSummary: renderMorningSummary,
    renderReceptionistWelcome: renderReceptionistWelcome,
    renderDoctorClinicalWelcome: renderDoctorClinicalWelcome,
    renderDoctorSchedule: renderDoctorSchedule,
    renderDoctorTasks: renderDoctorTasks,
    renderClinicalPriorities: renderClinicalPriorities,
    renderAttentionCards: renderAttentionCards,
    renderSinceYesterday: renderSinceYesterday,
    renderUrgentSection: renderUrgentSection,
    renderTodaySection: renderTodaySection,
    renderWorkTaskList: renderWorkTaskList,
    renderHeadsUpList: renderHeadsUpList,
    openWorkPanel: openWorkPanel,
    closeWorkPanel: closeWorkPanel,
    panelTitleFor: panelTitleFor,
    renderPanelContent: renderPanelContent,
    renderContextPanel: renderContextPanel,
    renderTodaysFocus: renderTodaysFocus,
    renderRoleSwitcher: renderRoleSwitcher,
    renderSectionCard: renderSectionCard,
    renderTaskList: renderTaskList,
    renderChangeList: renderChangeList,
    renderAwarenessList: renderAwarenessList,
    renderReminderList: renderReminderList,
    renderPriorityList: renderPriorityList,
    renderPatientList: renderPatientList,
    renderOpportunityList: renderOpportunityList,
    renderInsight: renderInsight,
    renderQuickActions: renderQuickActions,
    renderEmptyState: renderEmptyState,
    renderDecisionCard: renderDecisionCard,
    bindReasoningToggles: bindReasoningToggles,
  };
})();
