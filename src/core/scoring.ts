/**
 * scoring.ts — turns an outcome into a numeric score and a confidence move.
 * See docs/LEARNING_LOOP.md sections 4 and 5.
 */

import type { FeedbackType } from "../types/golf.js";

export const LEARNING_RATE = 0.34;

const SCORES: Record<FeedbackType, number> = {
  confirmed: 2,
  slot_filled: 2,
  price_accepted: 1,
  abandoned: -1,
  price_rejected: -1,
  operator_overrode: -2,
  golfer_complained: -2,
  no_show: -2,
  pace_issue: -3,
  slot_unsold: -1,
};

export function scoreOutcome(feedbackType: FeedbackType): number {
  return SCORES[feedbackType] ?? 0;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Move a confidence value toward a target by LEARNING_RATE.
 * Returns the new confidence in [0, 1].
 */
export function updateConfidence(
  oldConfidence: number,
  target: number,
): number {
  return clamp(
    oldConfidence + LEARNING_RATE * (target - oldConfidence),
    0,
    1,
  );
}

/**
 * Given an outcome score, return the confidence target for the *corrective*
 * lesson. Negative outcomes drive a corrective lesson toward 1 (it becomes the
 * trusted alternative). Positive outcomes also drive the reinforced lesson
 * toward 1. A zero score leaves things unchanged (target = current handled by
 * caller). The magnitude of a negative score makes the lesson land harder.
 */
export function confidenceTargetFor(score: number): number {
  if (score === 0) return 0.5;
  // Heavier negative scores (pace_issue -3) push the corrective lesson harder.
  // The target is set so that two consistent corrective outcomes clear the
  // 0.5 "active" promotion line from a 0.0 start (see docs/LEARNING_LOOP.md).
  if (score < 0) return clamp(0.82 + Math.abs(score) * 0.06, 0.82, 1);
  return 1;
}
