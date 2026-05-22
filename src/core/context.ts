/**
 * context.ts — the read layer. Loads every JSON data file and assembles the
 * full course operating context that the get_course_context tool and the
 * context resource both return.
 */

import { readJsonFile, safeReadJsonArray } from "./storage.js";
import type {
  Course,
  TeeTime,
  BookingPolicy,
  PricingPolicy,
  CourseEvent,
  WeatherContext,
  PaceContext,
  DecisionEvent,
  LearningMemory,
  SoftHold,
} from "../types/golf.js";

export function getCourse(): Course {
  return readJsonFile<Course>("demo-course.json");
}

export function getTeeSheet(): TeeTime[] {
  return safeReadJsonArray<TeeTime>("demo-tee-sheet.json");
}

export function getBookingPolicy(): BookingPolicy {
  return readJsonFile<BookingPolicy>("demo-booking-policy.json");
}

export function getPricingPolicy(): PricingPolicy {
  return readJsonFile<PricingPolicy>("demo-pricing-policy.json");
}

export function getEvents(): CourseEvent[] {
  return safeReadJsonArray<CourseEvent>("demo-events.json");
}

export function getWeather(): WeatherContext {
  return readJsonFile<WeatherContext>("demo-weather.json");
}

export function getPace(): PaceContext {
  return readJsonFile<PaceContext>("demo-pace.json");
}

export function getDecisionLedger(): DecisionEvent[] {
  return safeReadJsonArray<DecisionEvent>("decision-ledger.json");
}

export function getLearningMemory(): LearningMemory {
  return readJsonFile<LearningMemory>("learning-memory.json");
}

export function getSoftHolds(): SoftHold[] {
  return safeReadJsonArray<SoftHold>("soft-holds.json");
}

/** Summarise tee-sheet inventory by status. */
export function summarizeInventory(teeSheet: TeeTime[]) {
  const byStatus: Record<string, number> = {};
  for (const t of teeSheet) {
    byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
  }
  return {
    totalSlots: teeSheet.length,
    byStatus,
    availableCount: byStatus.available ?? 0,
  };
}

/** Assemble the full operating context. */
export function getFullCourseContext() {
  const course = getCourse();
  const teeSheet = getTeeSheet();
  const memory = getLearningMemory();
  const ledger = getDecisionLedger();

  const activeLessons = [
    ...memory.lessons,
    ...memory.operatorPreferences,
    ...memory.pricingPatterns,
    ...memory.pacePatterns,
  ].filter((l) => l.status === "active" || l.status === "suggested");

  return {
    course,
    date: getWeather().date,
    teeSheetSummary: summarizeInventory(teeSheet),
    availableInventorySummary: {
      available: teeSheet
        .filter((t) => t.status === "available")
        .map((t) => ({ startTime: t.startTime, price: t.price })),
    },
    bookingPolicySummary: getBookingPolicy(),
    pricingPolicySummary: getPricingPolicy(),
    events: getEvents(),
    weather: getWeather(),
    pace: getPace(),
    recentDecisions: ledger.slice(-5),
    softHolds: getSoftHolds().filter((h) => h.status === "active"),
    learningInsights: activeLessons.map((l) => ({
      type: l.type,
      text: l.text,
      confidence: l.confidence,
      evidenceCount: l.evidenceCount,
    })),
  };
}
