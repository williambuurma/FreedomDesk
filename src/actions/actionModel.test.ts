import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { processCallTranscript } from "../conversation/processCall.ts";
import type { MockCallTranscript } from "../conversation/types.ts";
import fs from "node:fs";
import path from "node:path";

import {
  ACTION_SCHEMA_VERSION,
  materializeActionFromEvent,
  actionToInboxCard,
  buildMockInboxActions,
  buildMockInboxPayload,
  MOCK_OPERATIONAL_EVENTS,
} from "./index.ts";

const repoRoot = path.resolve(import.meta.dirname, "../..");

function loadFixture(name: string): MockCallTranscript {
  const filePath = path.join(repoRoot, "fixtures/calls", name);
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as MockCallTranscript;
}

describe("Action Model — materialize from Operational Event", () => {
  test("call operational event becomes Action with inbox fields", () => {
    const transcript = loadFixture("toothache-overnight.json");
    const { operationalEvent } = processCallTranscript(transcript);

    const action = materializeActionFromEvent(operationalEvent, {
      subjectDisplayName: "Finn Leo",
    });

    assert.ok(action);
    assert.equal(action!.$schema, ACTION_SCHEMA_VERSION);
    assert.equal(action!.practiceId, operationalEvent.practiceId);
    assert.deepEqual(action!.sourceEventIds, [operationalEvent.id]);
    assert.equal(action!.status, "needs_action");
    assert.equal(action!.lifecycleStatus, "active");
    assert.equal(action!.primaryResponsibility, operationalEvent.routing?.owner);
    assert.equal(action!.urgencyTier, operationalEvent.routing?.urgencyTier);
    assert.equal(action!.recommendedNextStep, operationalEvent.routing?.recommendedNextStep);
    assert.ok(action!.whatHappened.length > 0);
    assert.ok(action!.because.length > 0);
    assert.ok(action!.decision.length > 0);
    assert.ok(action!.ifIgnored.length > 0);
    assert.equal(action!.subjectDisplayName, "Finn Leo");
    assert.ok(action!.evidence.length >= 1);
  });

  test("event without recommendedNextStep produces no Action", () => {
    const transcript = loadFixture("toothache-overnight.json");
    const { operationalEvent } = processCallTranscript(transcript);
    const bare = {
      ...operationalEvent,
      routing: { ...operationalEvent.routing, recommendedNextStep: undefined },
    };
    assert.equal(materializeActionFromEvent(bare), null);
  });

  test("actionToInboxCard projects required card fields", () => {
    const actions = buildMockInboxActions();
    assert.ok(actions.length >= 4);

    const card = actionToInboxCard(actions[0]!);
    assert.ok(card.id);
    assert.ok(card.decision);
    assert.ok(card.ifIgnored);
    assert.ok(card.whatHappened);
    assert.ok(card.because);
    assert.ok(card.recommendedNextStep);
    assert.ok(card.primaryResponsibility);
    assert.ok(card.urgencyTier);
    assert.ok(["needs_action", "committed", "completed", "dismissed"].includes(card.status));
    assert.ok(Array.isArray(card.evidence));
    assert.match(card.decision, /Call Finn Leo/i);
  });
});

describe("Intelligence Inbox — mock payload", () => {
  test("mock events materialize into role-diverse decision actions", () => {
    const actions = buildMockInboxActions();
    assert.equal(actions.length, MOCK_OPERATIONAL_EVENTS.length);

    const statuses = new Set(actions.map((a) => a.status));
    assert.ok(statuses.has("needs_action"));
    assert.ok(statuses.has("committed"));
    assert.ok(statuses.has("completed"));

    const owners = new Set(actions.map((a) => a.primaryResponsibility));
    assert.ok(owners.has("dentist"));
    assert.ok(owners.has("front_desk"));

    const payload = buildMockInboxPayload();
    assert.equal(payload.$schema, "intelligence-inbox/v1");
    assert.equal(payload.actions.length, actions.length);
    assert.ok(payload.actions.every((a) => a.sourceEventIds.length >= 1));
    assert.ok(payload.actions.every((a) => a.decision && a.ifIgnored));
  });
});
