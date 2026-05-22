import { test } from "node:test";
import assert from "node:assert/strict";
import { resetData } from "./reset.js";
import { checkPricingAction } from "../src/core/pricing.js";

test("a price below the $45 floor is blocked", () => {
  resetData();
  const r = checkPricingAction({
    courseId: "demo",
    date: "2026-06-06",
    startTime: "16:00",
    currentPrice: 55,
    proposedPrice: 40,
  });
  assert.equal(r.allowed, false);
  assert.equal(r.status, "blocked");
  assert.equal(r.recommendedPrice, 45);
});

test("a Saturday morning discount requires operator approval", () => {
  resetData();
  const r = checkPricingAction({
    courseId: "demo",
    date: "2026-06-06",
    startTime: "09:00",
    currentPrice: 105,
    proposedPrice: 80,
  });
  assert.equal(r.requiresApproval, true);
  assert.equal(r.status, "warning");
});

test("a twilight discount within 15% is allowed without approval", () => {
  resetData();
  const r = checkPricingAction({
    courseId: "demo",
    date: "2026-06-06",
    startTime: "16:00",
    currentPrice: 55,
    proposedPrice: 48, // ~13% off the $55 base
  });
  assert.equal(r.allowed, true);
  assert.equal(r.requiresApproval, false);
  assert.equal(r.status, "allowed");
});
