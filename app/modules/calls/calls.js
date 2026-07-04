/**
 * Calls dashboard module — placeholder for call history and live monitoring.
 */
(function () {
  "use strict";

  FreedomDesk.registerModule(
    FreedomDeskPlaceholder({
      id: "calls",
      label: "Calls",
      order: 2,
      navIcon: "phone",
      description:
        "Every call FreedomDesk handles — structured summaries, triage flags, and intake completeness at a glance.",
      features: [
        "Live call monitoring and after-hours queue",
        "Structured intake summaries mapped to Open Dental",
        "Emergency triage and same-day routing history",
        "Search by patient, intent, or appointment type",
      ],
    })
  );
})();
