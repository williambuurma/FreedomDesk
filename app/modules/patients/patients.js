/**
 * Patients — lookup workspace (placeholder).
 */
(function () {
  "use strict";

  FreedomDesk.registerModule(
    FreedomDeskPlaceholder({
      id: "patients",
      label: "Patients",
      order: 3,
      navIcon: "users",
      navHint: "Lookup",
      description:
        "Find a patient when you need context — intake, insurance, and recent call handoffs.",
      features: [
        "New-patient intake status",
        "Insurance classification (PPO, HKD, Medicaid)",
        "Updates from recent calls",
        "Quick lookup without opening the PMS",
      ],
    })
  );
})();
