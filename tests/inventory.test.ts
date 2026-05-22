import { test } from "node:test";
import assert from "node:assert/strict";
import { resetData } from "./reset.js";
import {
  getAvailableInventory,
  findBestAvailableTeeTime,
} from "../src/core/inventory.js";

test("Saturday ~09:00 request returns an available 09:0x/09:1x slot, not protected", () => {
  resetData();
  const result = getAvailableInventory({
    date: "2026-06-06",
    preferredTime: "09:00",
    timeWindowMinutes: 45,
    players: 4,
    publicAgent: true,
  });
  assert.ok(result.bestTeeTime, "expected a best tee time");
  assert.equal(result.bestTeeTime!.status, "available");
  // 08:50 is protected; the best slot must be after the member block.
  assert.ok(
    result.bestTeeTime!.startTime >= "09:00",
    `best slot ${result.bestTeeTime!.startTime} should be at or after 09:00`,
  );
});

test("protected member inventory is never returned as bookable to a public agent", () => {
  resetData();
  const result = getAvailableInventory({
    date: "2026-06-06",
    preferredTime: "08:00",
    timeWindowMinutes: 60,
    players: 4,
    publicAgent: true,
  });
  const allOffered = [
    ...(result.bestTeeTime ? [result.bestTeeTime] : []),
    ...result.alternatives,
  ];
  for (const slot of allOffered) {
    assert.notEqual(slot.status, "protected");
  }
  // 08:10 (protected) should be in the excluded list.
  assert.ok(
    result.excludedTimes.some((e) => e.startTime === "08:10"),
    "08:10 should be excluded",
  );
});

test("booked and blocked times are excluded from bookable inventory", () => {
  resetData();
  const result = getAvailableInventory({
    date: "2026-06-06",
    preferredTime: "10:40",
    timeWindowMinutes: 30,
    players: 2,
    publicAgent: true,
  });
  const offered = [
    ...(result.bestTeeTime ? [result.bestTeeTime] : []),
    ...result.alternatives,
  ].map((s) => s.startTime);
  assert.ok(!offered.includes("10:30"), "10:30 booked must be excluded");
  assert.ok(!offered.includes("10:40"), "10:40 booked must be excluded");
  assert.ok(!offered.includes("11:00"), "11:00 league block must be excluded");
});

test("findBestAvailableTeeTime returns a real available TeeTime object", () => {
  resetData();
  const tt = findBestAvailableTeeTime({
    date: "2026-06-06",
    preferredTime: "09:00",
    players: 4,
    publicAgent: true,
  });
  assert.ok(tt, "expected a tee time");
  assert.equal(tt!.status, "available");
});
