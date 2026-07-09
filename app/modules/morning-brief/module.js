/**
 * Morning Brief — kept for legacy hash redirects only.
 * Not a primary navigation destination; Today owns the morning state.
 */
(function () {
  "use strict";

  FreedomDesk.registerModule({
    id: "morning-brief",
    label: "Morning Brief",
    order: 90,
    navIcon: "brief",
    navHint: "Start here",
    navVisible: false,
    init: function () {
      /* Redirect handled by dashboard.js LEGACY_REDIRECTS */
    },
  });
})();
