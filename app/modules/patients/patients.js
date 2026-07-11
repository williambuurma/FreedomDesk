/**
 * Patients — lookup workspace (not in Alpha nav).
 */
(function () {
  "use strict";

  FreedomDesk.registerModule(
    FreedomDeskPlaceholder({
      id: "patients",
      label: "Patients",
      order: 1,
      navIcon: "users",
      navHint: "Lookup",
      navVisible: false,
      emptyHint:
        "Find a patient when you need context — intake, insurance, and recent call handoffs.",
    })
  );
})();
