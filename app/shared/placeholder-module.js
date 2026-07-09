/**
 * Factory for app workspaces that are not yet implemented.
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

  window.FreedomDeskPlaceholder = function (config) {
    return {
      id: config.id,
      label: config.label,
      order: config.order,
      navIcon: config.navIcon,
      navVisible: config.navVisible,
      navHint: config.navHint,
      init: function (container) {
        var icon = ICONS[config.navIcon] || "";
        var featuresHtml = "";
        var kickerHtml = config.kicker
          ? '<p class="fd-module-kicker">' +
            FreedomDeskUtils.escapeHtml(config.kicker) +
            "</p>"
          : "";

        if (config.features && config.features.length > 0) {
          featuresHtml =
            '<ul class="fd-placeholder-features">' +
            config.features
              .map(function (feature) {
                return "<li>" + FreedomDeskUtils.escapeHtml(feature) + "</li>";
              })
              .join("") +
            "</ul>";
        }

        container.innerHTML =
          '<div class="fd-module-page">' +
          '<header class="fd-module-header">' +
          kickerHtml +
          '<h2 class="fd-module-page-title">' +
          FreedomDeskUtils.escapeHtml(config.label) +
          "</h2>" +
          '<p class="fd-module-page-desc">' +
          FreedomDeskUtils.escapeHtml(config.description) +
          "</p>" +
          "</header>" +
          '<div class="fd-placeholder-card">' +
          icon +
          '<p class="fd-placeholder-state">Not live yet</p>' +
          '<p class="fd-placeholder-hint">This workspace will open here when it is ready.</p>' +
          featuresHtml +
          "</div>" +
          "</div>";
      },
    };
  };
})();
