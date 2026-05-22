/**
 * learning.ts — the self-learning layer.
 *
 * No model training. SCP learns by writing typed, confidence-weighted lessons
 * keyed on decision fingerprints, and by strengthening or retiring them as
 * outcomes arrive. See docs/LEARNING_LOOP.md.
 */

import type {
  LearningLesson,
  LearningMemory,
  LearningInsight,
  DecisionEvent,
  OutcomeFeedback,
  LessonType,
} from "../types/golf.js";
import { getLearningMemory } from "./context.js";
import { writeJsonFile } from "./storage.js";
import { keyMatches } from "./fingerprint.js";
import { makeId } from "./time.js";
import {
  scoreOutcome,
  updateConfidence,
  confidenceTargetFor,
} from "./scoring.js";

const PROMOTE_MIN_EVIDENCE = 2;
const PROMOTE_MIN_CONFIDENCE = 0.5;
const RETIRE_BELOW_CONFIDENCE = 0.2;

/** Flatten all lesson buckets into one array (used for matching). */
function allLessons(memory: LearningMemory): LearningLesson[] {
  return [
    ...memory.lessons,
    ...memory.operatorPreferences,
    ...memory.pricingPatterns,
    ...memory.pacePatterns,
    ...memory.blockedPatterns,
  ];
}

/**
 * Lessons whose key matches the given concrete fingerprint key, that are not
 * retired. Sorted strongest-first.
 */
export function getRelevantLessons(concreteKey: string): LearningLesson[] {
  const memory = getLearningMemory();
  return allLessons(memory)
    .filter((l) => l.status !== "retired")
    .filter((l) => keyMatches(concreteKey, l.fingerprintKey))
    .sort((a, b) => b.confidence - a.confidence);
}

/** Plain-English insights for a fingerprint key (used by get_learning_insights). */
export function getLearningInsights(concreteKey?: string): {
  lessons: LearningInsight[];
  operatorPreferences: LearningInsight[];
  pricingPatterns: LearningInsight[];
  pacePatterns: LearningInsight[];
  similarPastDecisions: LearningInsight[];
} {
  const memory = getLearningMemory();
  const toInsight = (l: LearningLesson): LearningInsight => ({
    type: l.type,
    text: l.text,
    confidence: l.confidence,
    evidenceCount: l.evidenceCount,
  });
  const filter = (ls: LearningLesson[]) =>
    ls
      .filter((l) => l.status !== "retired")
      .filter((l) => !concreteKey || keyMatches(concreteKey, l.fingerprintKey))
      .map(toInsight);

  return {
    lessons: filter(memory.lessons),
    operatorPreferences: filter(memory.operatorPreferences),
    pricingPatterns: filter(memory.pricingPatterns),
    pacePatterns: filter(memory.pacePatterns),
    similarPastDecisions: getRelevantLessons(concreteKey ?? "").map(toInsight),
  };
}

/** Which memory bucket does a lesson type live in? */
function bucketFor(memory: LearningMemory, type: LessonType): LearningLesson[] {
  switch (type) {
    case "operator_preference":
      return memory.operatorPreferences;
    case "pricing":
      return memory.pricingPatterns;
    case "pace":
      return memory.pacePatterns;
    case "booking":
    default:
      return memory.lessons;
  }
}

/** Promote/retire a lesson based on its current confidence + evidence. */
function applyStatusTransition(lesson: LearningLesson): void {
  if (lesson.confidence < RETIRE_BELOW_CONFIDENCE) {
    lesson.status = "retired";
  } else if (
    lesson.evidenceCount >= PROMOTE_MIN_EVIDENCE &&
    lesson.confidence >= PROMOTE_MIN_CONFIDENCE
  ) {
    lesson.status = "active";
  } else {
    lesson.status = "suggested";
  }
}

export interface LearningUpdate {
  type: LessonType;
  text: string;
  confidence: number;
  evidenceCount: number;
  status: string;
}

/**
 * The heart of the loop. Given a decision and the feedback on it, update
 * learning memory and return the human-readable updates.
 */
export function updateLearningMemoryFromOutcome(
  decision: DecisionEvent,
  feedback: OutcomeFeedback,
): { updates: LearningUpdate[]; insights: string[] } {
  const memory = getLearningMemory();
  const score = scoreOutcome(feedback.feedbackType);
  const key = decision.fingerprintKey;
  const updates: LearningUpdate[] = [];
  const insights: string[] = [];

  // Decide the corrective lesson type + text from the feedback.
  const isNegative = score < 0;
  let type: LessonType = "booking";
  let text = "";
  let correctedValue: string | undefined;

  if (feedback.feedbackType === "operator_overrode") {
    type = "operator_preference";
    correctedValue =
      (feedback.metrics?.correctedStartTime as string | undefined) ??
      (feedback.metrics?.correctedValue as string | undefined);
    text = correctedValue
      ? `Operator prefers ${correctedValue} for this kind of request. ${
          feedback.notes ?? ""
        }`.trim()
      : `Operator overrode SCP's recommendation here. ${
          feedback.notes ?? ""
        }`.trim();
  } else if (feedback.feedbackType === "pace_issue") {
    type = "pace";
    text = `This booking window has produced a pace issue. ${
      feedback.notes ?? ""
    }`.trim();
  } else if (
    feedback.feedbackType === "price_rejected" ||
    feedback.feedbackType === "price_accepted"
  ) {
    type = "pricing";
    text =
      feedback.feedbackType === "price_rejected"
        ? `Golfers are rejecting prices in this window. ${feedback.notes ?? ""}`.trim()
        : `Price accepted in this window. ${feedback.notes ?? ""}`.trim();
  } else if (
    feedback.feedbackType === "golfer_complained" ||
    feedback.feedbackType === "no_show" ||
    feedback.feedbackType === "abandoned"
  ) {
    type = "booking";
    text = `Negative outcome (${feedback.feedbackType}) for this kind of request. ${
      feedback.notes ?? ""
    }`.trim();
  } else {
    // confirmed / slot_filled — reinforce that SCP's recommendation worked.
    type = "booking";
    text = `SCP's recommendation for this kind of request led to a good outcome (${feedback.feedbackType}).`;
  }

  // Find an existing lesson on this exact key + type, or create one.
  const bucket = bucketFor(memory, type);
  let lesson = bucket.find(
    (l) => l.fingerprintKey === key && l.type === type,
  );

  if (!lesson) {
    lesson = {
      id: makeId("lesson"),
      type,
      fingerprintKey: key,
      text,
      confidence: 0,
      evidenceCount: 0,
      status: "suggested",
    };
    bucket.push(lesson);
  }

  // Update the lesson.
  lesson.evidenceCount += 1;
  lesson.lastOutcomeScore = score;
  lesson.text = text || lesson.text;
  if (correctedValue) lesson.correctedValue = correctedValue;

  const target = isNegative
    ? confidenceTargetFor(score)
    : confidenceTargetFor(score);
  lesson.confidence = updateConfidence(lesson.confidence, target);
  applyStatusTransition(lesson);

  updates.push({
    type: lesson.type,
    text: lesson.text,
    confidence: Number(lesson.confidence.toFixed(2)),
    evidenceCount: lesson.evidenceCount,
    status: lesson.status,
  });

  // If the outcome contradicts SCP's original recommendation, decay any
  // booking lesson that previously endorsed it on the same key.
  if (isNegative) {
    for (const l of memory.lessons) {
      if (
        l.fingerprintKey === key &&
        l.type === "booking" &&
        l.id !== lesson.id &&
        l.lastOutcomeScore !== undefined &&
        l.lastOutcomeScore > 0
      ) {
        l.confidence = updateConfidence(l.confidence, 0);
        applyStatusTransition(l);
      }
    }
  }

  insights.push(
    lesson.status === "active"
      ? `SCP now actively applies this lesson to matching requests (confidence ${lesson.confidence.toFixed(
          2,
        )}, ${lesson.evidenceCount} pieces of evidence).`
      : `SCP has recorded this as a suggested lesson and will confirm it with one more matching outcome.`,
  );

  writeJsonFile<LearningMemory>("learning-memory.json", memory);
  return { updates, insights };
}
