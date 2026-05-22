/**
 * ledger.ts — the decision ledger. Every decision tool call is logged here so
 * that outcomes can later be attached and learned from.
 */

import type {
  DecisionEvent,
  OutcomeFeedback,
  RiskLevel,
} from "../types/golf.js";
import { safeReadJsonArray, safeWriteJsonArray } from "./storage.js";
import { makeId, nowIso } from "./time.js";

const LEDGER = "decision-ledger.json";

export interface WriteDecisionInput {
  agentId?: string;
  toolName: string;
  courseId: string;
  actionType: string;
  fingerprintKey: string;
  inputSummary: string;
  resultSummary: string;
  allowed: boolean;
  requiresApproval: boolean;
  riskLevel: RiskLevel;
  reasons: string[];
  contextUsed?: string[];
}

/** Append a decision event to the ledger and return it. */
export function writeDecisionEvent(input: WriteDecisionInput): DecisionEvent {
  const ledger = safeReadJsonArray<DecisionEvent>(LEDGER);
  const event: DecisionEvent = {
    id: makeId("dec"),
    timestamp: nowIso(),
    agentId: input.agentId,
    toolName: input.toolName,
    courseId: input.courseId,
    actionType: input.actionType,
    fingerprintKey: input.fingerprintKey,
    inputSummary: input.inputSummary,
    resultSummary: input.resultSummary,
    allowed: input.allowed,
    requiresApproval: input.requiresApproval,
    riskLevel: input.riskLevel,
    reasons: input.reasons,
    contextUsed: input.contextUsed ?? [],
  };
  ledger.push(event);
  safeWriteJsonArray(LEDGER, ledger);
  return event;
}

/** Most recent decision events, newest last. */
export function getRecentDecisionEvents(limit = 10): DecisionEvent[] {
  const ledger = safeReadJsonArray<DecisionEvent>(LEDGER);
  return ledger.slice(-limit);
}

export function getDecisionEvent(id: string): DecisionEvent | undefined {
  return safeReadJsonArray<DecisionEvent>(LEDGER).find((e) => e.id === id);
}

/** Attach an outcome to a decision event. Returns the updated event. */
export function updateDecisionWithOutcome(
  decisionEventId: string,
  outcome: OutcomeFeedback,
): DecisionEvent | undefined {
  const ledger = safeReadJsonArray<DecisionEvent>(LEDGER);
  const event = ledger.find((e) => e.id === decisionEventId);
  if (!event) return undefined;
  event.outcome = outcome;
  safeWriteJsonArray(LEDGER, ledger);
  return event;
}
