/**
 * reset.ts — test helper. Restores the mutable data files to a known starting
 * state so tests are deterministic and independent.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, "..", "src", "data");

const PRISTINE_LEDGER = "[]\n";
const PRISTINE_HOLDS = "[]\n";

const PRISTINE_MEMORY = {
  courseId: "demo",
  lessons: [
    {
      id: "lesson_protected_inventory",
      type: "booking",
      fingerprintKey: "book_tee_time|demo|*|*|*|*|public|*",
      text: "Avoid offering protected member times to public agents.",
      confidence: 0.95,
      evidenceCount: 3,
      status: "active",
    },
    {
      id: "lesson_saturday_around_9",
      type: "booking",
      fingerprintKey:
        "book_tee_time|demo|Saturday|morning|0900-0929|group|public|memberblock",
      text: "When a golfer asks for Saturday around 9 AM and the member block ends at 08:50, prefer 09:10 or later if available.",
      confidence: 0.75,
      evidenceCount: 2,
      status: "active",
    },
    {
      id: "lesson_saturday_morning_discount",
      type: "pricing",
      fingerprintKey: "quote_price|demo|Saturday|morning|*|discount",
      text: "Saturday morning discounts require operator approval.",
      confidence: 0.9,
      evidenceCount: 2,
      status: "active",
    },
  ],
  operatorPreferences: [],
  pricingPatterns: [],
  pacePatterns: [],
  blockedPatterns: [],
};

/** Regenerate the tee sheet from the canonical generator logic. */
function regenTeeSheet(): void {
  const t2m = (s: string) => {
    const [h, m] = s.split(":").map(Number);
    return h * 60 + m;
  };
  const m2t = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  const rate = (start: string) => {
    const m = t2m(start);
    if (m < t2m("12:00")) return 105;
    if (m < t2m("15:00")) return 88;
    return 55;
  };
  const tees: unknown[] = [];
  let idx = 0;
  for (let m = t2m("06:30"); m <= t2m("17:30"); m += 10) {
    const start = m2t(m);
    idx++;
    let status = "available";
    let playersBooked = 0;
    let blockType: string | undefined;
    let eventId: string | undefined;
    let notes: string | undefined;
    if (m >= t2m("07:30") && m <= t2m("08:50")) {
      status = "protected";
      blockType = "member";
      eventId = "event_member_morning";
      notes = "Protected member inventory";
    } else if (start === "10:30") {
      status = "booked";
      playersBooked = 4;
      notes = "Booked foursome";
    } else if (start === "10:40") {
      status = "booked";
      playersBooked = 4;
      notes = "Booked foursome";
    } else if (start === "10:50") {
      status = "booked";
      playersBooked = 2;
      notes = "Booked twosome";
    } else if (m >= t2m("11:00") && m <= t2m("11:50")) {
      status = "blocked";
      blockType = "league";
      eventId = "event_league_block";
      notes = "Saturday league block";
    } else if (start === "13:00") {
      status = "blocked";
      blockType = "outing";
      eventId = "event_corporate_shotgun";
      notes = "Corporate shotgun outing";
    }
    tees.push({
      id: `tt_${String(idx).padStart(3, "0")}`,
      courseId: "demo",
      date: "2026-06-06",
      startTime: start,
      status,
      playersBooked,
      maxPlayers: 4,
      price: rate(start),
      ...(blockType ? { blockType } : {}),
      ...(eventId ? { eventId } : {}),
      ...(notes ? { notes } : {}),
    });
  }
  writeFileSync(
    join(DATA, "demo-tee-sheet.json"),
    JSON.stringify(tees, null, 2) + "\n",
  );
}

/** Reset all mutable state to the pristine starting point. */
export function resetData(): void {
  writeFileSync(join(DATA, "decision-ledger.json"), PRISTINE_LEDGER);
  writeFileSync(join(DATA, "soft-holds.json"), PRISTINE_HOLDS);
  writeFileSync(
    join(DATA, "learning-memory.json"),
    JSON.stringify(PRISTINE_MEMORY, null, 2) + "\n",
  );
  regenTeeSheet();
}

// Silence unused import warning if execSync ends up unneeded.
void execSync;
