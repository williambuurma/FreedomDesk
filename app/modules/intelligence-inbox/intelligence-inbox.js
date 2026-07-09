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

  /** Operational problem first — never lead with the patient name. */
  function problemHeadline(action) {
    var id = action.id || "";
    var because = (action.because || "").toLowerCase();
    var happened = (action.whatHappened || "").toLowerCase();
    var decision = (action.decision || "").toLowerCase();

    if (/toothache|emergency|jaw|swelling|infection/i.test(because + happened) || /emerg/i.test(id)) {
      return "Possible dental infection";
    }
    if (/new.patient|npe/i.test(happened + id) || /schedule.*new-patient/i.test(decision)) {
      return "New patient exam needed";
    }
    if (/hkd|medicaid|benefit|verif|insurance/i.test(because + decision + id)) {
      return "Benefits not verified";
    }
    if (/crown|lab case/i.test(because + decision + happened)) {
      return "Lab case missing";
    }
    if (/hygiene|waitlist|fill.*chair|open chair/i.test(because + decision + happened)) {
      return "Open hygiene chair";
    }
    if (/statement|billing|balance/i.test(because + decision + happened)) {
      return "Billing question open";
    }
    return action.decision || action.recommendedNextStep || action.whatHappened || "Needs attention";
  }

  function decisionGroup(action) {
    if (action.status === "completed" || action.status === "dismissed") return "done";
    if (action.urgencyTier === "critical") return "do_first";
    var blob =
      (action.id || "") +
      " " +
      (action.because || "") +
      " " +
      (action.decision || "") +
      " " +
      (action.whatHappened || "");
    if (/hygiene|waitlist|fill|open chair|production|recall|treatment discussion/i.test(blob)) {
      return "opportunity";
    }
    if (/verif|benefit|lab|crown|insurance|prep|risk/i.test(blob)) {
      return "protect";
    }
    return "other";
  }

  function groupLabel(group) {
    var map = {
      do_first: "Do first",
      protect: "Protect today",
      opportunity: "Production opportunities",
      other: "Other items",
      done: "Completed",
    };
    return map[group] || map.other;
  }

  function cardAccent(action, group) {
    if (action.urgencyTier === "critical") return "urgent";
    if (group === "protect") return "protect";
    if (group === "opportunity") return "opportunity";
    return "";
  }

  function shortConsequence(text) {
    if (!text) return "";
    var t = String(text).trim();
    t = t.replace(/\bon-call SLA\b/gi, "callback window");
    t = t.replace(/\bSLA\b/gi, "window");
    var first = t.split(/[.!?]/)[0].trim();
    if (first.length > 56) first = first.slice(0, 53).replace(/\s+\S*$/, "") + "…";
    return first;
  }

  function shortRecommendation(action) {
    var id = action.id || "";
    var decision = (action.decision || "").toLowerCase();
    if (/emerg|toothache/i.test(id + decision)) return "Same-day limited exam";
    if (/new.patient|npe|schedule/i.test(id + decision)) return "Morning new-patient exam";
    if (/verif|benefit|hkd/i.test(id + decision)) return "Verify before visit";
    if (/crown|lab/i.test(id + decision)) return "Confirm before 11:00";
    if (/hygiene|waitlist|fill/i.test(id + decision)) return "Short-call waitlist";
    if (/statement|billing/i.test(id + decision)) return "Resolve statement question";
    var step = action.recommendedNextStep || action.decision || "";
    if (step.length > 42) return step.slice(0, 39).replace(/\s+\S*$/, "") + "…";
    return step;
  }

  function workActionLabel(action) {
    if (action.status === "committed") return "Committed";
    var id = action.id || "";
    var decision = (action.decision || "").toLowerCase();
    if (/emerg|toothache|callback|call .*before/i.test(id + decision)) return "Start callback";
    if (/verif|benefit|hkd|insurance/i.test(id + decision)) return "Verify benefits";
    if (/schedule|new.patient|npe/i.test(id + decision)) return "Schedule now";
    if (/crown|lab/i.test(id + decision)) return "Confirm lab";
    if (/hygiene|waitlist|fill/i.test(id + decision)) return "Call candidates";
    if (/statement|billing/i.test(id + decision)) return "Call patient";
    return "Start";
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

  function renderCard(action) {
    var UI = window.FreedomDeskUI;
    if (!UI || !UI.renderDecisionCard) return "";

    var group = decisionGroup(action);
    var isPrimary = group === "do_first" && action.urgencyTier === "critical";
    var isResolved = action.status === "completed" || action.status === "dismissed";
    var commitDisabled =
      action.status === "committed" ? " disabled" : "";

    return UI.renderDecisionCard({
      id: action.id,
      situation: problemHeadline(action),
      subject: action.subjectDisplayName || "",
      stake: shortConsequence(action.ifIgnored),
      guidance: shortRecommendation(action),
      accent: cardAccent(action, group),
      prominence: isPrimary ? "primary" : "secondary",
      group: group,
      whyText: action.because || "",
      evidence: action.evidence || [],
      resolvedLabel: isResolved ? statusLabel(action.status) : "",
      actionLabel: isResolved ? "" : workActionLabel(action),
      primaryAttrs:
        ' data-action="commit" data-id="' +
        escapeHtml(action.id) +
        '"' +
        commitDisabled,
      secondaryActions: isResolved
        ? []
        : [
            {
              label: "Done",
              strong: true,
              attrs:
                ' data-action="complete" data-id="' +
                escapeHtml(action.id) +
                '"',
            },
            {
              label: "Not needed",
              attrs:
                ' data-action="dismiss" data-id="' +
                escapeHtml(action.id) +
                '"',
            },
          ],
    });
  }

  function emptyStateHtml(tab) {
    var messages = {
      needs_action: "You're clear.",
      doctor: "Nothing for the doctor.",
      front_desk: "Nothing for the front desk.",
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

    var byGroup = {};
    visible.forEach(function (action) {
      var g = decisionGroup(action);
      if (!byGroup[g]) byGroup[g] = [];
      byGroup[g].push(action);
    });

    function renderGroup(g) {
      var items = byGroup[g];
      if (!items || !items.length) return "";
      return (
        '<section class="ii-group ii-group--' +
        escapeHtml(g) +
        '">' +
        '<p class="ii-section-label">' +
        escapeHtml(groupLabel(g)) +
        "</p>" +
        '<div class="ii-group-cards">' +
        items.map(renderCard).join("") +
        "</div>" +
        "</section>"
      );
    }

    var html = "";
    html += renderGroup("do_first");

    if ((byGroup.protect && byGroup.protect.length) || (byGroup.opportunity && byGroup.opportunity.length)) {
      html += '<div class="ii-secondary-row">';
      html += renderGroup("protect");
      html += renderGroup("opportunity");
      html += "</div>";
    }

    html += renderGroup("other");
    html += renderGroup("done");
    list.innerHTML = html;
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
      var panel =
        $("fd-dc-reason-" + reasonId) || $("ii-reason-" + reasonId);
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
