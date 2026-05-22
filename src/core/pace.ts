/**
 * pace.ts — pace-of-play risk. Uses the demo pace data plus simple rules:
 * larger groups raise risk, and booking adjacent to a large block warns.
 */

import type { RiskLevel } from "../types/golf.js";
import { getPace, getEvents } from "./context.js";
import { timeToMinutes, minuteGap } from "./time.js";

export interface PaceImpactInput {
  startTime: string;
  players: number;
}

export interface PaceImpactResult {
  riskLevel: RiskLevel;
  reasons: string[];
  estimatedImpactMinutes: number;
  recommendation: string;
}

const ORDER: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };

function maxRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  return ORDER[a] >= ORDER[b] ? a : b;
}

/** Pace risks overlapping a given time window. */
export function getPaceRisksForWindow(startTime: string) {
  const pace = getPace();
  const m = timeToMinutes(startTime);
  return pace.risks.filter(
    (r) => m >= timeToMinutes(r.startTime) && m <= timeToMinutes(r.endTime),
  );
}

/** Assess the pace impact of booking a particular slot for a group. */
export function checkPaceImpactForBooking(
  input: PaceImpactInput,
): PaceImpactResult {
  const reasons: string[] = [];
  let risk: RiskLevel = "low";
  let impact = 0;

  // Risk from the static pace windows.
  for (const r of getPaceRisksForWindow(input.startTime)) {
    risk = maxRisk(risk, r.riskLevel);
    reasons.push(r.reason);
    impact += r.riskLevel === "high" ? 12 : r.riskLevel === "medium" ? 6 : 2;
  }

  // Larger groups add a little risk.
  if (input.players >= 4) {
    reasons.push("Full foursome slightly increases turn time.");
    impact += 4;
    if (risk === "low") risk = "medium";
  }

  // Booking adjacent to a large internal block warns.
  for (const e of getEvents()) {
    if (
      (e.type === "league_block" || e.type === "outing") &&
      minuteGap(input.startTime, e.startTime) <= 20
    ) {
      reasons.push(
        `Booking is close to "${e.label}" — adjacent blocks can compress pace.`,
      );
      risk = maxRisk(risk, "medium");
    }
  }

  if (reasons.length === 0) {
    reasons.push("No notable pace risk for this window.");
  }

  return {
    riskLevel: risk,
    reasons,
    estimatedImpactMinutes: impact,
    recommendation:
      risk === "high"
        ? "Consider a different window or smaller group."
        : risk === "medium"
          ? "Acceptable, but monitor turn times around this slot."
          : "No pace concern.",
  };
}

/** A short summary of the day's pace context. */
export function summarizePaceContext(): string {
  const pace = getPace();
  const parts = pace.risks.map(
    (r) => `${r.startTime}-${r.endTime}: ${r.riskLevel} (${r.reason})`,
  );
  return `Expected round ${pace.expectedRoundTimeMinutes} min. ${parts.join("; ")}`;
}
