import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, test, after } from "node:test";

import {
  buildTranscriptFromGather,
  completeCallFromTranscript,
  mergeTodayWithLatestCall,
  selectGreeting,
  loadPracticeVoiceConfig,
  isAfterHours,
} from "./index.ts";

describe("telephony — transcript from Gather", () => {
  test("builds MockCallTranscript from speech result", () => {
    const transcript = buildTranscriptFromGather({
      callSid: "CA_test_123",
      speechResult: "I have an awful toothache that kept me up all night",
      now: new Date("2026-07-11T14:00:00.000Z"),
    });

    assert.ok(transcript);
    assert.match(transcript!.id, /call_twilio_CA_test_123/);
    assert.equal(transcript!.scenario, "twilio-inbound-gather");
    assert.equal(transcript!.turns.length >= 2, true);
    assert.equal(transcript!.turns[0].speaker, "aly");
    assert.match(transcript!.turns[0].text, /Aly/);
    assert.equal(transcript!.turns[1].speaker, "patient");
    assert.match(transcript!.turns[1].text, /toothache/);
  });

  test("returns null when caller said nothing", () => {
    assert.equal(
      buildTranscriptFromGather({ callSid: "CA_empty", speechResult: "  " }),
      null
    );
  });
});

describe("telephony — completed call adapter", () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fd-telephony-"));
  const storePath = path.join(tmpDir, "latest-actionable-call.json");

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("toothache gather runs pipeline and yields a front-desk decision card", () => {
    const transcript = buildTranscriptFromGather({
      callSid: "CA_toothache_local",
      speechResult:
        "Hey, I have an awful toothache that's kept me up all night. Are you open?",
      now: new Date("2026-07-11T06:00:00.000Z"),
    });
    assert.ok(transcript);

    const artifact = completeCallFromTranscript(transcript!, {
      source: "local_test",
      resetRegistries: true,
    });

    assert.equal(artifact.schema, "latest-actionable-call/v1");
    assert.equal(artifact.intent, "EMERGENCY");
    assert.ok(
      artifact.urgency === "urgent" || artifact.urgency === "emergency"
    );
    assert.ok(artifact.decisionCard);
    assert.ok(artifact.decisionCard.primaryAction);
    assert.ok(artifact.decisionCard.situation);
    assert.ok(artifact.recommendedNextStep);
    assert.ok(artifact.operatingIntelligence);
    assert.ok(artifact.operatingIntelligence.executiveSummary);
    assert.ok(artifact.operatingIntelligence.chiefConcern);
    assert.equal(typeof artifact.operatingIntelligence.immediateAttention, "boolean");
    assert.ok(artifact.callSummary.executiveSummary);

    fs.writeFileSync(storePath, JSON.stringify(artifact, null, 2));
    assert.equal(fs.existsSync(storePath), true);
  });

  test("merge overlays live decision card onto Today preview", () => {
    const transcript = buildTranscriptFromGather({
      callSid: "CA_merge_local",
      speechResult: "I need to schedule a new patient exam",
      now: new Date("2026-07-11T15:00:00.000Z"),
    });
    const artifact = completeCallFromTranscript(transcript!, {
      source: "local_test",
    });

    const preview = {
      previewMode: true,
      roles: {
        front_desk: {
          decisionCards: [
            {
              id: "demo_card",
              primaryAction: "Call Emily.",
              situation: "Demo",
            },
          ],
          waitingDecisions: [],
        },
      },
    };

    const merged = mergeTodayWithLatestCall(preview, artifact);
    assert.equal(merged.liveCallActive, true);
    assert.equal(merged.liveCallId, artifact.callId);
    assert.equal(merged.roles!.front_desk!.decisionCards!.length, 1);
    assert.equal(
      (merged.roles!.front_desk!.decisionCards![0] as { id: string }).id,
      artifact.decisionCard.id
    );
    assert.ok(
      (merged.roles!.front_desk!.waitingDecisions as unknown[]).some(
        (c) => (c as { id: string }).id === "demo_card"
      )
    );
  });

  test("merge without latest keeps preview and marks liveCallActive false", () => {
    const preview = { previewMode: true, roles: { front_desk: { decisionCards: [] } } };
    const merged = mergeTodayWithLatestCall(preview, null);
    assert.equal(merged.liveCallActive, false);
  });
});

describe("telephony — practice greeting", () => {
  test("loads greeting from practice name and agent", () => {
    const config = loadPracticeVoiceConfig();
    const greeting = selectGreeting(config, new Date("2026-07-10T15:00:00.000Z"));
    assert.match(greeting, /Cascade Family Dentistry/);
    assert.match(greeting, /Aly/);
    assert.match(greeting, /How can I help/);
    assert.doesNotMatch(greeting, /Thank you for calling/);
  });

  test("detects after-hours from practice hours", () => {
    const config = loadPracticeVoiceConfig();
    // Sunday evening Detroit — closed
    assert.equal(
      isAfterHours(config, new Date("2026-07-12T23:00:00.000Z")),
      true
    );
  });
});
