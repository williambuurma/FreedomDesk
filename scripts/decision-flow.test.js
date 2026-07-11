/**
 * Decision Flow — queue progression from Arbitration surface + waiting.
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadDecisionFlow() {
  const code = fs.readFileSync(
    path.join(__dirname, "../app/shared/decision-flow.js"),
    "utf8"
  );
  const store = {};
  const sandbox = {
    localStorage: {
      getItem(key) {
        return Object.prototype.hasOwnProperty.call(store, key)
          ? store[key]
          : null;
      },
      setItem(key, value) {
        store[key] = String(value);
      },
      removeItem(key) {
        delete store[key];
      },
      _store: store,
    },
    matchMedia() {
      return { matches: false };
    },
    setTimeout,
    clearTimeout,
    requestAnimationFrame(cb) {
      return setTimeout(cb, 0);
    },
    console,
  };
  sandbox.window = sandbox;
  vm.runInNewContext(code, sandbox);
  return sandbox.window.FreedomDeskDecisionFlow;
}

describe("decision flow queue", () => {
  it("surfaces one primary and advances after terminal outcome", () => {
    const Flow = loadDecisionFlow();
    const surface = [
      {
        recommendationId: "rec_a",
        situation: "Urgent callback",
        arbitration: "surface",
      },
    ];
    const waiting = [
      {
        recommendationId: "rec_b",
        situation: "Fill open chair",
        arbitration: "wait",
      },
    ];

    const queue = Flow.buildQueue(surface, waiting);
    assert.equal(queue.length, 2);
    assert.equal(Flow.primaryDecision(queue).recommendationId, "rec_a");
    assert.equal(Flow.remainingAfterPrimary(queue), 1);

    Flow.setOutcome("rec_a", "completed");
    assert.equal(Flow.primaryDecision(queue).recommendationId, "rec_b");
    assert.equal(Flow.remainingAfterPrimary(queue), 0);

    Flow.setOutcome("rec_b", "dismissed");
    assert.equal(Flow.primaryDecision(queue), null);
  });

  it("keeps accepted recommendations active without advancing", () => {
    const Flow = loadDecisionFlow();
    const queue = Flow.buildQueue(
      [{ recommendationId: "rec_a", situation: "Call" }],
      [{ recommendationId: "rec_b", situation: "Next" }]
    );

    Flow.setOutcome("rec_a", "accepted");
    assert.equal(Flow.primaryDecision(queue).recommendationId, "rec_a");
    assert.equal(Flow.isTerminal("accepted"), false);
    assert.equal(Flow.outcomeLabel("accepted"), "Calling");
  });

  it("dedupes surface and waiting by recommendationId", () => {
    const Flow = loadDecisionFlow();
    const queue = Flow.buildQueue(
      [{ recommendationId: "same", situation: "A" }],
      [{ recommendationId: "same", situation: "A again" }]
    );
    assert.equal(queue.length, 1);
  });

  it("labels remaining work quietly", () => {
    const Flow = loadDecisionFlow();
    assert.equal(Flow.remainingLabel(0), "");
    assert.equal(Flow.remainingLabel(1), "1 waiting");
    assert.equal(Flow.remainingLabel(3), "3 waiting");
  });

  it("maps keyboard shortcuts without stealing typing", () => {
    const Flow = loadDecisionFlow();
    assert.equal(
      Flow.matchShortcut({ key: "d", target: { tagName: "DIV" } }),
      "completed"
    );
    assert.equal(
      Flow.matchShortcut({ key: "Enter", target: { tagName: "DIV" } }),
      "accepted"
    );
    assert.equal(
      Flow.matchShortcut({ key: "d", target: { tagName: "INPUT" } }),
      null
    );
  });
});
