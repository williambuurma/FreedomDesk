/**
 * Decision Flow — calm one-at-a-time recommendation progression.
 *
 * Consumes Decision Arbitration surface + waiting queues.
 * Outcomes persist locally; terminal outcomes advance to the next primary.
 * Timing is intentional: settle → breath → arrive.
 */
(function () {
  "use strict";

  var STORAGE_KEY = "freedomdesk_today_decision_outcomes";

  /** Motion budget — Apple-calm, never flashy. */
  var TIMING = {
    resolveMs: 220,
    exitMs: 320,
    holdMs: 160,
    enterMs: 420,
  };

  var TERMINAL = {
    completed: true,
    dismissed: true,
    snoozed: true,
  };

  function prefersReducedMotion() {
    try {
      return (
        window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    } catch (_e) {
      return false;
    }
  }

  function isTerminal(status) {
    return !!(status && TERMINAL[status]);
  }

  function cardId(card) {
    if (!card) return "";
    return card.recommendationId || card.id || "";
  }

  function loadOutcomes() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_e) {
      return {};
    }
  }

  function saveOutcomes(overrides) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides || {}));
    } catch (_e) {
      /* ignore quota / private mode */
    }
  }

  function setOutcome(recommendationId, status) {
    if (!recommendationId || !status) return loadOutcomes();
    var overrides = loadOutcomes();
    overrides[recommendationId] = {
      status: status,
      recordedAt: new Date().toISOString(),
    };
    saveOutcomes(overrides);
    return overrides;
  }

  function getOutcomeStatus(recommendationId, outcomes) {
    var map = outcomes || loadOutcomes();
    var entry = map[recommendationId];
    return entry && entry.status ? entry.status : "";
  }

  /**
   * Arbitration order: surfaced primary first, then waiting (already ranked).
   * Dedupes by recommendationId.
   */
  function buildQueue(decisionCards, waitingDecisions) {
    var seen = {};
    var queue = [];

    function push(card) {
      var id = cardId(card);
      if (!card || !id || seen[id]) return;
      seen[id] = true;
      queue.push(card);
    }

    (decisionCards || []).forEach(push);
    (waitingDecisions || []).forEach(push);
    return queue;
  }

  function activeQueue(queue, outcomes) {
    var map = outcomes || loadOutcomes();
    return (queue || []).filter(function (card) {
      return !isTerminal(getOutcomeStatus(cardId(card), map));
    });
  }

  /** Next highest-priority recommendation still needing attention. */
  function primaryDecision(queue, outcomes) {
    var active = activeQueue(queue, outcomes);
    return active.length ? active[0] : null;
  }

  function remainingAfterPrimary(queue, outcomes) {
    var active = activeQueue(queue, outcomes);
    return Math.max(0, active.length - 1);
  }

  function outcomeLabel(status) {
    if (status === "accepted") return "Calling";
    if (status === "snoozed") return "Later";
    if (status === "dismissed") return "Not needed";
    if (status === "completed") return "Done";
    return status || "";
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  /**
   * Animate a completed card out, then invoke onReady for the next surface.
   * Returns a promise that resolves after exit + hold.
   */
  function animateAdvance(cardEl, options) {
    var opts = options || {};
    var reduced = prefersReducedMotion();
    var resolveMs = reduced ? 0 : TIMING.resolveMs;
    var exitMs = reduced ? 0 : TIMING.exitMs;
    var holdMs = reduced ? 0 : TIMING.holdMs;

    if (!cardEl) {
      return wait(holdMs).then(function () {
        if (typeof opts.onReady === "function") opts.onReady();
      });
    }

    cardEl.classList.add("fd-dc--resolving");
    if (opts.resolvedLabel) {
      var labelEl = cardEl.querySelector(".fd-dc-resolved, .fd-dc-primary");
      if (labelEl && labelEl.classList.contains("fd-dc-resolved")) {
        labelEl.textContent = opts.resolvedLabel;
      }
    }

    return wait(resolveMs)
      .then(function () {
        cardEl.classList.remove("fd-dc--resolving");
        cardEl.classList.add("fd-dc--exiting");
        return wait(exitMs);
      })
      .then(function () {
        return wait(holdMs);
      })
      .then(function () {
        if (typeof opts.onReady === "function") opts.onReady();
      });
  }

  /** Mark a freshly rendered primary for enter motion. */
  function markEntering(cardEl) {
    if (!cardEl || prefersReducedMotion()) return;
    cardEl.classList.add("fd-dc--entering");
    // Force reflow so the enter transition runs from the initial keyframe.
    void cardEl.offsetWidth;
    requestAnimationFrame(function () {
      cardEl.classList.add("fd-dc--entered");
      window.setTimeout(function () {
        cardEl.classList.remove("fd-dc--entering", "fd-dc--entered");
      }, TIMING.enterMs + 40);
    });
  }

  window.FreedomDeskDecisionFlow = {
    STORAGE_KEY: STORAGE_KEY,
    TIMING: TIMING,
    prefersReducedMotion: prefersReducedMotion,
    isTerminal: isTerminal,
    cardId: cardId,
    loadOutcomes: loadOutcomes,
    saveOutcomes: saveOutcomes,
    setOutcome: setOutcome,
    getOutcomeStatus: getOutcomeStatus,
    buildQueue: buildQueue,
    activeQueue: activeQueue,
    primaryDecision: primaryDecision,
    remainingAfterPrimary: remainingAfterPrimary,
    outcomeLabel: outcomeLabel,
    wait: wait,
    animateAdvance: animateAdvance,
    markEntering: markEntering,
  };
})();
