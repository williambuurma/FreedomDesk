/**
 * Reusable dashboard UI renderers — My Day, Morning Brief, and future role views.
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

  /**
   * Task row with a direct action — receptionist workday surface.
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
      '<p class="fd-ui-greeting-kicker">My Day</p>' +
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
      (opts.roleSwitcherHtml || "") +
      "</header>"
    );
  }

  /**
   * Conversational morning summary — reads like an experienced office manager.
   */
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
      (opts.roleSwitcherHtml || "") +
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
    var idAttr = opts.id ? ' id="' + escapeHtml(opts.id) + '"' : "";
    var labelledBy = opts.id ? ' aria-labelledby="' + escapeHtml(opts.id) + '-heading"' : "";

    return (
      '<section class="fd-ui-card' +
      extraClass +
      '"' +
      idAttr +
      labelledBy +
      ">" +
      '<h3 class="fd-ui-section-title" id="' +
      escapeHtml(opts.id || "section") +
      '-heading">' +
      escapeHtml(title) +
      "</h3>" +
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
      var panel = container.querySelector("#reason-" + CSS.escape(targetId));
      if (!panel) return;

      var isExpanded = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", isExpanded ? "false" : "true");
      panel.hidden = isExpanded;
    });
  }

  window.FreedomDeskUI = {
    renderGreeting: renderGreeting,
    renderMorningSummary: renderMorningSummary,
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
    bindReasoningToggles: bindReasoningToggles,
  };
})();
