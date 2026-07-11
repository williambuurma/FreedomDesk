/**
 * Today — single operating workspace.
 * Morning Brief is the morning state of this surface, not a separate home.
 * Role-aware content; same visual language as the prior My Day layout.
 */
(function () {
  "use strict";

  var PREVIEW_URL = "../data/my-day-preview.json";
  var STORAGE_KEY = "freedomdesk_today_role";
  var LEGACY_STORAGE_KEY = "freedomdesk_my_day_role";
  var OUTCOME_STORAGE_KEY = "freedomdesk_today_decision_outcomes";

  var UI = window.FreedomDeskUI;
  var Labels = window.FreedomDeskLabels;
  var Staff = window.FreedomDeskPracticeStaff;

  var state = {
    data: null,
    staff: null,
    roleId: "front_desk",
    taskIndex: {},
    eventsBound: false,
    morningActive: false,
  };

  function $(id) {
    return document.getElementById(id);
  }

  /** Morning Brief opening state — before midday operating rhythm. */
  function isMorningPhase() {
    return new Date().getHours() < 11;
  }

  function loadOutcomeOverrides() {
    try {
      var raw = localStorage.getItem(OUTCOME_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_e) {
      return {};
    }
  }

  function saveOutcomeOverrides(overrides) {
    try {
      localStorage.setItem(OUTCOME_STORAGE_KEY, JSON.stringify(overrides));
    } catch (_e) {
      /* ignore */
    }
  }

  function setDecisionOutcome(recommendationId, status) {
    var overrides = loadOutcomeOverrides();
    overrides[recommendationId] = {
      status: status,
      recordedAt: new Date().toISOString(),
    };
    saveOutcomeOverrides(overrides);
  }

  function outcomeLabel(status) {
    if (status === "accepted") return "Calling";
    if (status === "snoozed") return "Later";
    if (status === "dismissed") return "Not needed";
    if (status === "completed") return "Done";
    return status || "";
  }

  function renderDecisionCards(cards) {
    if (!UI || !UI.renderDecisionCard || !cards || !cards.length) return "";
    var overrides = loadOutcomeOverrides();

    return cards
      .map(function (card) {
        var outcome = overrides[card.recommendationId || card.id];
        var status = outcome && outcome.status;
        // Terminal outcomes close the card. Accepted (Call) commits but still
        // allows Done / Later / Not needed — same pattern as Intelligence Inbox.
        var isTerminal =
          status === "completed" ||
          status === "dismissed" ||
          status === "snoozed";
        var isAccepted = status === "accepted";
        var id = card.recommendationId || card.id;
        var acceptDisabled = isAccepted ? " disabled" : "";

        return UI.renderDecisionCard({
          id: id,
          situation: card.situation,
          subject: card.subject || "",
          guidance: card.recommendation || "",
          stake: card.stake || "",
          whyText: card.whyText || "",
          evidence: card.evidence || [],
          accent: card.accent || "opportunity",
          prominence: "primary",
          group: card.group || "opportunity",
          resolvedLabel: isTerminal ? outcomeLabel(status) : "",
          actionLabel: isTerminal
            ? ""
            : isAccepted
              ? "Calling"
              : card.primaryAction || "Act",
          primaryAttrs:
            ' data-decision-outcome="accepted" data-recommendation-id="' +
            id +
            '"' +
            acceptDisabled,
          secondaryActions: isTerminal
            ? []
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
              ],
        });
      })
      .join("");
  }

  function getStoredRole() {
    try {
      var stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
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
    var morningEl = $("tdMorning");

    if (morningEl) {
      morningEl.hidden = !(state.morningActive && isReceptionist);
    }
    if (receptionistLayout) receptionistLayout.hidden = !isReceptionist;
    if (doctorLayout) doctorLayout.hidden = isReceptionist;
  }

  function renderMorningState() {
    var mount = $("tdMorningMount");
    var morningEl = $("tdMorning");
    if (!mount || !morningEl) return Promise.resolve(false);

    if (!state.morningActive || state.roleId !== "front_desk") {
      morningEl.hidden = true;
      mount.innerHTML = "";
      return Promise.resolve(false);
    }

    if (
      !window.MorningBriefRenderer ||
      typeof MorningBriefRenderer.renderInto !== "function"
    ) {
      morningEl.hidden = true;
      return Promise.resolve(false);
    }

    return MorningBriefRenderer.renderInto(mount).then(function (ok) {
      morningEl.hidden = !ok;
      return !!ok;
    });
  }

  function renderReceptionist(view, options) {
    var opts = options || {};
    var useMorning = !!opts.morningRendered;
    indexTasks(view);

    var greetingEl = $("mdGreeting");
    if (greetingEl) {
      if (useMorning) {
        greetingEl.innerHTML = "";
        greetingEl.hidden = true;
      } else {
        greetingEl.hidden = false;
        greetingEl.innerHTML = UI.renderReceptionistWelcome({
          welcome: view.welcome,
          practiceName: state.data.practiceName,
          date: state.data.date,
        });
      }
    }

    var sinceEl = $("mdSinceYesterday");
    if (sinceEl) {
      // Morning Brief already covers overnight changes — skip duplicate cards.
      if (useMorning) {
        sinceEl.innerHTML = "";
        sinceEl.hidden = true;
      } else {
        sinceEl.hidden = false;
        sinceEl.innerHTML = UI.renderAttentionCards(view.attentionCards);
      }
    }

    var urgentEl = $("mdUrgent");
    if (urgentEl) {
      var decisionCards = view.decisionCards || [];
      // Morning Brief already surfaces the same PIE decision — avoid duplicate cards.
      if (useMorning) {
        urgentEl.innerHTML = "";
        urgentEl.hidden = true;
      } else if (decisionCards.length) {
        urgentEl.hidden = false;
        urgentEl.innerHTML =
          '<div class="td-decision-cards" aria-label="Recommended decisions">' +
          renderDecisionCards(decisionCards) +
          "</div>" +
          (view.urgentTasks && view.urgentTasks.length
            ? UI.renderUrgentSection(view.urgentTasks, "")
            : "");
      } else {
        urgentEl.hidden = false;
        urgentEl.innerHTML = UI.renderUrgentSection(
          view.urgentTasks,
          "You're clear — nothing urgent."
        );
      }
    }

    var todayEl = $("mdToday");
    if (todayEl) {
      var todayTasks = view.todayTasks || [];
      var scheduleGaps = view.scheduleGaps || [];
      // Morning decisions already cover waitlist / open-chair — don't repeat them.
      if (useMorning) {
        todayTasks = todayTasks.filter(function (task) {
          var blob = ((task.label || "") + " " + (task.instruction || "")).toLowerCase();
          return !/open hygiene|waitlist|short-call|open chair/i.test(blob);
        });
        scheduleGaps = [];
      }
      if (!todayTasks.length && !scheduleGaps.length) {
        todayEl.innerHTML = "";
        todayEl.hidden = true;
      } else {
        todayEl.hidden = false;
        todayEl.innerHTML = UI.renderSectionCard(
          "",
          UI.renderTodaySection(todayTasks, scheduleGaps, "Nothing else on your list."),
          { id: "mdTodayCard", quiet: true }
        );
      }
    }

    var headsUpEl = $("mdHeadsUp");
    if (headsUpEl) {
      var headsUp = (view.headsUp || []).slice(0, 3);
      if (!headsUp.length) {
        headsUpEl.innerHTML = "";
        headsUpEl.hidden = true;
      } else {
        headsUpEl.hidden = false;
        headsUpEl.innerHTML = UI.renderSectionCard(
          "",
          UI.renderHeadsUpList(headsUp, "Nothing else on the radar."),
          { id: "mdHeadsUpCard", compact: true, quiet: true }
        );
      }
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

    // Doctor attention is scarce — only high-priority interrupts surface.
    var doctorTasks = (view.todaysTasks || []).filter(function (task) {
      return task.priority === "high" || task.priority === "critical";
    });
    if (!doctorTasks.length) {
      doctorTasks = (view.todaysTasks || []).slice(0, 1);
    } else {
      doctorTasks = doctorTasks.slice(0, 2);
    }

    var clinical = (view.clinicalPriorities || []).slice(0, 2);

    var tasksEl = $("mdDoctorTasks");
    if (tasksEl) {
      tasksEl.innerHTML = UI.renderSectionCard(
        "",
        UI.renderDoctorTasks(doctorTasks, "Nothing needs you right now."),
        { id: "mdDoctorTasksCard", quiet: true }
      );
    }

    var prioritiesEl = $("mdClinicalPriorities");
    if (prioritiesEl) {
      if (!clinical.length) {
        prioritiesEl.innerHTML = "";
        prioritiesEl.hidden = true;
      } else {
        prioritiesEl.hidden = false;
        prioritiesEl.innerHTML = UI.renderSectionCard(
          "",
          UI.renderClinicalPriorities(clinical, "No clinical priorities flagged."),
          { id: "mdClinicalPrioritiesCard", compact: true, quiet: true }
        );
      }
    }
  }

  function renderRole() {
    var view = getRoleView();
    if (!view || !state.data) return;

    UI.closeWorkPanel();
    renderRoleBar();
    state.morningActive = isMorningPhase();

    renderMorningState().then(function (morningRendered) {
      setLayoutVisibility();
      if (state.roleId === "front_desk") {
        renderReceptionist(view, { morningRendered: morningRendered });
      } else {
        renderDoctor(view);
      }
    });
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
        return;
      }

      var outcomeBtn = event.target.closest("[data-decision-outcome]");
      if (outcomeBtn && container.contains(outcomeBtn)) {
        var recommendationId = outcomeBtn.getAttribute("data-recommendation-id");
        var outcomeStatus = outcomeBtn.getAttribute("data-decision-outcome");
        if (recommendationId && outcomeStatus) {
          // Maps to Practice Improvement Engine OutcomeStatus:
          // accepted | snoozed | dismissed | completed → learning pipeline.
          setDecisionOutcome(recommendationId, outcomeStatus);
          renderRole();
        }
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
    var morningEl = $("tdMorning");
    if (morningEl) morningEl.hidden = true;
    $("mdError").hidden = false;
  }

  function init(container) {
    state.roleId = getStoredRole();
    state.morningActive = isMorningPhase();

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
          console.warn("Today preview: expected previewMode flag");
        }
        renderRole();
        bindEvents(container);
        showDashboard();
      })
      .catch(function () {
        showError();
      });
  }

  window.TodayRenderer = {
    init: init,
  };
})();
