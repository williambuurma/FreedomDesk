/**
 * Analytics dashboard module — placeholder for practice metrics and trends.
 */
(function () {
  "use strict";

  FreedomDesk.registerModule(
    FreedomDeskPlaceholder({
      id: "analytics",
      label: "Analytics",
      order: 5,
      navIcon: "chart",
      description:
        "How FreedomDesk is stewarding your practice — call volume, summary quality, and front-desk efficiency over time.",
      features: [
        "Call volume by hour and day-of-week patterns",
        "Summary completeness and intake quality trends",
        "Cancellation fill rate and schedule utilization",
        "After-hours capture and emergency routing metrics",
      ],
    })
  );
})();
