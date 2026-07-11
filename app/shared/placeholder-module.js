/**
 * Factory for app workspaces that are not yet fully live.
 * Alpha empty states stay calm and useful — never a feature roadmap.
 */
(function () {
  "use strict";

  var ICONS = {
    phone:
      '<svg class="fd-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    users:
      '<svg class="fd-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    spark:
      '<svg class="fd-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"/><path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z"/></svg>',
    chart:
      '<svg class="fd-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>',
    gear:
      '<svg class="fd-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    ask:
      '<svg class="fd-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4"/><path d="M12 17h.01"/></svg>',
  };

  function escape(str) {
    return FreedomDeskUtils.escapeHtml(str);
  }

  function renderPatientsEmpty(config) {
    return (
      '<div class="fd-module-page fd-module-page--empty">' +
      '<header class="fd-module-header">' +
      '<p class="fd-module-page-desc">' +
      escape(
        config.emptyHint ||
          "Find a patient when you need context — without leaving the schedule."
      ) +
      "</p>" +
      "</header>" +
      '<label class="fd-empty-search">' +
      '<span class="fd-empty-search-label">Search</span>' +
      '<input type="search" class="fd-empty-search-input" placeholder="Name, phone, or chart #" disabled aria-disabled="true" />' +
      "</label>" +
      '<p class="fd-empty-status" role="status">Patient lookup opens here next.</p>' +
      "</div>"
    );
  }

  function renderAskEmpty(config) {
    return (
      '<div class="fd-module-page fd-module-page--empty">' +
      '<header class="fd-module-header">' +
      '<p class="fd-module-page-desc">' +
      escape(
        config.emptyHint ||
          "Ask about today’s schedule, a patient, or what still needs attention."
      ) +
      "</p>" +
      "</header>" +
      '<label class="fd-empty-ask">' +
      '<span class="fd-empty-ask-label">Ask</span>' +
      '<textarea class="fd-empty-ask-input" rows="3" placeholder="Who still needs a callback?" disabled aria-disabled="true"></textarea>' +
      "</label>" +
      '<p class="fd-empty-status" role="status">Answers will stay grounded in practice context.</p>' +
      "</div>"
    );
  }

  function renderGenericEmpty(config) {
    var icon = ICONS[config.navIcon] || "";
    return (
      '<div class="fd-module-page fd-module-page--empty">' +
      '<header class="fd-module-header">' +
      '<h2 class="fd-module-page-title">' +
      escape(config.label) +
      "</h2>" +
      '<p class="fd-module-page-desc">' +
      escape(config.description || "") +
      "</p>" +
      "</header>" +
      '<div class="fd-placeholder-card">' +
      icon +
      '<p class="fd-placeholder-state">Coming soon</p>' +
      '<p class="fd-placeholder-hint">' +
      escape(
        config.emptyHint ||
          "This workspace will open here when it is ready."
      ) +
      "</p>" +
      "</div>" +
      "</div>"
    );
  }

  window.FreedomDeskPlaceholder = function (config) {
    return {
      id: config.id,
      label: config.label,
      order: config.order,
      navIcon: config.navIcon,
      navVisible: config.navVisible,
      navHint: config.navHint,
      init: function (container) {
        if (config.id === "patients") {
          container.innerHTML = renderPatientsEmpty(config);
          return;
        }
        if (config.id === "ask") {
          container.innerHTML = renderAskEmpty(config);
          return;
        }
        container.innerHTML = renderGenericEmpty(config);
      },
    };
  };
})();
