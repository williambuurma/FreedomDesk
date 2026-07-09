/**
 * Morning Brief — dashboard module adapter.
 * Loads the original template and delegates to MorningBriefRenderer.
 */
(function () {
  "use strict";

  var TEMPLATE_URL = "modules/morning-brief/template.html";

  FreedomDesk.registerModule({
    id: "morning-brief",
    label: "Morning Brief",
    order: 0,
    navIcon: "brief",
    navHint: "Start here",
    init: function (container) {
      container.innerHTML =
        '<div class="mb-page">' +
        '<main class="mb-main">' +
        '<div class="fd-container fd-container--wide mb-container"></div>' +
        "</main></div>";

      fetch(TEMPLATE_URL)
        .then(function (res) {
          if (!res.ok) throw new Error("Failed to load template");
          return res.text();
        })
        .then(function (html) {
          var shell = container.querySelector(".mb-container");
          if (!shell) return;
          shell.innerHTML = html;
          MorningBriefRenderer.init();
        })
        .catch(function () {
          var shell = container.querySelector(".mb-container");
          if (shell) {
            shell.innerHTML =
              '<div class="mb-error"><p>Unable to load the morning brief preview. Please refresh or contact support.</p></div>';
          }
        });
    },
  });
})();
