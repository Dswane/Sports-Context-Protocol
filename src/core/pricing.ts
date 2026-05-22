/**
 * pricing.ts — pricing safety. checkPricingAction verifies a proposed price
 * against the absolute floor, the time-window rate, discount limits, the
 * Saturday-morning approval rule, and learned pricing patterns.
 */

import type {
  PricingActionInput,
  PricingActionResult,
  RiskLevel,
  PricingRule,
} from "../types/golf.js";
import { getPricingPolicy } from "./context.js";
import { timeToMinutes, dayOfWeek } from "./time.js";
import { buildPricingFingerprint, fingerprintKey } from "./fingerprint.js";
import { getRelevantLessons } from "./learning.js";

function ruleForTime(
  rules: PricingRule[],
  startTime: string,
): PricingRule | undefined {
  const m = timeToMinutes(startTime);
  return rules.find(
    (r) => m >= timeToMinutes(r.startTime) && m <= timeToMinutes(r.endTime),
  );
}

export function checkPricingAction(
  input: PricingActionInput,
): PricingActionResult {
  const policy = getPricingPolicy();
  const reasons: string[] = [];
  let allowed = true;
  let requiresApproval = false;
  let risk: RiskLevel = "low";

  const rule = ruleForTime(policy.rules, input.startTime);
  const isDiscount = input.proposedPrice < input.currentPrice;

  const fp = buildPricingFingerprint({
    courseId: input.courseId,
    date: input.date,
    startTime: input.startTime,
    priceBand: rule?.id ?? "unknown-band",
    isDiscount,
  });
  const key = fingerprintKey(fp);

  // 1. Absolute floor.
  if (input.proposedPrice < policy.absolutePriceFloor) {
    allowed = false;
    risk = "high";
    reasons.push(
      `Proposed price $${input.proposedPrice} is below the absolute floor of $${policy.absolutePriceFloor}.`,
    );
  } else {
    reasons.push(
      `Proposed price is at or above the absolute floor of $${policy.absolutePriceFloor}.`,
    );
  }

  // 2. Time-window rate sanity.
  if (rule) {
    reasons.push(`Time window: ${rule.label} (base $${rule.baseRate}).`);
    if (
      isDiscount &&
      rule.maxAutoDiscountPercent !== undefined &&
      allowed
    ) {
      const discountPct =
        ((rule.baseRate - input.proposedPrice) / rule.baseRate) * 100;
      if (discountPct <= rule.maxAutoDiscountPercent) {
        reasons.push(
          `Discount of ${discountPct.toFixed(0)}% is within the ${
            rule.maxAutoDiscountPercent
          }% auto-discount range.`,
        );
      } else {
        requiresApproval = true;
        risk = "medium";
        reasons.push(
          `Discount of ${discountPct.toFixed(0)}% exceeds the ${
            rule.maxAutoDiscountPercent
          }% auto-discount range — operator approval required.`,
        );
      }
    }
  } else {
    reasons.push("No pricing rule matches this time window.");
  }

  // 3. Saturday-morning discount approval rule.
  const dow = dayOfWeek(input.date);
  for (const ar of policy.approvalRules) {
    const m = timeToMinutes(input.startTime);
    const inWindow =
      m >= timeToMinutes(ar.startTime) && m <= timeToMinutes(ar.endTime);
    const dayMatches = !ar.dayOfWeek || ar.dayOfWeek === dow;
    if (inWindow && dayMatches && isDiscount) {
      requiresApproval = true;
      risk = risk === "high" ? "high" : "medium";
      reasons.push(
        `${dow} ${ar.startTime}-${ar.endTime} discounts require operator approval.`,
      );
    }
  }

  // 4. Learned pricing patterns.
  const lessons = getRelevantLessons(key).filter((l) => l.type === "pricing");
  for (const l of lessons) {
    if (l.status === "active") {
      reasons.push(`Learned pricing pattern: ${l.text}`);
    }
  }

  // 5. Recommended price.
  let recommendedPrice = input.proposedPrice;
  if (input.proposedPrice < policy.absolutePriceFloor) {
    recommendedPrice = policy.absolutePriceFloor;
  }

  const status: PricingActionResult["status"] = !allowed
    ? "blocked"
    : requiresApproval
      ? "warning"
      : "allowed";

  return {
    allowed,
    status,
    requiresApproval,
    riskLevel: risk,
    reasons,
    recommendedPrice,
    golferSafeExplanation: "", // filled by explain.ts at the tool layer
    operatorExplanation: "",
    fingerprintKey: key,
  };
}
