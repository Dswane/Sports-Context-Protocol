/**
 * fingerprint.ts — the decision fingerprint engine.
 *
 * See docs/LEARNING_LOOP.md. A fingerprint is a deterministic, bucketed
 * projection of a decision. Two similar requests MUST produce the same key,
 * or learning cannot generalise. This file is the single source of truth for
 * how a key is built and how two keys are compared.
 */

import type { DecisionFingerprint, CourseEvent } from "../types/golf.js";
import {
  dayOfWeek,
  timeBucket,
  slotBucket,
  playerBucket,
  minuteGap,
} from "./time.js";

const NEAR_BLOCK_MINUTES = 30;

/** True if `time` is within NEAR_BLOCK_MINUTES of any event of the given type. */
function nearBlock(
  time: string,
  events: CourseEvent[],
  types: string[],
): boolean {
  return events.some(
    (e) =>
      types.includes(e.type) &&
      (minuteGap(time, e.startTime) <= NEAR_BLOCK_MINUTES ||
        minuteGap(time, e.endTime) <= NEAR_BLOCK_MINUTES),
  );
}

/** Build a booking fingerprint. */
export function buildBookingFingerprint(input: {
  courseId: string;
  date: string;
  requestedStartTime: string;
  players: number;
  publicAgent: boolean;
  events: CourseEvent[];
}): DecisionFingerprint {
  return {
    actionType: "book_tee_time",
    courseId: input.courseId,
    dayOfWeek: dayOfWeek(input.date),
    timeBucket: timeBucket(input.requestedStartTime),
    requestedSlotBucket: slotBucket(input.requestedStartTime),
    playerCountBucket: playerBucket(input.players),
    publicAgent: input.publicAgent,
    nearMemberBlock: nearBlock(input.requestedStartTime, input.events, [
      "member",
      "member_block",
    ]),
    nearLeagueBlock: nearBlock(input.requestedStartTime, input.events, [
      "league",
      "league_block",
    ]),
    nearOutingBlock: nearBlock(input.requestedStartTime, input.events, [
      "outing",
    ]),
  };
}

/** Build a pricing fingerprint. */
export function buildPricingFingerprint(input: {
  courseId: string;
  date: string;
  startTime: string;
  priceBand: string;
  isDiscount: boolean;
}): DecisionFingerprint {
  return {
    actionType: "quote_price",
    courseId: input.courseId,
    dayOfWeek: dayOfWeek(input.date),
    timeBucket: timeBucket(input.startTime),
    requestedSlotBucket: slotBucket(input.startTime),
    priceBand: input.priceBand,
  };
}

/**
 * Serialise a fingerprint to its stable key string. The field order here is
 * the contract — never reorder it without a migration.
 */
export function fingerprintKey(fp: DecisionFingerprint): string {
  if (fp.actionType === "quote_price") {
    return [
      fp.actionType,
      fp.courseId,
      fp.dayOfWeek,
      fp.timeBucket,
      fp.priceBand ?? "*",
      "discount",
    ].join("|");
  }
  // booking
  return [
    fp.actionType,
    fp.courseId,
    fp.dayOfWeek,
    fp.timeBucket,
    fp.requestedSlotBucket,
    fp.playerCountBucket ?? "*",
    fp.publicAgent ? "public" : "internal",
    fp.nearMemberBlock ? "memberblock" : "nomemberblock",
  ].join("|");
}

/**
 * Match a concrete key against a lesson key that may contain "*" wildcards.
 * Lessons stored with wildcards (e.g. the global protected-inventory lesson)
 * apply broadly; exact lessons apply narrowly.
 */
export function keyMatches(concreteKey: string, lessonKey: string): boolean {
  const a = concreteKey.split("|");
  const b = lessonKey.split("|");
  if (a.length !== b.length) return false;
  return a.every((seg, i) => b[i] === "*" || b[i] === seg);
}
