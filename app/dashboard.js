/**
 * FreedomDesk companion shell — UI v2
 * Permanent icon rail + workspace routing. Settings in the sidebar footer.
 * Primary nav: Today · Patients · Ask FreedomDesk.
 */
(function () {
  "use strict";

  var DEFAULT_MODULE = "today";
  var currentModuleId = null;
  var currentModuleInstance = null;

  /** Old homes redirect into Today — no duplicate primary workspaces. */
  var LEGACY_REDIRECTS = {
    "my-day": "today",
    "morning-brief": "today",
    "intelligence-inbox": "today",
  };

  var NAV_ICONS = {
    brief:
      '<svg class="fd-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M6 4h12a2 2 0 0 1 2 2v14l-4-3-4 3-4-3-4 3V6a2 2 0 0 1 2-2z"/><path d="M9 8h6M9 12h4"/></svg>',
    day:
      '<svg class="fd-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg>',
    phone:
      '<svg class="fd-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
    users:
      '<svg class="fd-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    spark:
      '<svg class="fd-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z"/></svg>',
    ask:
      '<svg class="fd-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2.5-3 4"/><path d="M12 17h.01"/></svg>',
    chart:
      '<svg class="fd-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>',
    gear:
      '<svg class="fd-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  };

  var HEADER_TITLES = {
    today: "Today",
    patients: "Patients",
    ask: "Ask FreedomDesk",
    settings: "Settings",
  };

  function $(id) {
    return document.getElementById(id);
  }

  function resolveModuleId(moduleId) {
    if (!moduleId) return DEFAULT_MODULE;
    return LEGACY_REDIRECTS[moduleId] || moduleId;
  }

  function getModuleIdFromHash() {
    var hash = window.location.hash.replace(/^#/, "");
    return resolveModuleId(hash || DEFAULT_MODULE);
  }

  function setActiveNav(moduleId) {
    var links = document.querySelectorAll(".fd-nav-link");
    links.forEach(function (link) {
      var isActive = link.getAttribute("data-module") === moduleId;
      link.classList.toggle("fd-nav-link-active", isActive);
      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function updateHeader(module) {
    var titleEl = $("fdModuleTitle");
    var headerEl = document.querySelector(".fd-companion-header");
    if (titleEl && module) {
      // Today owns its greeting in-content — collapse empty chrome
      if (module.id === "today") {
        titleEl.hidden = true;
        if (headerEl) headerEl.hidden = true;
      } else {
        titleEl.hidden = false;
        titleEl.textContent = HEADER_TITLES[module.id] || module.label;
        if (headerEl) headerEl.hidden = false;
      }
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
    var resolvedId = resolveModuleId(moduleId);
    var module = FreedomDesk.getModule(resolvedId);

    if (!module) {
      navigateTo(DEFAULT_MODULE, { replaceHash: true });
      return;
    }

    if (currentModuleId === resolvedId && !opts.force) {
      if (resolvedId !== moduleId && opts.replaceHash !== false) {
        var syncHash = "#" + resolvedId;
        if (window.location.hash !== syncHash) {
          history.replaceState(null, "", syncHash);
        }
      }
      return;
    }

    destroyCurrentModule();

    var container = $("fdDashboardContent");
    if (!container) return;

    container.innerHTML = "";
    container.scrollTop = 0;
    currentModuleId = resolvedId;
    currentModuleInstance = module;
    module.init(container);

    setActiveNav(resolvedId);
    updateHeader(module);
    closeProfileMenu();

    if (opts.replaceHash !== false) {
      var newHash = "#" + resolvedId;
      if (window.location.hash !== newHash) {
        history.replaceState(null, "", newHash);
      }
    }
  }

  function buildCompanionNav() {
    var navList = $("fdModuleNav");
    if (!navList) return;

    var modules = FreedomDesk.getNavModules
      ? FreedomDesk.getNavModules()
      : FreedomDesk.getModuleList();

    navList.innerHTML = modules
      .map(function (mod) {
        var icon = NAV_ICONS[mod.navIcon] || "";
        return (
          '<li class="fd-nav-item">' +
          '<a href="#' +
          mod.id +
          '" class="fd-nav-link" data-module="' +
          mod.id +
          '" title="' +
          FreedomDeskUtils.escapeHtml(mod.label) +
          '">' +
          icon +
          '<span class="fd-nav-label">' +
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
      navigateTo(link.getAttribute("data-module"));
    });
  }

  function closeProfileMenu() {
    var menu = $("fdProfileMenu");
    var trigger = $("fdProfileTrigger");
    if (menu) {
      menu.hidden = true;
      menu.setAttribute("aria-hidden", "true");
    }
    if (trigger) trigger.setAttribute("aria-expanded", "false");
  }

  function toggleProfileMenu() {
    var menu = $("fdProfileMenu");
    var trigger = $("fdProfileTrigger");
    if (!menu || !trigger) return;
    var open = menu.hidden;
    menu.hidden = !open;
    menu.setAttribute("aria-hidden", open ? "false" : "true");
    trigger.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function bindShellEvents() {
    var profileTrigger = $("fdProfileTrigger");
    if (profileTrigger) {
      profileTrigger.addEventListener("click", function (event) {
        event.stopPropagation();
        toggleProfileMenu();
      });
    }

    var profileMenu = $("fdProfileMenu");
    if (profileMenu) {
      profileMenu.addEventListener("click", function (event) {
        var item = event.target.closest("[data-module]");
        if (!item) return;
        event.preventDefault();
        navigateTo(item.getAttribute("data-module"));
      });
    }

    document.addEventListener("click", function (event) {
      var wrap = $("fdProfileWrap");
      if (wrap && !wrap.contains(event.target)) {
        closeProfileMenu();
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeProfileMenu();
    });

    window.addEventListener("hashchange", function () {
      navigateTo(getModuleIdFromHash(), { replaceHash: true, force: false });
    });
  }

  function init() {
    if (window.FreedomDeskCoordinationPanel) {
      window.FreedomDeskCoordinationPanel.init();
    }
    buildCompanionNav();
    bindShellEvents();
    navigateTo(getModuleIdFromHash(), { replaceHash: true, force: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
