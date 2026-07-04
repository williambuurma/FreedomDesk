/**
 * Shared utilities for FreedomDesk dashboard modules.
 */
(function () {
  "use strict";

  window.FreedomDeskUtils = {
    escapeHtml: function (str) {
      if (!str) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    },

    formatDate: function (isoDate) {
      try {
        var parts = isoDate.split("-");
        var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return d.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      } catch (_e) {
        return isoDate;
      }
    },

    formatDateTime: function (iso) {
      try {
        return new Date(iso).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
      } catch (_e) {
        return iso;
      }
    },
  };
})();
