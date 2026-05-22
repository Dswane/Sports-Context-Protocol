/**
 * holds.ts — soft holds. Creating a hold marks the tee-sheet slot as
 * "soft_hold" and appends a record to soft-holds.json. For the alpha the
 * expiry is computed from the booking policy's softHoldMinutes.
 */

import type { SoftHold, TeeTime } from "../types/golf.js";
import { getBookingPolicy, getTeeSheet } from "./context.js";
import { safeReadJsonArray, safeWriteJsonArray } from "./storage.js";
import { makeId, nowIso } from "./time.js";

const HOLDS = "soft-holds.json";
const TEE_SHEET = "demo-tee-sheet.json";

export interface CreateSoftHoldInput {
  courseId: string;
  date: string;
  teeTimeId?: string;
  startTime?: string;
  players: number;
  agentId?: string;
  golferName?: string;
}

export interface CreateSoftHoldResult {
  softHoldId: string;
  status: SoftHold["status"];
  startTime: string;
  expiresAt: string;
  explanation: string;
}

export function createSoftHold(
  input: CreateSoftHoldInput,
): CreateSoftHoldResult {
  const policy = getBookingPolicy();
  const sheet = getTeeSheet();

  const teeTime = input.teeTimeId
    ? sheet.find((t) => t.id === input.teeTimeId)
    : sheet.find((t) => t.startTime === input.startTime);

  if (!teeTime) {
    throw new Error(
      "SCP Golf: cannot create soft hold — no matching tee time found.",
    );
  }
  if (teeTime.status !== "available") {
    throw new Error(
      `SCP Golf: cannot create soft hold — slot ${teeTime.startTime} is ${teeTime.status}, not available.`,
    );
  }

  // Expiry is softHoldMinutes from now.
  const expires = new Date(
    Date.now() + policy.softHoldMinutes * 60_000,
  ).toISOString();

  const hold: SoftHold = {
    id: makeId("hold"),
    courseId: input.courseId,
    date: input.date,
    teeTimeId: teeTime.id,
    startTime: teeTime.startTime,
    players: input.players,
    agentId: input.agentId,
    golferName: input.golferName,
    status: "active",
    createdAt: nowIso(),
    expiresAt: expires,
  };

  // Persist the hold.
  const holds = safeReadJsonArray<SoftHold>(HOLDS);
  holds.push(hold);
  safeWriteJsonArray(HOLDS, holds);

  // Mutate the tee sheet.
  const updatedSheet: TeeTime[] = sheet.map((t) =>
    t.id === teeTime.id ? { ...t, status: "soft_hold" as const } : t,
  );
  safeWriteJsonArray(TEE_SHEET, updatedSheet);

  return {
    softHoldId: hold.id,
    status: hold.status,
    startTime: hold.startTime,
    expiresAt: hold.expiresAt,
    explanation: `Soft hold created for ${hold.startTime} for ${input.players} player(s). It expires in ${policy.softHoldMinutes} minutes.`,
  };
}
