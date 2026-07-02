import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { assessEmotion } from "./psychology.ts";

describe("assessEmotion", () => {
  test("returns unknown with zero confidence when no emotional signal matches", () => {
    const result = assessEmotion("I need to schedule a cleaning next Tuesday.");

    assert.equal(result.emotion, "unknown");
    assert.equal(result.confidence, 0);
    assert.equal(result.toneStrategy, "standard");
    assert.deepEqual(result.matchedRules, []);
    assert.deepEqual(result.reasons, []);
    assert.equal(result.deferAdminQuestions, false);
  });

  test("returns unknown for empty input", () => {
    const result = assessEmotion("   ");

    assert.equal(result.emotion, "unknown");
    assert.equal(result.confidence, 0);
  });

  test("detects fear and recommends reassurance before admin", () => {
    const result = assessEmotion("I'm scared about this appointment.");

    assert.equal(result.emotion, "anxious");
    assert.equal(result.toneStrategy, "reassure_before_admin");
    assert.equal(result.deferAdminQuestions, true);
    assert.ok(result.matchedRules.includes("PSY_SCARED"));
    assert.ok(result.confidence > 0);
  });

  test("detects embarrassment with validate-first strategy", () => {
    const result = assessEmotion("I'm embarrassed about how long it's been.");

    assert.equal(result.emotion, "embarrassed");
    assert.equal(result.toneStrategy, "validate_first");
    assert.ok(result.matchedRules.includes("PSY_EMBARRASSED"));
  });

  test("detects dental anxiety", () => {
    const result = assessEmotion("I hate the dentist and I'm nervous.");

    assert.equal(result.emotion, "dental_anxiety");
    assert.equal(result.toneStrategy, "reassure_before_admin");
    assert.ok(result.matchedRules.includes("PSY_DENTAL_ANXIETY"));
  });

  test("detects hold frustration without pediatric or trust labels", () => {
    const result = assessEmotion("I've been calling all day.");

    assert.equal(result.emotion, "frustrated");
    assert.equal(result.toneStrategy, "acknowledge_frustration");
    assert.ok(result.matchedRules.includes("PSY_FRUSTRATED_HOLD"));
  });

  test("detects missed-callback frustration", () => {
    const result = assessEmotion("Nobody called me back from yesterday.");

    assert.equal(result.emotion, "frustrated");
    assert.ok(result.matchedRules.includes("PSY_FRUSTRATED_CALLBACK"));
  });

  test("detects confusion and gentle clarification", () => {
    const result = assessEmotion("I don't understand what you mean.");

    assert.equal(result.emotion, "confused");
    assert.equal(result.toneStrategy, "clarify_gently");
    assert.ok(result.matchedRules.includes("PSY_CONFUSED_LANGUAGE"));
  });

  test("detects pain-driven distress without assigning clinical urgency", () => {
    const result = assessEmotion("I can't sleep because of the pain.");

    assert.equal(result.emotion, "pain");
    assert.equal(result.toneStrategy, "acknowledge_distress");
    assert.equal(result.emotionalBurden, "high");
    assert.ok(result.matchedRules.includes("PSY_PAIN_DISTRESS"));
  });

  test("does not infer emotion from pediatric phrasing alone", () => {
    const result = assessEmotion("My child needs an appointment.");

    assert.equal(result.emotion, "unknown");
    assert.equal(result.confidence, 0);
  });

  test("does not infer emotion from low-pressure scheduling phrasing alone", () => {
    const result = assessEmotion("I'm just checking your hours.");

    assert.equal(result.emotion, "unknown");
    assert.equal(result.confidence, 0);
  });

  test("merges multiple rules and preserves explainability", () => {
    const result = assessEmotion(
      "I'm scared and I don't know what to do."
    );

    assert.equal(result.emotion, "anxious");
    assert.ok(result.matchedRules.includes("PSY_SCARED"));
    assert.ok(result.matchedRules.includes("PSY_CONFUSED_UNCERTAIN"));
    assert.equal(result.reasons.length, 2);
    assert.equal(result.deferAdminQuestions, true);
  });
});
