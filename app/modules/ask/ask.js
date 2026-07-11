/**
 * Ask FreedomDesk — practice Q&A workspace (not in Alpha nav).
 */
(function () {
  "use strict";

  FreedomDesk.registerModule(
    FreedomDeskPlaceholder({
      id: "ask",
      label: "Ask FreedomDesk",
      order: 2,
      navIcon: "ask",
      navHint: "Questions",
      navVisible: false,
      emptyHint:
        "Ask about today’s schedule, a patient, or what still needs attention.",
    })
  );
})();
