/**
 * Opportunities dashboard module — placeholder for Practice Brain opportunity tracking.
 */
(function () {
  "use strict";

  FreedomDesk.registerModule(
    FreedomDeskPlaceholder({
      id: "opportunities",
      label: "Opportunities",
      order: 4,
      navIcon: "spark",
      description:
        "Revenue and retention opportunities detected by Practice Brain — recall gaps, waitlist fills, and open chair time.",
      features: [
        "Cancellation recovery and waitlist matching",
        "Recall and reactivation candidates",
        "Open doctor and hygiene block fills",
        "Impact-ranked with suggested owner",
      ],
    })
  );
})();
