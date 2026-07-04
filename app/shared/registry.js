/**
 * FreedomDesk internal dashboard — module registry.
 * Modules self-register via FreedomDesk.registerModule().
 */
(function () {
  "use strict";

  var modules = {};

  window.FreedomDesk = {
    modules: modules,

    registerModule: function (definition) {
      if (!definition || !definition.id || !definition.label || typeof definition.init !== "function") {
        throw new Error("Invalid dashboard module definition");
      }
      modules[definition.id] = definition;
    },

    getModule: function (id) {
      return modules[id] || null;
    },

    getModuleList: function () {
      return Object.keys(modules)
        .map(function (id) {
          return modules[id];
        })
        .sort(function (a, b) {
          return (a.order || 99) - (b.order || 99);
        });
    },
  };
})();
