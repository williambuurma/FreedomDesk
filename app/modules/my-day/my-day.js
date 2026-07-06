/**
 * My Day — role-aware daily action surface.
 * Receptionist: v3 morning briefing (USER_EXPERIENCE_PHILOSOPHY.md).
 * Doctor: calm clinical workspace — same visual language, role-specific content.
 */
(function () {
  "use strict";

  var PREVIEW_URL = "../data/my-day-preview.json";
  var STORAGE_KEY = "freedomdesk_my_day_role";

  var UI = window.FreedomDeskUI;
  var Labels = window.FreedomDeskLabels;
  var Staff = window.FreedomDeskPracticeStaff;

  var state = {
    data: null,
    staff: null,
    roleId: "front_desk",
    taskIndex: {},
    eventsBound: false,
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
    var roles = state.staff ? Staff.roleSwitcherRoles(state.staff) : Labels.MY_DAY_ROLES;
    return UI.renderRoleSwitcher(roles, state.roleId);
  }

  function renderRoleBar() {
    var roleBar = $("mdRoleBar");
    if (roleBar) {
      roleBar.innerHTML = roleSwitcherHtml();
    }
  }

  function indexTasks(view) {
    state.taskIndex = {};
    (view.urgentTasks || [])
      .concat(view.todayTasks || [])
      .forEach(function (task) {
        if (task && task.id) state.taskIndex[task.id] = task;
      });

    (view.attentionCards || []).forEach(function (card) {
      if (card.taskId && state.taskIndex[card.taskId]) return;
      if (card.taskId && card.callSummary) {
        state.taskIndex[card.taskId] = {
          id: card.taskId,
          label: card.patientName,
          instruction: card.preview,
          callSummary: card.callSummary,
          panel: card.panel || "view-summary",
        };
      }
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
    indexTasks(view);

    var greetingEl = $("mdGreeting");
    if (greetingEl) {
      greetingEl.innerHTML = UI.renderReceptionistWelcome({
        welcome: view.welcome,
        practiceName: state.data.practiceName,
        date: state.data.date,
      });
    }

    var sinceEl = $("mdSinceYesterday");
    if (sinceEl) {
      sinceEl.innerHTML = UI.renderAttentionCards(view.attentionCards);
    }

    var urgentEl = $("mdUrgent");
    if (urgentEl) {
      urgentEl.innerHTML = UI.renderUrgentSection(
        view.urgentTasks,
        "You're clear — nothing urgent."
      );
    }

    var todayEl = $("mdToday");
    if (todayEl) {
      todayEl.innerHTML = UI.renderSectionCard(
        "Today",
        UI.renderTodaySection(
          view.todayTasks,
          view.scheduleGaps,
          "Nothing else on your list — keep the schedule moving."
        ),
        { id: "mdTodayCard" }
      );
    }

    var headsUpEl = $("mdHeadsUp");
    if (headsUpEl) {
      headsUpEl.innerHTML = UI.renderSectionCard(
        "Today's Reminders",
        UI.renderHeadsUpList(view.headsUp, "Nothing else on the radar today."),
        { id: "mdHeadsUpCard", compact: true, emphasis: true }
      );
    }
  }

  function renderDoctor(view) {
    var greetingEl = $("mdDoctorGreeting");
    if (greetingEl) {
      greetingEl.innerHTML = UI.renderDoctorClinicalWelcome({
        welcome: view.welcome,
        practiceName: state.data.practiceName,
        date: state.data.date,
      });
    }

    var scheduleEl = $("mdDoctorSchedule");
    if (scheduleEl) {
      scheduleEl.innerHTML = UI.renderSectionCard(
        "Today's Schedule",
        UI.renderDoctorSchedule(view.schedule, "Schedule unavailable."),
        { id: "mdDoctorScheduleCard" }
      );
    }

    var tasksEl = $("mdDoctorTasks");
    if (tasksEl) {
      tasksEl.innerHTML = UI.renderSectionCard(
        "Today's Tasks",
        UI.renderDoctorTasks(view.todaysTasks, "No clinical tasks flagged today."),
        { id: "mdDoctorTasksCard" }
      );
    }

    var prioritiesEl = $("mdClinicalPriorities");
    if (prioritiesEl) {
      prioritiesEl.innerHTML = UI.renderSectionCard(
        "Clinical Priorities",
        UI.renderClinicalPriorities(
          view.clinicalPriorities,
          "No clinical priorities flagged today."
        ),
        { id: "mdClinicalPrioritiesCard", compact: true, emphasis: true }
      );
    }
  }

  function renderRole() {
    var view = getRoleView();
    if (!view || !state.data) return;

    UI.closeWorkPanel();
    renderRoleBar();
    setLayoutVisibility();

    if (state.roleId === "front_desk") {
      renderReceptionist(view);
    } else {
      renderDoctor(view);
    }
  }

  function bindEvents(container) {
    if (state.eventsBound) return;
    state.eventsBound = true;

    UI.bindReasoningToggles(container);

    document.addEventListener("click", function (event) {
      var roleBtn = event.target.closest("[data-role].fd-ui-role-btn");
      if (roleBtn) {
        var nextRole = roleBtn.getAttribute("data-role");
        if (!nextRole || !Labels.MY_DAY_ROLES[nextRole] || nextRole === state.roleId) return;

        state.roleId = nextRole;
        storeRole(nextRole);
        renderRole();
        return;
      }

      var panelBtn = event.target.closest("[data-panel]");
      if (panelBtn && container.contains(panelBtn)) {
        var panelType = panelBtn.getAttribute("data-panel");
        var taskId = panelBtn.getAttribute("data-task-id");
        var task = state.taskIndex[taskId] || {};
        UI.openWorkPanel(panelType, task);
      }
    });
  }

  function showDashboard() {
    var loading = $("mdLoading");
    var err = $("mdError");
    if (loading) {
      loading.hidden = true;
      loading.setAttribute("aria-hidden", "true");
    }
    if (err) {
      err.hidden = true;
      err.setAttribute("aria-hidden", "true");
    }
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

    Promise.all([fetch(PREVIEW_URL), Staff.load()])
      .then(function (results) {
        var previewRes = results[0];
        if (!previewRes.ok) throw new Error("Failed to load preview");
        return previewRes.json().then(function (data) {
          return { data: data, staff: results[1] };
        });
      })
      .then(function (payload) {
        state.staff = payload.staff;
        state.data = Staff.applyToMyDayData(payload.data, payload.staff);
        if (!state.data.previewMode) {
          console.warn("My Day preview: expected previewMode flag");
        }
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
