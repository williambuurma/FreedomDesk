/**
 * Today — single operating workspace adapter.
 */
(function () {
  "use strict";

  var TEMPLATE_URL = "modules/today/template.html";

  FreedomDesk.registerModule({
    id: "today",
    label: "Today",
    order: 0,
    navIcon: "day",
    navHint: "Focus",
    init: function (container) {
      container.innerHTML =
        '<div class="md-page">' +
        '<main class="md-main">' +
        '<div class="md-container"></div>' +
        "</main></div>";

      fetch(TEMPLATE_URL)
        .then(function (res) {
          if (!res.ok) throw new Error("Failed to load template");
          return res.text();
        })
        .then(function (html) {
          var shell = container.querySelector(".md-container");
          if (!shell) return;
          shell.innerHTML = html;
          TodayRenderer.init(container);
        })
        .catch(function () {
          var shell = container.querySelector(".md-container");
          if (shell) {
            shell.innerHTML =
              '<div class="md-error"><p>Unable to load Today. Please refresh or contact support.</p></div>';
          }
        });
    },
  });
})();
