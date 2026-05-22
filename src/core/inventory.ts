/**
 * inventory.ts — tee-sheet availability.
 *
 * Rules: never offer protected inventory to a public agent, never offer
 * booked or blocked inventory, and when the requested time is unavailable
 * find the closest safe alternative.
 */

import type { TeeTime } from "../types/golf.js";
import { getTeeSheet } from "./context.js";
import { minuteGap, timeToMinutes } from "./time.js";

export interface InventoryInput {
  date: string;
  preferredTime?: string;
  timeWindowMinutes?: number;
  players: number;
  publicAgent: boolean;
}

export function getTeeTimeByStartTime(startTime: string): TeeTime | undefined {
  return getTeeSheet().find((t) => t.startTime === startTime);
}

export function getTeeTimeById(id: string): TeeTime | undefined {
  return getTeeSheet().find((t) => t.id === id);
}

/** A slot is open if it is available and has capacity for the group. */
export function isTeeTimeOpen(teeTime: TeeTime, players: number): boolean {
  return (
    teeTime.status === "available" &&
    teeTime.playersBooked + players <= teeTime.maxPlayers
  );
}

export function isTeeTimeProtected(teeTime: TeeTime): boolean {
  return teeTime.status === "protected";
}

/**
 * Is this slot bookable by the requesting agent? Public agents may only book
 * truly available inventory; protected/blocked/booked are all off-limits.
 */
function isBookableBy(
  teeTime: TeeTime,
  players: number,
  publicAgent: boolean,
): boolean {
  if (!isTeeTimeOpen(teeTime, players)) return false;
  // Available inventory is fine for any agent. Protected etc. already excluded
  // by isTeeTimeOpen (status must be "available"). publicAgent retained for
  // future internal-only available inventory.
  void publicAgent;
  return true;
}

export interface InventoryResult {
  bestTeeTime?: { startTime: string; status: string; price: number };
  alternatives: { startTime: string; status: string; price: number }[];
  excludedTimes: { startTime: string; reason: string }[];
}

/**
 * Find available inventory near the preferred time. Returns the best match,
 * up to three alternatives, and a golfer-safe list of excluded times.
 */
export function getAvailableInventory(input: InventoryInput): InventoryResult {
  const window = input.timeWindowMinutes ?? 45;
  const preferred = input.preferredTime;
  const sheet = getTeeSheet();

  const bookable = sheet.filter((t) =>
    isBookableBy(t, input.players, input.publicAgent),
  );

  // Score each bookable slot by distance from the preferred time.
  const scored = bookable
    .map((t) => ({
      t,
      distance: preferred ? minuteGap(t.startTime, preferred) : 0,
    }))
    .filter((s) => (preferred ? s.distance <= window : true))
    .sort(
      (a, b) =>
        a.distance - b.distance ||
        timeToMinutes(a.t.startTime) - timeToMinutes(b.t.startTime),
    );

  const excludedTimes: { startTime: string; reason: string }[] = [];
  if (preferred) {
    for (const t of sheet) {
      if (preferred && minuteGap(t.startTime, preferred) > window) continue;
      if (isBookableBy(t, input.players, input.publicAgent)) continue;
      let reason = "That time is not available.";
      if (t.status === "protected")
        reason = "Not available for public booking.";
      else if (t.status === "booked") reason = "That time has been taken.";
      else if (t.status === "blocked") reason = "That time is not available.";
      else if (t.status === "soft_hold")
        reason = "That time is currently on hold.";
      excludedTimes.push({ startTime: t.startTime, reason });
    }
  }

  const ordered = scored.map((s) => ({
    startTime: s.t.startTime,
    status: s.t.status,
    price: s.t.price,
  }));

  return {
    bestTeeTime: ordered[0],
    alternatives: ordered.slice(1, 4),
    excludedTimes,
  };
}

/** The single best available tee time for a request, or undefined. */
export function findBestAvailableTeeTime(
  input: InventoryInput,
): TeeTime | undefined {
  const result = getAvailableInventory(input);
  if (!result.bestTeeTime) return undefined;
  return getTeeTimeByStartTime(result.bestTeeTime.startTime);
}
