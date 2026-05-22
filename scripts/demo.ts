#!/usr/bin/env node
/**
 * demo.ts — the magic moment in one command.
 *
 * Runs the T0 → T1 → T2 sequence directly against the core, prints what
 * happened at each step, and exits. No MCP transport, no inspector — this is
 * the human-readable narration of the learning loop for screen recordings and
 * sanity-checks. The on-disk state is reset before T0 and restored after T2.
 *
 * stdout is fine here: the demo script is not the MCP server.
 */

import { resetData } from "../tests/reset.js";
import { checkBookingAction } from "../src/core/policies.js";
import { writeDecisionEvent, getDecisionEvent } from "../src/core/ledger.js";
import { updateLearningMemoryFromOutcome } from "../src/core/learning.js";
import { getLearningMemory } from "../src/core/context.js";
import type { OutcomeFeedback } from "../src/types/golf.js";

function hr(title: string): void {
  const bar = "─".repeat(72);
  console.log(`\n${bar}\n  ${title}\n${bar}`);
}

function bookAndLog(label: string, startTime: string) {
  hr(label);
  const result = checkBookingAction({
    courseId: "demo",
    date: "2026-06-06",
    requestedStartTime: startTime,
    players: 4,
    publicAgent: true,
    agentId: "agent_demo",
  });
  const event = writeDecisionEvent({
    agentId: "agent_demo",
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
  console.log(`request:       4 players, Saturday 2026-06-06, ${startTime}`);
  console.log(`fingerprint:   ${result.fingerprintKey}`);
  console.log(`status:        ${result.status}`);
  console.log(`risk:          ${result.riskLevel}`);
  console.log(`recommended:   ${result.recommendedAction}`);
  console.log(`reasons:`);
  for (const r of result.reasons) console.log(`  - ${r}`);
  return { result, event };
}

resetData();

const t0 = bookAndLog("T0 — first request, no learned preference yet", "09:10");

hr("T1 — operator overrides: prefer 09:30 instead");
const feedback: OutcomeFeedback = {
  decisionEventId: t0.event.id,
  feedbackType: "operator_overrode",
  notes: "Too close to the member block. Offer 09:30 instead.",
  metrics: { correctedStartTime: "09:30" },
  submittedAt: new Date().toISOString(),
};
const decision = getDecisionEvent(t0.event.id);
if (!decision) throw new Error("decision event missing — ledger write failed");
const learning = updateLearningMemoryFromOutcome(decision, feedback);
for (const u of learning.updates) {
  console.log(`lesson:        ${u.type} (${u.status}) confidence ${u.confidence}`);
  console.log(`               ${u.text}`);
}
for (const i of learning.insights) console.log(`insight:       ${i}`);
const pref = getLearningMemory().operatorPreferences.find(
  (l) => l.fingerprintKey === t0.result.fingerprintKey,
);
if (pref) {
  console.log(`stored on key: ${pref.fingerprintKey}`);
  console.log(`correctedValue: ${pref.correctedValue ?? "(none)"}`);
}

const t2 = bookAndLog("T2 — same request again, SCP has learned", "09:10");

hr("Result");
const sameKey = t2.result.fingerprintKey === t0.result.fingerprintKey;
const shifted = t2.result.recommendedAction.includes("09:30");
console.log(`same fingerprint key as T0:  ${sameKey ? "yes" : "no"}`);
console.log(`recommendation now mentions 09:30:  ${shifted ? "yes" : "no"}`);
console.log(`magic moment:  ${sameKey && shifted ? "✓ working" : "✗ broken"}`);

// Restore pristine state so the demo is idempotent.
resetData();

if (!(sameKey && shifted)) process.exit(1);
