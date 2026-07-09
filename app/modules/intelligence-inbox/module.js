/**
 * Intelligence Inbox — dashboard module adapter.
 */
(function () {
  "use strict";

  var TEMPLATE_URL = "modules/intelligence-inbox/template.html";

  FreedomDesk.registerModule({
    id: "intelligence-inbox",
    label: "Next",
    order: 2,
    navIcon: "spark",
    navHint: "Decisions",
    init: function (container) {
      container.innerHTML =
        '<div class="ii-page">' +
        '<main class="ii-main">' +
        '<div class="fd-container fd-container--wide ii-container"></div>' +
        "</main></div>";

      fetch(TEMPLATE_URL)
        .then(function (res) {
          if (!res.ok) throw new Error("Failed to load template");
          return res.text();
        })
        .then(function (html) {
          var shell = container.querySelector(".ii-container");
          if (!shell) return;
          shell.innerHTML = html;
          IntelligenceInboxRenderer.init(container);
        })
        .catch(function () {
          var shell = container.querySelector(".ii-container");
          if (shell) {
            shell.innerHTML =
              '<div class="ii-error"><p>Unable to load Next. Please refresh.</p></div>';
          }
        });
    },
    destroy: function () {
      if (window.IntelligenceInboxRenderer && typeof IntelligenceInboxRenderer.destroy === "function") {
        IntelligenceInboxRenderer.destroy();
      }
    },
  });
})();
