/**
 * Ask FreedomDesk — practice Q&A workspace (placeholder).
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
      description:
        "Ask about today’s schedule, a patient, or what needs attention — answers stay grounded in practice context.",
      features: [
        "Plain-language questions about the day",
        "Answers from calls, schedule, and decisions",
        "Uncertainty stays visible — no guessing",
        "Points you to the right next step",
      ],
    })
  );
})();
