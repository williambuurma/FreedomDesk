/**
 * Today — single operating workspace.
 * Morning Brief is the morning state of this surface, not a separate home.
 * Role-aware content; same visual language as the prior My Day layout.
 *
 * Decision flow: one primary recommendation at a time from Arbitration.
 * Completing advances calmly to the next — never a pile of cards.
 */
(function () {
  "use strict";

  var LIVE_URL = "/api/today";
  var PREVIEW_URL = "../data/my-day-preview.json";
  var STORAGE_KEY = "freedomdesk_today_role";
  var LEGACY_STORAGE_KEY = "freedomdesk_my_day_role";

  var UI = window.FreedomDeskUI;
  var Labels = window.FreedomDeskLabels;
  var Staff = window.FreedomDeskPracticeStaff;

  function Flow() {
    return window.FreedomDeskDecisionFlow;
  }

  var state = {
    data: null,
    staff: null,
    roleId: "front_desk",
    taskIndex: {},
    eventsBound: false,
    morningActive: false,
    advancing: false,
  };

  function $(id) {
    return document.getElementById(id);
  }

  /** Morning Brief opening state — before midday operating rhythm. */
  function isMorningPhase() {
    return new Date().getHours() < 11;
  }

  function decisionQueue(view) {
    var flow = Flow();
    if (!flow || !view) return [];
    return flow.buildQueue(view.decisionCards, view.waitingDecisions);
  }

  function renderPrimaryDecisionCard(card, options) {
    var flow = Flow();
    if (!UI || !UI.renderDecisionCard || !card || !flow) return "";
    var opts = options || {};
    var id = flow.cardId(card);
    var status = flow.getOutcomeStatus(id);
    var isTerminal = flow.isTerminal(status);
    var isAccepted = status === "accepted";
    var motionClass = opts.entering ? " fd-dc--entering" : "";

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

    var html = UI.renderDecisionCard({
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
      resolvedLabel: isTerminal ? flow.outcomeLabel(status) : "",
      statusHint: isAccepted ? "Place the call, then mark Done." : "",
      actionLabel: isTerminal
        ? ""
        : isAccepted
          ? "Done"
          : card.primaryAction || "Act",
      primaryAttrs: isAccepted
        ? ' data-decision-outcome="completed" data-recommendation-id="' +
          id +
          '"'
        : ' data-decision-outcome="accepted" data-recommendation-id="' +
          id +
          '"',
      secondaryActions: secondaryActions,
    });

    if (!motionClass || !html) return html;
    return html.replace('class="fd-dc ', 'class="fd-dc' + motionClass + " ");
  }

  function renderClearDecisionState() {
    return (
      '<div class="td-decision-clear fd-dc-clear" role="status">' +
      '<p class="td-decision-clear-title">You\'re clear.</p>' +
      '<p class="td-decision-clear-body">Nothing needs your attention right now.</p>' +
      "</div>"
    );
  }

  function renderDecisionSurface(view, options) {
    var opts = options || {};
    var flow = Flow();
    if (!flow) return "";
    var queue = decisionQueue(view);
    var primary = flow.primaryDecision(queue);
    if (!primary) return renderClearDecisionState();
    var remaining = flow.remainingAfterPrimary(queue);
    var hint = flow.remainingLabel(remaining);
    return (
      '<div class="td-decision-cards" aria-label="Recommended decision">' +
      (hint
        ? '<p class="td-decision-remaining" aria-live="polite">' +
          hint +
          "</p>"
        : "") +
      renderPrimaryDecisionCard(primary, { entering: !!opts.entering }) +
      "</div>"
    );
  }

  function paintDecisionSurface(urgentEl, view, options) {
    if (!urgentEl) return;
    var opts = options || {};
    var flow = Flow();
    var surface = renderDecisionSurface(view, opts);
    var urgentTasksHtml =
      view.urgentTasks && view.urgentTasks.length
        ? UI.renderUrgentSection(view.urgentTasks, "")
        : "";

    if (surface.indexOf("td-decision-clear") !== -1 && !urgentTasksHtml) {
      urgentEl.hidden = false;
      urgentEl.innerHTML = surface;
    } else if (surface) {
      urgentEl.hidden = false;
      urgentEl.innerHTML = surface + urgentTasksHtml;
    } else {
      urgentEl.hidden = false;
      urgentEl.innerHTML = UI.renderUrgentSection(
        view.urgentTasks,
        "You're clear — nothing urgent."
      );
    }

    if (opts.entering && flow) {
      var card = urgentEl.querySelector(".fd-dc--primary");
      flow.markEntering(card);
    }
    if (flow && flow.focusPrimaryAction && surface.indexOf("td-decision-clear") === -1) {
      window.setTimeout(function () {
        flow.focusPrimaryAction(urgentEl);
      }, opts.entering ? 80 : 0);
    }
  }

  function getStoredRole() {
    try {
      var stored =
        localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem(LEGACY_STORAGE_KEY);
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
    var roles = state.staff
      ? Staff.roleSwitcherRoles(state.staff)
      : Labels.MY_DAY_ROLES;
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
      // Morning Brief already surfaces the same PIE decision — avoid duplicate cards.
      if (useMorning) {
        urgentEl.innerHTML = "";
        urgentEl.hidden = true;
      } else {
        paintDecisionSurface(urgentEl, view, {
          entering: !!opts.decisionEntering,
        });
      }
    }

    var todayEl = $("mdToday");
    if (todayEl) {
      var todayTasks = view.todayTasks || [];
      var scheduleGaps = view.scheduleGaps || [];
      // Morning decisions already cover waitlist / open-chair — don't repeat them.
      if (useMorning) {
        todayTasks = todayTasks.filter(function (task) {
          var blob = (
            (task.label || "") +
            " " +
            (task.instruction || "")
          ).toLowerCase();
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
          UI.renderTodaySection(
            todayTasks,
            scheduleGaps,
            "Nothing else on your list.",
            { quietActions: useMorning }
          ),
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
          UI.renderClinicalPriorities(
            clinical,
            "No clinical priorities flagged."
          ),
          { id: "mdClinicalPrioritiesCard", compact: true, quiet: true }
        );
      }
    }
  }

  function renderRole(options) {
    var opts = options || {};
    var view = getRoleView();
    if (!view || !state.data) return;

    if (!opts.preservePanel) UI.closeWorkPanel();
    renderRoleBar();
    state.morningActive = isMorningPhase();

    renderMorningState().then(function (morningRendered) {
      setLayoutVisibility();
      if (state.roleId === "front_desk") {
        renderReceptionist(view, {
          morningRendered: morningRendered,
          decisionEntering: !!opts.decisionEntering,
        });
      } else {
        renderDoctor(view);
      }
    });
  }

  /**
   * Soft in-place update for non-terminal outcomes (e.g. Call → Calling).
   * Avoids a full-page flash when committing without advancing.
   */
  function refreshPrimaryCardInPlace(urgentEl, view) {
    var flow = Flow();
    if (!urgentEl || !flow) return;
    var queue = decisionQueue(view);
    var primary = flow.primaryDecision(queue);
    var host = urgentEl.querySelector(".td-decision-cards");
    if (!host || !primary) {
      paintDecisionSurface(urgentEl, view, { entering: false });
      return;
    }
    host.innerHTML = renderPrimaryDecisionCard(primary, { entering: false });
  }

  function handleDecisionOutcome(outcomeBtn, container) {
    var flow = Flow();
    if (!flow || state.advancing) return;

    var recommendationId = outcomeBtn.getAttribute("data-recommendation-id");
    var outcomeStatus = outcomeBtn.getAttribute("data-decision-outcome");
    if (!recommendationId || !outcomeStatus) return;

    var view = getRoleView();
    if (!view) return;

    // Maps to Practice Improvement Engine OutcomeStatus:
    // accepted | snoozed | dismissed | completed → learning pipeline.
    flow.setOutcome(recommendationId, outcomeStatus);

    var urgentEl = $("mdUrgent");
    var cardEl =
      outcomeBtn.closest(".fd-dc") ||
      (urgentEl && urgentEl.querySelector(".fd-dc--primary"));

    // Accepted commits attention without advancing the queue.
    if (!flow.isTerminal(outcomeStatus)) {
      if (urgentEl && !urgentEl.hidden) {
        refreshPrimaryCardInPlace(urgentEl, view);
      } else {
        renderRole({ preservePanel: true });
      }
      return;
    }

    state.advancing = true;
    var buttons = cardEl ? cardEl.querySelectorAll("button, a") : [];
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.disabled = true;
    });

    // Show resolved label briefly before the card settles away.
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
        state.advancing = false;
        if (urgentEl && !urgentEl.hidden && state.roleId === "front_desk") {
          paintDecisionSurface(urgentEl, view, { entering: true });
        } else {
          renderRole({ preservePanel: true, decisionEntering: true });
        }
      },
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
        if (
          !nextRole ||
          !Labels.MY_DAY_ROLES[nextRole] ||
          nextRole === state.roleId
        )
          return;

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
        // Morning Brief owns outcomes inside the morning mount.
        if (outcomeBtn.closest("#tdMorning, #tdMorningMount, .td-morning")) {
          return;
        }
        handleDecisionOutcome(outcomeBtn, container);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (state.advancing || state.roleId !== "front_desk") return;
      if (!container || !document.body.contains(container)) return;
      // Morning Brief owns shortcuts while its mount is visible.
      var morningEl = $("tdMorning");
      if (morningEl && !morningEl.hidden) return;
      var urgentEl = $("mdUrgent");
      if (!urgentEl || urgentEl.hidden) return;
      var flow = Flow();
      if (!flow || !flow.matchShortcut) return;
      var outcome = flow.matchShortcut(event);
      if (!outcome) return;
      if (flow.invokeShortcut(urgentEl, outcome)) {
        event.preventDefault();
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

  /** Prefer live /api/today (inbound call overlay); fall back to static preview. */
  function loadTodayPayload() {
    return fetch(LIVE_URL, { cache: "no-store" })
      .then(function (res) {
        if (res.ok) return res.json();
        return null;
      })
      .catch(function () {
        return null;
      })
      .then(function (live) {
        if (live) return live;
        return fetch(PREVIEW_URL).then(function (res) {
          if (!res.ok) throw new Error("Failed to load preview");
          return res.json();
        });
      });
  }

  function init(container) {
    state.roleId = getStoredRole();
    state.morningActive = isMorningPhase();

    Promise.all([loadTodayPayload(), Staff.load()])
      .then(function (results) {
        return { data: results[0], staff: results[1] };
      })
      .then(function (payload) {
        state.staff = payload.staff;
        state.data = Staff.applyToMyDayData(payload.data, payload.staff);
        if (!state.data.previewMode && !state.data.liveCallActive) {
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
