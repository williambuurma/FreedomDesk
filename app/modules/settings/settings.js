/**
 * Settings — practice configuration (placeholder). Opens from the profile menu.
 */
(function () {
  "use strict";

  FreedomDesk.registerModule(
    FreedomDeskPlaceholder({
      id: "settings",
      label: "Settings",
      order: 90,
      navIcon: "gear",
      navVisible: false,
      description:
        "Practice configuration that shapes every call — office hours, triage protocols, and PMS integration.",
      features: [
        "Office hours and on-call routing rules",
        "Emergency triage and same-day protocols",
        "Open Dental / PMS connection settings",
        "Voice persona and summary field preferences",
      ],
    })
  );
})();
