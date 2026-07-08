/**
 * FreedomDesk Coordination Panel — universal right-side workspace.
 * Permanent home for notes, team messages, delegation, call summaries, and related context.
 */
(function () {
  "use strict";

  var NOTES_STORAGE_KEY = "freedomdesk_coord_notes";
  var Utils = window.FreedomDeskUtils;
  var UI = window.FreedomDeskUI;
  var ContextEngine = window.FreedomDeskContextEngine;

  var state = {
    mode: "workspace",
    activeTab: "notes",
    contextType: null,
    contextTask: null,
    contextEngine: null,
    contextKey: null,
    notes: [],
    initialized: false,
    eventsBound: false,
  };

  var els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(text) {
    return Utils ? Utils.escapeHtml(text) : String(text);
  }

  function formatNoteTime(iso) {
    try {
      var date = new Date(iso);
      if (Number.isNaN(date.getTime())) return "";
      return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    } catch (_e) {
      return "";
    }
  }

  function loadNotes() {
    try {
      var raw = localStorage.getItem(NOTES_STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_e) {
      return [];
    }
  }

  function saveNotes() {
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(state.notes));
    } catch (_e) {
      /* storage unavailable */
    }
  }

  function generateNoteId() {
    return "note_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
  }

  function sortNotes(notes) {
    return notes.slice().sort(function (a, b) {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }

  function setBodyOpen(isOpen) {
    document.body.classList.toggle("fd-coord-open", isOpen);
  }

  function setMode(mode) {
    state.mode = mode;
    if (els.panel) {
      els.panel.setAttribute("data-coord-mode", mode);
    }
    if (els.tabs) {
      els.tabs.hidden = mode !== "workspace";
      els.tabs.setAttribute("aria-hidden", mode !== "workspace" ? "true" : "false");
    }
    if (els.footer) {
      els.footer.hidden = mode !== "context";
    }
  }

  function setActiveTab(tabId) {
    state.activeTab = tabId;

    if (els.tabs) {
      var tabButtons = els.tabs.querySelectorAll("[data-coord-tab]");
      tabButtons.forEach(function (btn) {
        var isActive = btn.getAttribute("data-coord-tab") === tabId;
        btn.setAttribute("aria-selected", isActive ? "true" : "false");
        btn.tabIndex = isActive ? 0 : -1;
      });
    }

    if (els.title) {
      if (state.mode === "workspace") {
        els.title.textContent = tabId === "team" ? "Team" : "Notes";
      }
    }

    renderBody();
  }

  function renderNotesTab() {
    var sorted = sortNotes(state.notes);

    var listHtml = "";
    if (sorted.length === 0) {
      listHtml =
        '<div class="fd-coord-notes-empty">' +
        '<p class="fd-coord-notes-empty-title">Nothing saved yet</p>' +
        '<p class="fd-coord-notes-empty-body">Jot down anything you do not want to forget today. Notes stay private unless you share them later.</p>' +
        "</div>";
    } else {
      listHtml = '<ul class="fd-coord-notes-list" aria-label="Your notes">';
      sorted.forEach(function (note) {
        var contextHtml = "";
        if (note.context && note.context.patientName) {
          contextHtml =
            '<span class="fd-coord-note-context">' +
            escapeHtml(note.context.patientName) +
            "</span>";
        }
        listHtml +=
          '<li class="fd-coord-note' +
          (note.pinned ? " fd-coord-note--pinned" : "") +
          '" data-note-id="' +
          escapeHtml(note.id) +
          '">' +
          '<div class="fd-coord-note-main">' +
          contextHtml +
          '<p class="fd-coord-note-text">' +
          escapeHtml(note.text) +
          "</p>" +
          '<time class="fd-coord-note-time" datetime="' +
          escapeHtml(note.createdAt) +
          '">' +
          escapeHtml(formatNoteTime(note.createdAt)) +
          "</time>" +
          "</div>" +
          '<div class="fd-coord-note-actions">' +
          '<button type="button" class="fd-coord-note-action" data-note-action="pin" aria-label="' +
          (note.pinned ? "Unpin note" : "Pin note") +
          '" title="' +
          (note.pinned ? "Unpin" : "Pin") +
          '">' +
          '<svg viewBox="0 0 24 24" fill="' +
          (note.pinned ? "currentColor" : "none") +
          '" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M12 17v5M9 3h6l1 7h4l-7 8v-3"/></svg>' +
          "</button>" +
          '<button type="button" class="fd-coord-note-action fd-coord-note-action--remove" data-note-action="remove" aria-label="Delete note" title="Delete">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
          "</button>" +
          "</div>" +
          "</li>";
      });
      listHtml += "</ul>";
    }

    return (
      '<div class="fd-coord-notes">' +
      '<div class="fd-coord-notes-compose">' +
      '<label class="fd-coord-notes-compose-label" for="fdCoordNoteInput">Quick note</label>' +
      '<textarea id="fdCoordNoteInput" class="fd-coord-notes-input" rows="2" placeholder="Remember to ask about whitening…"></textarea>' +
      '<div class="fd-coord-notes-compose-footer">' +
      '<span class="fd-coord-notes-hint">Enter to save · Shift+Enter for a new line</span>' +
      '<button type="button" class="fd-coord-notes-save" id="fdCoordNoteSave" disabled>Save</button>' +
      "</div>" +
      "</div>" +
      listHtml +
      "</div>"
    );
  }

  function renderTeamPlaceholder() {
    return (
      '<div class="fd-coord-team-placeholder">' +
      '<div class="fd-coord-team-placeholder-icon" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
      "</div>" +
      '<p class="fd-coord-placeholder-title">Team messages are coming soon</p>' +
      '<p class="fd-coord-placeholder-body">Quick messages to coworkers — the way you talk across the front desk, without email or another app.</p>' +
      '<p class="fd-coord-placeholder-foot">Delegation and shared context will live here too.</p>' +
      "</div>"
    );
  }

  function notesForContext(contextKey) {
    if (!contextKey) return [];
    return state.notes.filter(function (note) {
      return note.context && note.context.contextKey === contextKey;
    });
  }

  function renderContextBody() {
    if (!UI || !state.contextType) return "";

    var attachedNotes = notesForContext(state.contextKey);
    if (UI.renderContextPanel) {
      return UI.renderContextPanel(state.contextType, state.contextTask || {}, { attachedNotes: attachedNotes });
    }
    return (
      '<div class="fd-coord-context">' +
      UI.renderPanelContent(state.contextType, state.contextTask || {}) +
      "</div>"
    );
  }

  function renderFooter() {
    if (!els.footer || state.mode !== "context" || !state.contextEngine) return;

    els.footer.hidden = false;
  }

  function renderFooterContent() {
    if (!els.footer || !state.contextEngine || !ContextEngine) return;

    els.footer.innerHTML =
      '<p class="fd-coord-related-label">Related context</p>' +
      ContextEngine.renderRelatedList(state.contextEngine.related);
  }

  function renderBody() {
    if (!els.body) return;

    if (state.mode === "context") {
      els.body.innerHTML = renderContextBody();
      renderFooterContent();
      renderFooter();
      return;
    }

    if (els.footer) {
      els.footer.hidden = true;
    }

    if (state.activeTab === "team") {
      els.body.innerHTML = renderTeamPlaceholder();
      return;
    }

    els.body.innerHTML = renderNotesTab();
    focusNoteInput();
  }

  function onBodyClick(event) {
    var ctxSaveBtn = event.target.closest("#fdCtxNoteSave");
    if (ctxSaveBtn && els.body && els.body.contains(ctxSaveBtn)) {
      var ctxInput = $("fdCtxNoteInput");
      if (ctxInput) addContextNote(ctxInput.value);
      return;
    }

    var saveBtn = event.target.closest("#fdCoordNoteSave");
    if (saveBtn && els.body && els.body.contains(saveBtn)) {
      var input = $("fdCoordNoteInput");
      if (input) addNote(input.value);
      return;
    }

    handleNoteAction(event);
  }

  function onBodyInput(event) {
    if (event.target && event.target.id === "fdCoordNoteInput") {
      updateNoteSaveState();
      return;
    }
    if (event.target && event.target.id === "fdCtxNoteInput") {
      updateContextNoteSaveState();
    }
  }

  function onBodyKeydown(event) {
    if (event.target && event.target.id === "fdCoordNoteInput" && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      addNote(event.target.value);
      return;
    }
    if (event.target && event.target.id === "fdCtxNoteInput" && event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      addContextNote(event.target.value);
    }
  }

  function focusNoteInput() {
    requestAnimationFrame(function () {
      var input = $("fdCoordNoteInput");
      if (input && state.mode === "workspace" && state.activeTab === "notes") {
        input.focus();
      }
    });
  }

  function addNote(text) {
    var trimmed = (text || "").trim();
    if (!trimmed) return;

    state.notes.unshift({
      id: generateNoteId(),
      text: trimmed,
      createdAt: new Date().toISOString(),
      pinned: false,
    });
    saveNotes();
    renderBody();
  }

  function addContextNote(text) {
    var trimmed = (text || "").trim();
    if (!trimmed || !state.contextEngine) return;

    state.notes.unshift({
      id: generateNoteId(),
      text: trimmed,
      createdAt: new Date().toISOString(),
      pinned: false,
      context: {
        contextKey: state.contextKey,
        patientName: state.contextEngine.patientName,
        issue: state.contextEngine.issue,
        taskId: state.contextTask && state.contextTask.id,
      },
    });
    saveNotes();
    renderBody();
  }

  function updateContextNoteSaveState() {
    var input = $("fdCtxNoteInput");
    var saveBtn = $("fdCtxNoteSave");
    if (!input || !saveBtn) return;
    saveBtn.disabled = !input.value.trim();
  }

  function updateNoteSaveState() {
    var input = $("fdCoordNoteInput");
    var saveBtn = $("fdCoordNoteSave");
    if (!input || !saveBtn) return;
    saveBtn.disabled = !input.value.trim();
  }

  function handleNoteAction(event) {
    var actionBtn = event.target.closest("[data-note-action]");
    if (!actionBtn || !els.body || !els.body.contains(actionBtn)) return;

    var noteEl = actionBtn.closest("[data-note-id]");
    if (!noteEl) return;

    var noteId = noteEl.getAttribute("data-note-id");
    var action = actionBtn.getAttribute("data-note-action");
    var note = state.notes.find(function (n) {
      return n.id === noteId;
    });
    if (!note) return;

    if (action === "remove") {
      state.notes = state.notes.filter(function (n) {
        return n.id !== noteId;
      });
      saveNotes();
      renderBody();
      return;
    }

    if (action === "pin") {
      note.pinned = !note.pinned;
      saveNotes();
      renderBody();
    }
  }

  function contextTitleFor(panelType, task, ctx) {
    if (ctx && ctx.patientName) return ctx.patientName;
    if (UI && typeof UI.panelTitleFor === "function") {
      return UI.panelTitleFor(panelType, task || {});
    }
    return "Details";
  }

  function resolveContextEngine(panelType, task) {
    if (ContextEngine) {
      return ContextEngine.resolve(panelType, task || {});
    }
    return null;
  }

  function open(options) {
    var opts = options || {};
    cacheElements();

    if (opts.mode === "context") {
      setMode("context");
      state.contextType = opts.contextType;
      state.contextTask = opts.contextTask || {};
      state.contextEngine = resolveContextEngine(state.contextType, state.contextTask);
      state.contextKey = state.contextEngine ? state.contextEngine.contextKey : null;
      if (els.title) {
        els.title.textContent =
          opts.title || contextTitleFor(state.contextType, state.contextTask, state.contextEngine);
      }
    } else {
      setMode("workspace");
      state.contextType = null;
      state.contextTask = null;
      state.contextEngine = null;
      state.contextKey = null;
      setActiveTab(opts.tab || "notes");
    }

    if (els.overlay) {
      els.overlay.hidden = false;
      els.overlay.setAttribute("aria-hidden", "false");
    }
    if (els.panel) {
      els.panel.hidden = false;
    }

    setBodyOpen(true);
    renderBody();

    if (state.mode === "workspace" && state.activeTab === "notes") {
      focusNoteInput();
    } else if (els.close) {
      els.close.focus();
    }
  }

  function openWorkspace(tab) {
    open({ mode: "workspace", tab: tab || "notes" });
  }

  function openContext(contextType, task) {
    open({
      mode: "context",
      contextType: contextType,
      contextTask: task,
    });
  }

  function close() {
    if (els.overlay) {
      els.overlay.hidden = true;
      els.overlay.setAttribute("aria-hidden", "true");
    }
    if (els.panel) {
      els.panel.hidden = true;
    }
    setBodyOpen(false);
    state.contextType = null;
    state.contextTask = null;
    state.contextEngine = null;
    state.contextKey = null;
  }

  function isOpen() {
    return els.overlay && !els.overlay.hidden;
  }

  function cacheElements() {
    els.overlay = $("fdCoordOverlay");
    els.panel = $("fdCoordPanel");
    els.close = $("fdCoordClose");
    els.title = $("fdCoordTitle");
    els.tabs = $("fdCoordTabs");
    els.body = $("fdCoordBody");
    els.footer = $("fdCoordFooter");
  }

  function bindEvents() {
    if (state.eventsBound) return;
    state.eventsBound = true;

    cacheElements();

    if (els.close) {
      els.close.addEventListener("click", close);
    }

    if (els.overlay) {
      els.overlay.addEventListener("click", function (event) {
        if (event.target === els.overlay) {
          close();
        }
      });
    }

    if (els.tabs) {
      els.tabs.addEventListener("click", function (event) {
        var tabBtn = event.target.closest("[data-coord-tab]");
        if (!tabBtn || tabBtn.disabled) return;
        var tabId = tabBtn.getAttribute("data-coord-tab");
        if (!tabId || tabId === state.activeTab) return;
        setActiveTab(tabId);
      });
    }

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && isOpen()) {
        event.preventDefault();
        close();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === "n" && !event.shiftKey) {
        var tag = (event.target && event.target.tagName) || "";
        if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return;
        event.preventDefault();
        openWorkspace("notes");
      }
    });

    if (els.body) {
      els.body.addEventListener("click", onBodyClick);
      els.body.addEventListener("input", onBodyInput);
      els.body.addEventListener("keydown", onBodyKeydown);
    }

    var openNotes = $("fdCoordOpenNotes");
    if (openNotes) {
      openNotes.addEventListener("click", function () {
        openWorkspace("notes");
      });
    }

    var openTeam = $("fdCoordOpenTeam");
    if (openTeam) {
      openTeam.addEventListener("click", function () {
        openWorkspace("team");
      });
    }
  }

  function init() {
    if (state.initialized) return;
    state.initialized = true;
    state.notes = loadNotes();
    bindEvents();
  }

  window.FreedomDeskCoordinationPanel = {
    init: init,
    open: open,
    openWorkspace: openWorkspace,
    openContext: openContext,
    close: close,
    isOpen: isOpen,
  };
})();
