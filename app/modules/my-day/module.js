/**
 * My Day — legacy id only. Redirects to Today via dashboard LEGACY_REDIRECTS.
 */
(function () {
  "use strict";

  FreedomDesk.registerModule({
    id: "my-day",
    label: "Today",
    order: 92,
    navIcon: "day",
    navHint: "Focus",
    navVisible: false,
    init: function () {
      /* Redirect handled by dashboard.js LEGACY_REDIRECTS */
    },
  });
})();
