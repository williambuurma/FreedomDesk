/**
 * Shared role, priority, and owner labels for app workspaces.
 */
(function () {
  "use strict";

  var PRIORITY_RANK = { critical: 0, high: 1, medium: 2, low: 3 };

  var PRIORITY_LABELS = {
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
  };

  var OWNER_LABELS = {
    front_desk: "Front desk",
    dentist: "Doctor",
    office_manager: "Office manager",
    hygiene_coordinator: "Hygiene coordinator",
    assistant: "Assistant",
    hygiene: "Hygiene",
    billing: "Billing",
    freedomdesk_ops: "FreedomDesk",
  };

  /**
   * My Day V1 roles — same intelligence, different perspective.
   * owners: recommendation/task owners visible to this role
   * opportunityOwners: suggestedOwner values for opportunity filtering
   */
  var MY_DAY_ROLES = {
    dentist: {
      id: "dentist",
      label: "Doctor",
      recipientName: "Dr. Buurma",
      owners: ["dentist", "assistant"],
      opportunityOwners: ["dentist", "assistant"],
      insightDepartment: "doctor",
      maxPriorities: 3,
      maxPatients: 3,
      maxOpportunities: 2,
    },
    front_desk: {
      id: "front_desk",
      label: "Receptionist",
      recipientName: "Jessica",
      owners: ["front_desk"],
      opportunityOwners: ["front_desk"],
      insightDepartment: "front_desk",
      maxPriorities: 3,
      maxPatients: 3,
      maxOpportunities: 3,
    },
  };

  window.FreedomDeskLabels = {
    PRIORITY_RANK: PRIORITY_RANK,
    PRIORITY_LABELS: PRIORITY_LABELS,
    OWNER_LABELS: OWNER_LABELS,
    MY_DAY_ROLES: MY_DAY_ROLES,

    ownerLabel: function (role) {
      return OWNER_LABELS[role] || String(role || "").replace(/_/g, " ");
    },

    priorityLabel: function (priority) {
      return PRIORITY_LABELS[priority] || priority;
    },

    sortByPriority: function (items) {
      return items.slice().sort(function (a, b) {
        return (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
      });
    },
  };
})();
