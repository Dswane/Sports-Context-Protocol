import { test } from "node:test";
import assert from "node:assert/strict";
import { resetData } from "./reset.js";
import { checkBookingAction } from "../src/core/policies.js";
import { checkPricingAction } from "../src/core/pricing.js";
import { writeDecisionEvent, getDecisionEvent } from "../src/core/ledger.js";
import { updateLearningMemoryFromOutcome } from "../src/core/learning.js";
import { getLearningMemory } from "../src/core/context.js";
import type { OutcomeFeedback } from "../src/types/golf.js";

/** Helper: run a booking check and log it, returning the decision event. */
function bookAndLog(startTime: string) {
  const result = checkBookingAction({
    courseId: "demo",
    date: "2026-06-06",
    requestedStartTime: startTime,
    players: 4,
    publicAgent: true,
    agentId: "agent_test",
  });
  const event = writeDecisionEvent({
    agentId: "agent_test",
    toolName: "check_booking_action",
    courseId: "demo",
    actionType: "book_tee_time",
    fingerprintKey: result.fingerprintKey,
    inputSummary: `4 players ${startTime}`,
    resultSummary: result.recommendedAction,
    allowed: result.allowed,
    requiresApproval: result.requiresApproval,
    riskLevel: result.riskLevel,
    reasons: result.reasons,
  });
  return { result, event };
}

test("THE MAGIC MOMENT: an operator override changes the next matching recommendation", () => {
  resetData();

  // T0 — first request for Saturday ~09:10. No operator preference exists yet.
  const t0 = bookAndLog("09:10");
  assert.equal(t0.result.allowed, true);
  const keyT0 = t0.result.fingerprintKey;

  // T1 — operator overrides: prefer 09:30 instead.
  const feedback: OutcomeFeedback = {
    decisionEventId: t0.event.id,
    feedbackType: "operator_overrode",
    notes: "Too close to the member block. Offer 09:30 instead.",
    metrics: { correctedStartTime: "09:30" },
    submittedAt: new Date().toISOString(),
  };
  const decision = getDecisionEvent(t0.event.id)!;
  const learning = updateLearningMemoryFromOutcome(decision, feedback);
  assert.ok(learning.updates.length > 0, "expected a learning update");
  assert.equal(learning.updates[0].type, "operator_preference");

  // The corrective lesson is stored with the corrected value.
  const memory = getLearningMemory();
  const pref = memory.operatorPreferences.find(
    (l) => l.fingerprintKey === keyT0,
  );
  assert.ok(pref, "expected an operator-preference lesson on the same key");
  assert.equal(pref!.correctedValue, "09:30");

  // T2 — the SAME request again. SCP should now warn and shift to 09:30.
  const t2 = bookAndLog("09:10");
  assert.equal(
    t2.result.fingerprintKey,
    keyT0,
    "the second request must produce the same fingerprint key",
  );
  assert.equal(
    t2.result.status,
    "warning",
    "after an override, the same request should warn, not silently allow",
  );
  assert.ok(
    t2.result.recommendedAction.includes("09:30"),
    `recommendation should now point at 09:30; got: ${t2.result.recommendedAction}`,
  );
});

test("a single operator override creates a SUGGESTED lesson; a second promotes it to ACTIVE", () => {
  resetData();

  const first = bookAndLog("09:10");
  const fb1: OutcomeFeedback = {
    decisionEventId: first.event.id,
    feedbackType: "operator_overrode",
    metrics: { correctedStartTime: "09:30" },
    submittedAt: new Date().toISOString(),
  };
  updateLearningMemoryFromOutcome(getDecisionEvent(first.event.id)!, fb1);

  let pref = getLearningMemory().operatorPreferences.find(
    (l) => l.fingerprintKey === first.result.fingerprintKey,
  )!;
  assert.equal(pref.status, "suggested", "one override -> suggested");
  assert.equal(pref.evidenceCount, 1);

  const second = bookAndLog("09:10");
  const fb2: OutcomeFeedback = {
    decisionEventId: second.event.id,
    feedbackType: "operator_overrode",
    metrics: { correctedStartTime: "09:30" },
    submittedAt: new Date().toISOString(),
  };
  updateLearningMemoryFromOutcome(getDecisionEvent(second.event.id)!, fb2);

  pref = getLearningMemory().operatorPreferences.find(
    (l) => l.fingerprintKey === second.result.fingerprintKey,
  )!;
  assert.equal(pref.status, "active", "two overrides -> active");
  assert.equal(pref.evidenceCount, 2);
  assert.ok(pref.confidence >= 0.5, "active lesson confidence must clear 0.5");
});

test("a pace_issue outcome creates a pace lesson and lands hard", () => {
  resetData();
  const b = bookAndLog("10:30");
  const fb: OutcomeFeedback = {
    decisionEventId: b.event.id,
    feedbackType: "pace_issue",
    notes: "Round backed up badly behind the league block.",
    submittedAt: new Date().toISOString(),
  };
  const learning = updateLearningMemoryFromOutcome(
    getDecisionEvent(b.event.id)!,
    fb,
  );
  assert.equal(learning.updates[0].type, "pace");
  const pace = getLearningMemory().pacePatterns.find(
    (l) => l.fingerprintKey === b.result.fingerprintKey,
  );
  assert.ok(pace, "expected a pace lesson");
  // pace_issue is the heaviest negative score; one outcome should already
  // push confidence to a meaningful level.
  assert.ok(pace!.confidence > 0.3, "pace lesson should land hard");
});

test("a successful confirmation reinforces a positive booking lesson", () => {
  resetData();
  const b = bookAndLog("09:20");
  const fb: OutcomeFeedback = {
    decisionEventId: b.event.id,
    feedbackType: "confirmed",
    submittedAt: new Date().toISOString(),
  };
  const learning = updateLearningMemoryFromOutcome(
    getDecisionEvent(b.event.id)!,
    fb,
  );
  assert.ok(learning.updates[0].confidence > 0, "confidence should rise");
});

test("repeated price rejections build a pricing pattern", () => {
  resetData();
  const result = checkPricingAction({
    courseId: "demo",
    date: "2026-06-06",
    startTime: "16:00",
    currentPrice: 55,
    proposedPrice: 50,
  });
  const ev = writeDecisionEvent({
    toolName: "check_pricing_action",
    courseId: "demo",
    actionType: "quote_price",
    fingerprintKey: result.fingerprintKey,
    inputSummary: "twilight $50",
    resultSummary: "quoted",
    allowed: result.allowed,
    requiresApproval: result.requiresApproval,
    riskLevel: result.riskLevel,
    reasons: result.reasons,
  });
  const fb: OutcomeFeedback = {
    decisionEventId: ev.id,
    feedbackType: "price_rejected",
    submittedAt: new Date().toISOString(),
  };
  const learning = updateLearningMemoryFromOutcome(
    getDecisionEvent(ev.id)!,
    fb,
  );
  assert.equal(learning.updates[0].type, "pricing");
});
