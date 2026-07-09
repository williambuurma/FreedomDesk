/**
 * My Day — dashboard module adapter.
 */
(function () {
  "use strict";

  var TEMPLATE_URL = "modules/my-day/template.html";

  FreedomDesk.registerModule({
    id: "my-day",
    label: "My Day",
    order: 1,
    navIcon: "day",
    navHint: "Your work",
    init: function (container) {
      container.innerHTML =
        '<div class="md-page">' +
        '<main class="md-main">' +
        '<div class="fd-container fd-container--wide md-container"></div>' +
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
          MyDayRenderer.init(container);
        })
        .catch(function () {
          var shell = container.querySelector(".md-container");
          if (shell) {
            shell.innerHTML =
              '<div class="md-error"><p>Unable to load My Day. Please refresh or contact support.</p></div>';
          }
        });
    },
  });
})();
