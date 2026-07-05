/**
 * FreedomDesk internal dashboard shell — sidebar, header, module routing.
 */
(function () {
  "use strict";

  var DEFAULT_MODULE = "my-day";
  var currentModuleId = null;
  var currentModuleInstance = null;

  var NAV_ICONS = {
    brief:
      '<svg class="fd-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M6 4h12a2 2 0 0 1 2 2v14l-4-3-4 3-4-3-4 3V6a2 2 0 0 1 2-2z"/><path d="M9 8h6M9 12h4"/></svg>',
    phone:
      '<svg class="fd-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    users:
      '<svg class="fd-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    spark:
      '<svg class="fd-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"/><path d="M5 19l1 3 1-3 3-1-3-1-1-3-1 3-3 1 3 1z"/></svg>',
    chart:
      '<svg class="fd-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>',
    gear:
      '<svg class="fd-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  };

  function $(id) {
    return document.getElementById(id);
  }

  function getModuleIdFromHash() {
    var hash = window.location.hash.replace(/^#/, "");
    return hash || DEFAULT_MODULE;
  }

  function setActiveNav(moduleId) {
    var links = document.querySelectorAll(".fd-nav-link");
    links.forEach(function (link) {
      var isActive = link.getAttribute("data-module") === moduleId;
      link.classList.toggle("fd-nav-link-active", isActive);
      link.setAttribute("aria-current", isActive ? "page" : "false");
    });
  }

  function updateHeader(module) {
    var titleEl = $("fdModuleTitle");
    var contentEl = $("fdDashboardContent");
    var isHome = module && (module.id === DEFAULT_MODULE || module.id === "my-day");

    if (titleEl && module) {
      if (isHome) {
        titleEl.textContent = "What should I do next?";
        titleEl.classList.add("fd-header-home");
      } else {
        titleEl.textContent = module.label;
        titleEl.classList.remove("fd-header-home");
      }
    }

    if (contentEl) {
      contentEl.classList.toggle("fd-content-home", isHome);
    }

    document.title = module ? module.label + " — FreedomDesk" : "FreedomDesk";
  }

  function destroyCurrentModule() {
    if (currentModuleInstance && typeof currentModuleInstance.destroy === "function") {
      currentModuleInstance.destroy();
    }
    currentModuleInstance = null;
    currentModuleId = null;
  }

  function navigateTo(moduleId, options) {
    var opts = options || {};
    var module = FreedomDesk.getModule(moduleId);

    if (!module) {
      navigateTo(DEFAULT_MODULE, { replaceHash: true });
      return;
    }

    if (currentModuleId === moduleId && !opts.force) {
      return;
    }

    destroyCurrentModule();

    var container = $("fdDashboardContent");
    if (!container) return;

    container.innerHTML = "";
    currentModuleId = moduleId;
    currentModuleInstance = module;
    module.init(container);

    setActiveNav(moduleId);
    updateHeader(module);

    if (opts.replaceHash !== false) {
      var newHash = "#" + moduleId;
      if (window.location.hash !== newHash) {
        history.replaceState(null, "", newHash);
      }
    }
  }

  function buildSidebarNav() {
    var navList = $("fdModuleNav");
    if (!navList) return;

    var modules = FreedomDesk.getModuleList();
    navList.innerHTML = modules
      .map(function (mod) {
        var icon = NAV_ICONS[mod.navIcon] || "";
        return (
          '<li class="fd-nav-item">' +
          '<a href="#' +
          mod.id +
          '" class="fd-nav-link" data-module="' +
          mod.id +
          '">' +
          icon +
          "<span>" +
          FreedomDeskUtils.escapeHtml(mod.label) +
          "</span>" +
          "</a>" +
          "</li>"
        );
      })
      .join("");

    navList.addEventListener("click", function (event) {
      var link = event.target.closest(".fd-nav-link");
      if (!link) return;
      event.preventDefault();
      var moduleId = link.getAttribute("data-module");
      navigateTo(moduleId);
      closeSidebar();
    });
  }

  function closeSidebar() {
    var layout = document.querySelector(".fd-dashboard-layout");
    if (layout) layout.classList.remove("fd-sidebar-open");
  }

  function toggleSidebar() {
    var layout = document.querySelector(".fd-dashboard-layout");
    if (layout) layout.classList.toggle("fd-sidebar-open");
  }

  function bindShellEvents() {
    var toggle = $("fdSidebarToggle");
    if (toggle) {
      toggle.addEventListener("click", toggleSidebar);
    }

    var backdrop = $("fdSidebarBackdrop");
    if (backdrop) {
      backdrop.addEventListener("click", closeSidebar);
    }

    window.addEventListener("hashchange", function () {
      navigateTo(getModuleIdFromHash(), { replaceHash: false });
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 960) {
        closeSidebar();
      }
    });
  }

  function init() {
    buildSidebarNav();
    bindShellEvents();
    navigateTo(getModuleIdFromHash(), { replaceHash: false, force: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
