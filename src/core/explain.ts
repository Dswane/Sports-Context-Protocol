/**
 * explain.ts — turns a decision result into an explanation for a given
 * audience. Golfer-facing text must never expose internal policy language
 * (no "protected member inventory", no "operator override history").
 */

import type {
  BookingActionResult,
  PricingActionResult,
  AgentAudience,
} from "../types/golf.js";

/** Phrases that must never appear in golfer-facing output. */
const INTERNAL_TERMS = [
  "member protected",
  "protected member inventory",
  "internal block",
  "league block",
  "outing block",
  "operator override",
  "operator preference",
  "revenue protection",
  "fingerprint",
];

/** Strip any internal phrasing as a safety net for golfer-facing text. */
function golferSafe(text: string): string {
  let out = text;
  for (const term of INTERNAL_TERMS) {
    const re = new RegExp(term, "gi");
    out = out.replace(re, "not available");
  }
  return out;
}

// ---------------------------------------------------------------------------
// Booking explanations
// ---------------------------------------------------------------------------

export function explainBookingForGolfer(result: BookingActionResult): string {
  if (result.allowed && result.status === "allowed") {
    return result.requiresSoftHold
      ? `I can hold that time for you. Want me to put it on hold?`
      : `That time works. Want me to confirm it?`;
  }
  if (result.allowed && result.status === "warning") {
    const alt = result.alternativeTeeTime;
    return alt
      ? `I'd recommend ${alt.startTime} — it tends to play a little smoother. Want me to hold that?`
      : `I can hold that time, though it may play a little busy.`;
  }
  // blocked
  const alt = result.alternativeTeeTime;
  return alt
    ? `That exact time isn't available, but I can offer ${alt.startTime}. Want me to hold it?`
    : `That time isn't available, and I couldn't find a close alternative. Want me to look at another part of the day?`;
}

export function explainBookingForOperator(
  result: BookingActionResult,
): string {
  const lines = [
    `Status: ${result.status} | risk: ${result.riskLevel} | allowed: ${result.allowed}`,
  ];
  if (result.blockedBy.length) {
    lines.push(`Blocked by: ${result.blockedBy.join(", ")}`);
  }
  lines.push(`Reasons: ${result.reasons.join(" ")}`);
  if (result.requiresSoftHold) lines.push("Soft hold required.");
  if (result.requiresApproval) lines.push("Operator approval required.");
  lines.push(`Recommended action: ${result.recommendedAction}`);
  if (result.alternativeTeeTime) {
    lines.push(`Alternative: ${result.alternativeTeeTime.startTime}`);
  }
  return lines.join("\n");
}

export function explainBookingForDeveloper(
  result: BookingActionResult,
): string {
  return JSON.stringify(
    {
      fingerprintKey: result.fingerprintKey,
      status: result.status,
      allowed: result.allowed,
      riskLevel: result.riskLevel,
      blockedBy: result.blockedBy,
      requiresSoftHold: result.requiresSoftHold,
      requiresApproval: result.requiresApproval,
      reasons: result.reasons,
      recommendedAction: result.recommendedAction,
      alternativeTeeTime: result.alternativeTeeTime?.startTime,
    },
    null,
    2,
  );
}

// ---------------------------------------------------------------------------
// Pricing explanations
// ---------------------------------------------------------------------------

export function explainPricingForGolfer(result: PricingActionResult): string {
  if (result.allowed && result.status === "allowed") {
    return `That rate is available at $${result.recommendedPrice}.`;
  }
  if (result.allowed && result.status === "warning") {
    return `I can offer that rate, but it needs a quick check with the shop first.`;
  }
  return `I can't offer that price, but $${result.recommendedPrice} is available.`;
}

export function explainPricingForOperator(
  result: PricingActionResult,
): string {
  const lines = [
    `Status: ${result.status} | risk: ${result.riskLevel} | allowed: ${result.allowed}`,
    `Reasons: ${result.reasons.join(" ")}`,
    `Recommended price: $${result.recommendedPrice}`,
  ];
  if (result.requiresApproval) lines.push("Operator approval required.");
  return lines.join("\n");
}

export function explainPricingForDeveloper(
  result: PricingActionResult,
): string {
  return JSON.stringify(result, null, 2);
}

// ---------------------------------------------------------------------------
// Generic dispatcher used by the explain_action tool
// ---------------------------------------------------------------------------

export function explainAction(
  actionType: string,
  result: BookingActionResult | PricingActionResult,
  audience: AgentAudience,
): string {
  const isBooking = "blockedBy" in result;
  let text: string;
  if (isBooking) {
    const r = result as BookingActionResult;
    text =
      audience === "golfer"
        ? explainBookingForGolfer(r)
        : audience === "operator"
          ? explainBookingForOperator(r)
          : explainBookingForDeveloper(r);
  } else {
    const r = result as PricingActionResult;
    text =
      audience === "golfer"
        ? explainPricingForGolfer(r)
        : audience === "operator"
          ? explainPricingForOperator(r)
          : explainPricingForDeveloper(r);
  }
  void actionType;
  return audience === "golfer" ? golferSafe(text) : text;
}

/** Attach golfer + operator explanations onto a booking result in place. */
export function decorateBooking(
  result: BookingActionResult,
): BookingActionResult {
  result.golferSafeExplanation = golferSafe(
    explainBookingForGolfer(result),
  );
  result.operatorExplanation = explainBookingForOperator(result);
  return result;
}

/** Attach golfer + operator explanations onto a pricing result in place. */
export function decoratePricing(
  result: PricingActionResult,
): PricingActionResult {
  result.golferSafeExplanation = golferSafe(
    explainPricingForGolfer(result),
  );
  result.operatorExplanation = explainPricingForOperator(result);
  return result;
}
