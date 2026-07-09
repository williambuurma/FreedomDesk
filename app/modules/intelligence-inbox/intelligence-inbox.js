/**
 * Next — decision-first operating surface.
 * Architecture unchanged: Actions materialized from Operational Events.
 * Product lens: lead with what to do, not what happened.
 */
(function () {
  "use strict";

  var PREVIEW_URL = "../data/intelligence-inbox-preview.json";
  var STORAGE_KEY = "freedomdesk_intelligence_inbox_status";

  var Utils = window.FreedomDeskUtils;
  var Labels = window.FreedomDeskLabels;

  var DOCTOR_ROLES = { dentist: true, assistant: true };
  var FRONT_DESK_ROLES = { front_desk: true, office_manager: true, hygiene_coordinator: true };

  var state = {
    actions: [],
    tab: "needs_action",
    eventsBound: false,
    root: null,
  };

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    return Utils.escapeHtml(str);
  }

  function loadStatusOverrides() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      var parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (_e) {
      return {};
    }
  }

  function saveStatusOverrides(overrides) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
    } catch (_e) {
      /* ignore */
    }
  }

  function applyStatusOverrides(actions) {
    var overrides = loadStatusOverrides();
    return actions.map(function (action) {
      var next = overrides[action.id];
      if (!next) return action;
      return Object.assign({}, action, { status: next });
    });
  }

  function setActionStatus(actionId, status) {
    var overrides = loadStatusOverrides();
    overrides[actionId] = status;
    saveStatusOverrides(overrides);
    state.actions = state.actions.map(function (a) {
      if (a.id !== actionId) return a;
      return Object.assign({}, a, { status: status });
    });
    render();
  }

  function statusLabel(status) {
    var map = {
      needs_action: "Open",
      committed: "Committed",
      completed: "Done",
      dismissed: "Dismissed",
    };
    return map[status] || status;
  }

  function roleLabel(role) {
    return Labels.ownerLabel(role);
  }

  function confidenceLabel(confidence) {
    if (typeof confidence !== "number") return "";
    return Math.round(confidence * 100) + "%";
  }

  function decisionHeadline(action) {
    return action.decision || action.recommendedNextStep || action.verb || action.whatHappened;
  }

  function filterForTab(actions, tab) {
    if (tab === "needs_action") {
      return actions.filter(function (a) {
        return a.status === "needs_action" || a.status === "committed";
      });
    }
    if (tab === "doctor") {
      return actions.filter(function (a) {
        return (
          DOCTOR_ROLES[a.primaryResponsibility] &&
          (a.status === "needs_action" || a.status === "committed")
        );
      });
    }
    if (tab === "front_desk") {
      return actions.filter(function (a) {
        return (
          FRONT_DESK_ROLES[a.primaryResponsibility] &&
          (a.status === "needs_action" || a.status === "committed")
        );
      });
    }
    if (tab === "completed") {
      return actions.filter(function (a) {
        return a.status === "completed" || a.status === "dismissed";
      });
    }
    return actions;
  }

  function sortActions(actions) {
    var tierRank = { critical: 0, important: 1, informational: 2 };
    var statusRank = { needs_action: 0, committed: 1, completed: 2, dismissed: 3 };
    return actions.slice().sort(function (a, b) {
      var sa = statusRank[a.status] ?? 9;
      var sb = statusRank[b.status] ?? 9;
      if (sa !== sb) return sa - sb;
      var ta = tierRank[a.urgencyTier] ?? 9;
      var tb = tierRank[b.urgencyTier] ?? 9;
      if (ta !== tb) return ta - tb;
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
  }

  function tabCounts(actions) {
    return {
      needs_action: filterForTab(actions, "needs_action").length,
      doctor: filterForTab(actions, "doctor").length,
      front_desk: filterForTab(actions, "front_desk").length,
      completed: filterForTab(actions, "completed").length,
    };
  }

  function evidenceHtml(evidence) {
    if (!evidence || !evidence.length) {
      return '<p class="ii-why-empty">No supporting evidence yet.</p>';
    }
    return (
      '<ul class="ii-evidence">' +
      evidence
        .map(function (item) {
          return (
            "<li>" +
            escapeHtml(item.description || item.source || "") +
            "</li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  function actionButtonsHtml(action) {
    if (action.status === "completed" || action.status === "dismissed") {
      return (
        '<div class="ii-card-actions">' +
        '<span class="ii-card-resolved">' +
        escapeHtml(statusLabel(action.status)) +
        "</span>" +
        "</div>"
      );
    }

    var commitLabel = action.status === "committed" ? "Committed" : "I'll do this";
    var commitDisabled = action.status === "committed" ? " disabled" : "";
    return (
      '<div class="ii-card-actions">' +
      '<button type="button" class="ii-btn ii-btn-primary" data-action="commit" data-id="' +
      escapeHtml(action.id) +
      '"' +
      commitDisabled +
      ">" +
      commitLabel +
      "</button>" +
      '<button type="button" class="ii-btn" data-action="complete" data-id="' +
      escapeHtml(action.id) +
      '">Done</button>' +
      '<button type="button" class="ii-btn ii-btn-quiet" data-action="dismiss" data-id="' +
      escapeHtml(action.id) +
      '">Not needed</button>' +
      "</div>"
    );
  }

  function renderCard(action) {
    var headline = decisionHeadline(action);
    var ifIgnored = action.ifIgnored
      ? '<p class="ii-card-cost">If ignored — ' + escapeHtml(action.ifIgnored) + "</p>"
      : "";

    var metaBits = [roleLabel(action.primaryResponsibility)];
    if (typeof action.confidence === "number") {
      metaBits.push(confidenceLabel(action.confidence) + " sure");
    }
    if (action.status === "committed") {
      metaBits.push("Committed");
    }

    var urgencyClass =
      action.urgencyTier === "critical" ? " ii-card-urgent" : "";

    return (
      '<article class="ii-card' +
      urgencyClass +
      " ii-card-status-" +
      escapeHtml(action.status) +
      '" data-id="' +
      escapeHtml(action.id) +
      '">' +
      '<h2 class="ii-card-title">' +
      escapeHtml(headline) +
      "</h2>" +
      '<p class="ii-card-why">' +
      escapeHtml(action.because) +
      "</p>" +
      ifIgnored +
      '<p class="ii-card-meta">' +
      escapeHtml(metaBits.join(" · ")) +
      "</p>" +
      '<button type="button" class="ii-why" data-reason-toggle="' +
      escapeHtml(action.id) +
      '" aria-expanded="false" aria-controls="ii-reason-' +
      escapeHtml(action.id) +
      '">Why?</button>' +
      '<div class="ii-reason" id="ii-reason-' +
      escapeHtml(action.id) +
      '" hidden>' +
      (action.whatHappened
        ? '<p class="ii-reason-context">' + escapeHtml(action.whatHappened) + "</p>"
        : "") +
      evidenceHtml(action.evidence) +
      "</div>" +
      actionButtonsHtml(action) +
      "</article>"
    );
  }

  function emptyStateHtml(tab) {
    var messages = {
      needs_action: "You're clear. Nothing needs a decision right now.",
      doctor: "Nothing waiting for the doctor.",
      front_desk: "Nothing waiting for the front desk.",
      completed: "No finished items yet.",
    };
    return (
      '<div class="ii-empty">' +
      "<p>" +
      escapeHtml(messages[tab] || "Nothing here.") +
      "</p>" +
      "</div>"
    );
  }

  function updateTabCounts() {
    var counts = tabCounts(state.actions);
    Object.keys(counts).forEach(function (key) {
      var el = document.querySelector('.ii-tab-count[data-count="' + key + '"]');
      if (el) el.textContent = String(counts[key]);
    });
  }

  function updateTabs() {
    var tabs = document.querySelectorAll(".ii-tab");
    tabs.forEach(function (tab) {
      var id = tab.getAttribute("data-tab");
      var active = id === state.tab;
      tab.classList.toggle("ii-tab-active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
  }

  function render() {
    var list = $("iiList");
    if (!list) return;

    updateTabCounts();
    updateTabs();

    var visible = sortActions(filterForTab(state.actions, state.tab));
    if (!visible.length) {
      list.innerHTML = emptyStateHtml(state.tab);
      return;
    }
    list.innerHTML = visible.map(renderCard).join("");
  }

  function onRootClick(event) {
    var tab = event.target.closest(".ii-tab");
    if (tab) {
      var next = tab.getAttribute("data-tab");
      if (next && next !== state.tab) {
        state.tab = next;
        render();
      }
      return;
    }

    var why = event.target.closest("[data-reason-toggle]");
    if (why) {
      var reasonId = why.getAttribute("data-reason-toggle");
      var panel = $("ii-reason-" + reasonId);
      if (!panel) return;
      var open = panel.hasAttribute("hidden");
      if (open) panel.removeAttribute("hidden");
      else panel.setAttribute("hidden", "");
      why.setAttribute("aria-expanded", open ? "true" : "false");
      return;
    }

    var btn = event.target.closest("[data-action]");
    if (!btn || btn.disabled) return;
    var actionId = btn.getAttribute("data-id");
    var verb = btn.getAttribute("data-action");
    if (!actionId || !verb) return;

    if (verb === "commit") setActionStatus(actionId, "committed");
    else if (verb === "complete") setActionStatus(actionId, "completed");
    else if (verb === "dismiss") setActionStatus(actionId, "dismissed");
  }

  function bindEvents() {
    if (state.eventsBound || !state.root) return;
    state.root.addEventListener("click", onRootClick);
    state.eventsBound = true;
  }

  function showError(message) {
    var loading = $("iiLoading");
    var error = $("iiError");
    var dash = $("iiDashboard");
    if (loading) loading.hidden = true;
    if (dash) dash.hidden = true;
    if (error) {
      error.hidden = false;
      error.innerHTML = "<p>" + escapeHtml(message) + "</p>";
    }
  }

  function showDashboard(payload) {
    var loading = $("iiLoading");
    var error = $("iiError");
    var dash = $("iiDashboard");
    var meta = $("iiIntroMeta");

    if (loading) loading.hidden = true;
    if (error) error.hidden = true;
    if (dash) dash.hidden = false;

    state.actions = applyStatusOverrides(payload.actions || []);

    var openCount = filterForTab(state.actions, "needs_action").length;
    if (meta) {
      if (openCount === 0) {
        meta.textContent = "Nothing waiting";
      } else if (openCount === 1) {
        meta.textContent = "1 decision waiting";
      } else {
        meta.textContent = openCount + " decisions waiting";
      }
    }

    render();
  }

  function init(container) {
    state.root = container || document;
    state.tab = "needs_action";
    bindEvents();

    fetch(PREVIEW_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load decisions");
        return res.json();
      })
      .then(showDashboard)
      .catch(function () {
        showError("Unable to load the next decisions. Please refresh.");
      });
  }

  function destroy() {
    if (state.root && state.eventsBound) {
      state.root.removeEventListener("click", onRootClick);
    }
    state.eventsBound = false;
    state.root = null;
    state.actions = [];
  }

  window.IntelligenceInboxRenderer = {
    init: init,
    destroy: destroy,
  };
})();
