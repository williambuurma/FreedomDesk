/**
 * My Day — role-aware daily action surface.
 * Receptionist: workday hierarchy per USER_EXPERIENCE_PHILOSOPHY.md §5–6.
 * Doctor: legacy layout until role-specific sprint.
 */
(function () {
  "use strict";

  var PREVIEW_URL = "../data/my-day-preview.json";
  var STORAGE_KEY = "freedomdesk_my_day_role";

  var UI = window.FreedomDeskUI;
  var Labels = window.FreedomDeskLabels;

  var state = {
    data: null,
    roleId: "front_desk",
  };

  function $(id) {
    return document.getElementById(id);
  }

  function getStoredRole() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY);
      if (stored && Labels.MY_DAY_ROLES[stored]) return stored;
    } catch (_e) {
      /* localStorage unavailable */
    }
    return "front_desk";
  }

  function storeRole(roleId) {
    try {
      localStorage.setItem(STORAGE_KEY, roleId);
    } catch (_e) {
      /* ignore */
    }
  }

  function getRoleView() {
    if (!state.data || !state.data.roles) return null;
    return state.data.roles[state.roleId] || state.data.roles.front_desk;
  }

  function roleSwitcherHtml() {
    return UI.renderRoleSwitcher(Labels.MY_DAY_ROLES, state.roleId);
  }

  function morningSummaryHtml(view) {
    return UI.renderMorningSummary({
      summary: view.morningSummary,
      recipientName: view.recipientName,
      practiceName: state.data.practiceName,
      date: state.data.date,
      roleSwitcherHtml: roleSwitcherHtml(),
    });
  }

  function setLayoutVisibility() {
    var isReceptionist = state.roleId === "front_desk";
    var receptionistLayout = $("mdReceptionistLayout");
    var doctorLayout = $("mdDoctorLayout");

    if (receptionistLayout) receptionistLayout.hidden = !isReceptionist;
    if (doctorLayout) doctorLayout.hidden = isReceptionist;
  }

  function renderReceptionist(view) {
    var greetingEl = $("mdGreeting");
    if (greetingEl) greetingEl.innerHTML = morningSummaryHtml(view);

    var sinceEl = $("mdSinceLastLogin");
    if (sinceEl) {
      sinceEl.innerHTML = UI.renderSectionCard(
        "Since your last login",
        UI.renderChangeList(
          view.sinceLastLogin,
          "Nothing new since you were last here."
        ),
        { id: "mdSinceLastLoginCard" }
      );
    }

    var urgentEl = $("mdUrgent");
    if (urgentEl) {
      urgentEl.innerHTML = UI.renderSectionCard(
        "Start here",
        UI.renderTaskList(
          view.urgentTasks,
          "You're in good shape — nothing urgent flagged.",
          { anchorUrgent: true }
        ),
        { id: "mdUrgentCard" }
      );
    }

    var todayEl = $("mdTodaysTasks");
    if (todayEl) {
      todayEl.innerHTML = UI.renderSectionCard(
        "Today's tasks",
        UI.renderTaskList(
          view.todaysTasks,
          "Nothing else on your list for today — keep the schedule moving."
        ),
        { id: "mdTodaysTasksCard" }
      );
    }

    var comingEl = $("mdComingUp");
    if (comingEl) {
      comingEl.innerHTML = UI.renderSectionCard(
        "Coming up",
        UI.renderAwarenessList(
          view.comingUp,
          "Nothing else on the horizon today."
        ),
        { id: "mdComingUpCard", compact: true }
      );
    }

    var remindersEl = $("mdReminders");
    if (remindersEl) {
      remindersEl.innerHTML = UI.renderSectionCard(
        "Reminders",
        UI.renderReminderList(view.reminders, "No reminders for today."),
        { id: "mdRemindersCard", compact: true }
      );
    }

    var focusEl = $("mdTodaysFocus");
    if (focusEl) focusEl.innerHTML = UI.renderTodaysFocus(view.todaysFocus);
  }

  function renderDoctor(view) {
    var greetingEl = $("mdDoctorGreeting");
    if (greetingEl) greetingEl.innerHTML = morningSummaryHtml(view);

    var prioritiesEl = $("mdPriorities");
    if (prioritiesEl) {
      prioritiesEl.innerHTML = UI.renderSectionCard(
        "Start here",
        UI.renderPriorityList(
          view.priorities,
          "You're in good shape — nothing needs your attention right away."
        ),
        { id: "mdPrioritiesCard" }
      );
    }

    var patientsEl = $("mdPatients");
    if (patientsEl) {
      patientsEl.innerHTML = UI.renderSectionCard(
        "Patients to keep in mind",
        UI.renderPatientList(
          view.patientsAttention,
          "No one on today's schedule needs extra attention."
        ),
        { id: "mdPatientsCard" }
      );
    }

    var oppEl = $("mdOpportunities");
    if (oppEl) {
      oppEl.innerHTML = UI.renderSectionCard(
        "When you have a moment",
        UI.renderOpportunityList(
          view.opportunities,
          "Nothing extra flagged today — keep the schedule moving."
        ),
        { id: "mdOpportunitiesCard" }
      );
    }

    var insightEl = $("mdInsight");
    if (insightEl) {
      insightEl.innerHTML = UI.renderSectionCard(
        "Something I noticed",
        UI.renderInsight(view.insight),
        { id: "mdInsightCard" }
      );
    }

    var actionsEl = $("mdQuickActions");
    if (actionsEl) {
      actionsEl.innerHTML = UI.renderSectionCard(
        "Go to",
        UI.renderQuickActions(view.quickActions),
        { id: "mdActionsCard" }
      );
    }

    var focusEl = $("mdDoctorTodaysFocus");
    if (focusEl) focusEl.innerHTML = UI.renderTodaysFocus(view.todaysFocus);
  }

  function renderRole() {
    var view = getRoleView();
    if (!view || !state.data) return;

    setLayoutVisibility();

    if (state.roleId === "front_desk") {
      renderReceptionist(view);
    } else {
      renderDoctor(view);
    }
  }

  function bindEvents(container) {
    UI.bindReasoningToggles(container);

    container.addEventListener("click", function (event) {
      var roleBtn = event.target.closest("[data-role]");
      if (!roleBtn || !roleBtn.classList.contains("fd-ui-role-btn")) return;

      var nextRole = roleBtn.getAttribute("data-role");
      if (!nextRole || nextRole === state.roleId) return;

      state.roleId = nextRole;
      storeRole(nextRole);

      container.querySelectorAll(".fd-ui-role-btn").forEach(function (btn) {
        var isActive = btn.getAttribute("data-role") === nextRole;
        btn.classList.toggle("fd-ui-role-btn-active", isActive);
        btn.setAttribute("aria-selected", isActive ? "true" : "false");
      });

      renderRole();
    });
  }

  function showDashboard() {
    $("mdLoading").hidden = true;
    $("mdError").hidden = true;
    setLayoutVisibility();
  }

  function showError() {
    $("mdLoading").hidden = true;
    $("mdReceptionistLayout").hidden = true;
    $("mdDoctorLayout").hidden = true;
    $("mdError").hidden = false;
  }

  function init(container) {
    state.roleId = getStoredRole();

    fetch(PREVIEW_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load preview");
        return res.json();
      })
      .then(function (data) {
        if (!data.previewMode) {
          console.warn("My Day preview: expected previewMode flag");
        }
        state.data = data;
        renderRole();
        bindEvents(container);
        showDashboard();
      })
      .catch(function () {
        showError();
      });
  }

  window.MyDayRenderer = {
    init: init,
  };
})();
