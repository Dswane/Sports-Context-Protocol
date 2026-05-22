/**
 * policies.ts — booking safety. checkBookingAction is the central booking
 * decision: it checks the tee sheet, the booking policy, event blocks, pace,
 * and learned memory, then returns a safe recommendation.
 */

import type {
  BookingActionInput,
  BookingActionResult,
  TeeTime,
  RiskLevel,
} from "../types/golf.js";
import {
  getBookingPolicy,
  getEvents,
} from "./context.js";
import {
  getTeeTimeByStartTime,
  findBestAvailableTeeTime,
  getAvailableInventory,
} from "./inventory.js";
import { timeToMinutes, minutesUntilTeeTime } from "./time.js";
import { buildBookingFingerprint, fingerprintKey } from "./fingerprint.js";
import { getRelevantLessons } from "./learning.js";
import { checkPaceImpactForBooking } from "./pace.js";

const ORDER: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };
function maxRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  return ORDER[a] >= ORDER[b] ? a : b;
}

export function checkBookingAction(
  input: BookingActionInput,
): BookingActionResult {
  const policy = getBookingPolicy();
  const events = getEvents();
  const reasons: string[] = [];
  const blockedBy: string[] = [];
  let allowed = true;
  let requiresApproval = false;
  let risk: RiskLevel = "low";

  const fp = buildBookingFingerprint({
    courseId: input.courseId,
    date: input.date,
    requestedStartTime: input.requestedStartTime,
    players: input.players,
    publicAgent: input.publicAgent,
    events,
  });
  const key = fingerprintKey(fp);

  const teeTime = getTeeTimeByStartTime(input.requestedStartTime);

  // 1. Does the slot exist?
  if (!teeTime) {
    allowed = false;
    blockedBy.push("slot_not_found");
    reasons.push("No tee time exists at the requested time.");
  }

  // 2. Group size.
  if (input.players > policy.maxGroupSize) {
    allowed = false;
    blockedBy.push("group_too_large");
    reasons.push(
      `Group size ${input.players} exceeds the max of ${policy.maxGroupSize}.`,
    );
  }

  // 3. Status-based blocks for the requested slot.
  if (teeTime) {
    if (teeTime.status === "protected" && input.publicAgent) {
      allowed = false;
      blockedBy.push("no_public_member_inventory");
      reasons.push("Requested slot is protected member inventory.");
    } else if (teeTime.status === "blocked" && teeTime.blockType === "league") {
      allowed = false;
      blockedBy.push("no_public_league_blocks");
      reasons.push("Requested slot is inside a league block.");
    } else if (teeTime.status === "blocked" && teeTime.blockType === "outing") {
      allowed = false;
      blockedBy.push("no_public_outing_blocks");
      reasons.push("Requested slot is inside an outing block.");
    } else if (teeTime.status === "blocked") {
      allowed = false;
      blockedBy.push("slot_blocked");
      reasons.push("Requested slot is blocked.");
    } else if (teeTime.status === "booked") {
      allowed = false;
      blockedBy.push("slot_booked");
      reasons.push("Requested slot is already booked.");
    } else if (teeTime.status === "soft_hold") {
      allowed = false;
      blockedBy.push("slot_on_hold");
      reasons.push("Requested slot is currently on a soft hold.");
    } else if (
      teeTime.status === "available" &&
      teeTime.playersBooked + input.players > teeTime.maxPlayers
    ) {
      allowed = false;
      blockedBy.push("insufficient_capacity");
      reasons.push("Not enough capacity in the requested slot.");
    }
  }

  // 4. Pace check (only meaningful if the slot is otherwise usable).
  if (teeTime) {
    const pace = checkPaceImpactForBooking({
      startTime: input.requestedStartTime,
      players: input.players,
    });
    risk = maxRisk(risk, pace.riskLevel);
    if (pace.riskLevel !== "low") {
      reasons.push(...pace.reasons);
    }
  }

  // 5. Inside-N-minutes approval rule.
  const minutesRule = policy.approvalRules.find(
    (r) => typeof r.minutesBeforeStart === "number",
  );
  if (allowed && minutesRule?.minutesBeforeStart !== undefined) {
    const now = input.now ? new Date(input.now) : new Date();
    const minutesAway = minutesUntilTeeTime(
      input.date,
      input.requestedStartTime,
      now,
    );
    if (minutesAway > 0 && minutesAway <= minutesRule.minutesBeforeStart) {
      requiresApproval = true;
      risk = maxRisk(risk, "medium");
      reasons.push(
        `Tee time is ${minutesAway} minute${minutesAway === 1 ? "" : "s"} away — inside the ${minutesRule.minutesBeforeStart}-minute window, operator approval required.`,
      );
    }
  }

  // 6. Learned memory — operator preferences can shift the recommendation.
  const lessons = getRelevantLessons(key);
  const operatorPref = lessons.find(
    (l) => l.type === "operator_preference" && l.correctedValue,
  );

  // 7. Decide soft-hold.
  const requiresSoftHold = allowed && policy.softHoldRequired;
  if (allowed) {
    reasons.push("Tee time is available.");
    reasons.push("Group size is allowed.");
    if (requiresSoftHold) {
      reasons.push("Soft hold required before confirmation.");
    }
  }

  // Determine the alternative tee time.
  let alternative: TeeTime | undefined;
  if (!allowed) {
    // When the requested slot is blocked, widen the search window so SCP can
    // always offer a redirect if a safe slot exists nearby (a member block can
    // be over an hour wide, so the default 45-min window is too narrow here).
    // Prefer the earliest available slot at or after the requested time; only
    // fall back to an earlier slot if nothing later exists.
    const widened = getAvailableInventory({
      date: input.date,
      preferredTime: input.requestedStartTime,
      timeWindowMinutes: 240,
      players: input.players,
      publicAgent: input.publicAgent,
    });
    const candidates = [
      widened.bestTeeTime,
      ...widened.alternatives,
    ].filter((c): c is NonNullable<typeof c> => Boolean(c));
    const reqMinutes = timeToMinutes(input.requestedStartTime);
    const laterFirst = candidates
      .slice()
      .sort(
        (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime),
      );
    const firstAtOrAfter = laterFirst.find(
      (c) => timeToMinutes(c.startTime) >= reqMinutes,
    );
    const chosen = firstAtOrAfter ?? laterFirst[laterFirst.length - 1];
    alternative = chosen
      ? getTeeTimeByStartTime(chosen.startTime)
      : findBestAvailableTeeTime({
          date: input.date,
          players: input.players,
          publicAgent: input.publicAgent,
        });
  } else if (operatorPref) {
    // Allowed, but the operator has previously preferred a different time.
    alternative = getTeeTimeByStartTime(operatorPref.correctedValue!);
  }

  // 8. Status + recommendation.
  let status: BookingActionResult["status"];
  let recommendedAction: string;

  if (!allowed) {
    status = "blocked";
    recommendedAction = alternative
      ? `Offer ${alternative.startTime} instead.`
      : "No safe alternative found in the requested window.";
  } else if (operatorPref && operatorPref.status === "active") {
    // Learned operator preference is strong — warn and shift.
    status = "warning";
    risk = maxRisk(risk, "medium");
    reasons.push(
      `Prior operator feedback: ${operatorPref.text} (confidence ${operatorPref.confidence.toFixed(
        2,
      )}).`,
    );
    recommendedAction = alternative
      ? `${input.requestedStartTime} is technically available, but based on operator feedback, recommend ${alternative.startTime}.`
      : `${input.requestedStartTime} is available, but operator feedback suggests caution.`;
  } else if (operatorPref && operatorPref.status === "suggested") {
    // Lesson not yet confirmed — soft warning.
    status = "warning";
    reasons.push(
      `SCP has a suggested operator preference for this kind of request: ${operatorPref.text}`,
    );
    recommendedAction = alternative
      ? `${input.requestedStartTime} is available; ${alternative.startTime} may be preferred based on recent operator feedback.`
      : `${input.requestedStartTime} is available.`;
  } else if (risk !== "low") {
    status = "warning";
    recommendedAction = requiresSoftHold
      ? `Create soft hold for ${input.requestedStartTime}, noting pace risk.`
      : `Proceed with ${input.requestedStartTime}, noting pace risk.`;
  } else {
    status = "allowed";
    recommendedAction = requiresSoftHold
      ? `Create soft hold for ${input.requestedStartTime}.`
      : `Confirm ${input.requestedStartTime}.`;
  }

  return {
    allowed,
    status,
    requiresApproval,
    requiresSoftHold,
    riskLevel: risk,
    reasons,
    blockedBy,
    recommendedAction,
    alternativeTeeTime: alternative,
    golferSafeExplanation: "", // filled by explain.ts at the tool layer
    operatorExplanation: "",
    fingerprintKey: key,
  };
}
