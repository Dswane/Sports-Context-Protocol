import { test } from "node:test";
import assert from "node:assert/strict";
import { resetData } from "./reset.js";
import { checkBookingAction } from "../src/core/policies.js";

test("public agent cannot book protected member inventory", () => {
  resetData();
  const r = checkBookingAction({
    courseId: "demo",
    date: "2026-06-06",
    requestedStartTime: "08:10",
    players: 4,
    publicAgent: true,
  });
  assert.equal(r.allowed, false);
  assert.equal(r.status, "blocked");
  assert.ok(r.blockedBy.includes("no_public_member_inventory"));
  // A safe alternative should be offered.
  assert.ok(r.alternativeTeeTime, "expected an alternative tee time");
});

test("public agent cannot book a league block", () => {
  resetData();
  const r = checkBookingAction({
    courseId: "demo",
    date: "2026-06-06",
    requestedStartTime: "11:00",
    players: 4,
    publicAgent: true,
  });
  assert.equal(r.allowed, false);
  assert.ok(r.blockedBy.includes("no_public_league_blocks"));
});

test("group larger than 4 is blocked", () => {
  resetData();
  const r = checkBookingAction({
    courseId: "demo",
    date: "2026-06-06",
    requestedStartTime: "09:10",
    players: 6,
    publicAgent: true,
  });
  assert.equal(r.allowed, false);
  assert.ok(r.blockedBy.includes("group_too_large"));
});

test("an available tee time is allowed and requires a soft hold", () => {
  resetData();
  const r = checkBookingAction({
    courseId: "demo",
    date: "2026-06-06",
    requestedStartTime: "09:20",
    players: 4,
    publicAgent: true,
  });
  assert.equal(r.allowed, true);
  assert.equal(r.requiresSoftHold, true);
  // 09:20 carries no operator preference yet, so status is allowed or warning
  // depending only on pace; both are acceptable non-blocked states.
  assert.notEqual(r.status, "blocked");
  assert.ok(r.fingerprintKey.startsWith("book_tee_time|demo|Saturday|"));
});

test("a blocked outing slot is rejected", () => {
  resetData();
  const r = checkBookingAction({
    courseId: "demo",
    date: "2026-06-06",
    requestedStartTime: "13:00",
    players: 4,
    publicAgent: true,
  });
  assert.equal(r.allowed, false);
  assert.ok(r.blockedBy.includes("no_public_outing_blocks"));
});

test("inside-30-minutes booking requires operator approval", () => {
  resetData();
  // 09:20 is 20 minutes after a "now" of 09:00 on the demo date — inside the
  // 30-minute window declared in demo-booking-policy.json.
  const r = checkBookingAction({
    courseId: "demo",
    date: "2026-06-06",
    requestedStartTime: "09:20",
    players: 4,
    publicAgent: true,
    now: "2026-06-06T09:00:00Z",
  });
  assert.equal(r.allowed, true);
  assert.equal(r.requiresApproval, true);
  assert.ok(
    r.reasons.some((s) => s.includes("30-minute")),
    "reasons should mention the 30-minute approval window",
  );
});

test("a tee time more than 30 minutes out does not require approval", () => {
  resetData();
  const r = checkBookingAction({
    courseId: "demo",
    date: "2026-06-06",
    requestedStartTime: "09:50",
    players: 4,
    publicAgent: true,
    now: "2026-06-06T09:00:00Z",
  });
  assert.equal(r.allowed, true);
  assert.equal(r.requiresApproval, false);
});
