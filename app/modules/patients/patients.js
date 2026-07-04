/**
 * Patients dashboard module — placeholder for patient lookup and intake.
 */
(function () {
  "use strict";

  FreedomDesk.registerModule(
    FreedomDeskPlaceholder({
      id: "patients",
      label: "Patients",
      order: 3,
      navIcon: "users",
      description:
        "Patient context before the phone rings — intake status, insurance taxonomy, and demographics in one calm view.",
      features: [
        "New-patient intake status and completeness",
        "West Michigan insurance classification (PPO, HKD, Medicaid)",
        "Demographics update requests from recent calls",
        "Quick lookup without opening the PMS",
      ],
    })
  );
})();
