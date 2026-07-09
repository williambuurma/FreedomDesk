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
          var ao = typeof a.order === "number" ? a.order : 99;
          var bo = typeof b.order === "number" ? b.order : 99;
          return ao - bo;
        });
    },

    /** Primary sidebar workspaces only — excludes settings and other utility modules. */
    getNavModules: function () {
      return this.getModuleList().filter(function (mod) {
        return mod.navVisible !== false;
      });
    },
  };
})();
