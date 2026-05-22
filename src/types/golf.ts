/**
 * SCP Golf — core domain types.
 *
 * These types are the contract for the whole alpha. They describe a golf
 * course as a live operational system: tee sheet, policies, events, pace,
 * decisions, and learned memory.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export type BookingStatus =
  | "available"
  | "booked"
  | "protected"
  | "blocked"
  | "soft_hold";

export type RiskLevel = "low" | "medium" | "high";

export type ActionStatus = "allowed" | "blocked" | "warning";

export type BlockType = "member" | "league" | "outing" | "maintenance";

export type AgentAudience = "golfer" | "operator" | "developer";

// ---------------------------------------------------------------------------
// Course + tee sheet
// ---------------------------------------------------------------------------

export interface Course {
  id: string;
  name: string;
  type: string;
  timezone: string;
  holes: number;
  teeIntervalMinutes: number;
  maxGroupSize: number;
  defaultRoundTimeMinutes: number;
  description?: string;
}

export interface TeeTime {
  id: string;
  courseId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm 24h
  status: BookingStatus;
  playersBooked: number;
  maxPlayers: number;
  price: number;
  blockType?: BlockType;
  eventId?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Policies
// ---------------------------------------------------------------------------

export type RuleEffect = "block" | "requires_approval" | "warn";

export interface BookingRule {
  id: string;
  description: string;
  effect: RuleEffect;
  minutesBeforeStart?: number;
}

export interface BookingPolicy {
  courseId: string;
  softHoldRequired: boolean;
  softHoldMinutes: number;
  maxGroupSize: number;
  publicAgentRules: BookingRule[];
  approvalRules: BookingRule[];
  golferSafeLanguage: {
    protected: string;
    blocked: string;
    booked: string;
  };
}

export interface PricingRule {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  baseRate: number;
  maxAutoDiscountPercent?: number;
}

export interface PricingApprovalRule {
  id: string;
  dayOfWeek?: string;
  startTime: string;
  endTime: string;
  effect: RuleEffect;
}

export interface PricingPolicy {
  courseId: string;
  absolutePriceFloor: number;
  rules: PricingRule[];
  approvalRules: PricingApprovalRule[];
}

// ---------------------------------------------------------------------------
// Events, weather, pace
// ---------------------------------------------------------------------------

export interface CourseEvent {
  id: string;
  type: BlockType | "league_block" | "member_block";
  label: string;
  startTime: string;
  endTime: string;
  visibility: "internal" | "public";
}

export interface WeatherContext {
  courseId: string;
  date: string;
  summary: string;
  temperatureF: number;
  windMph: number;
  morningRainChancePercent: number;
  afternoonRainChancePercent: number;
  operatorNote?: string;
}

export interface PaceRisk {
  id: string;
  startTime: string;
  endTime: string;
  riskLevel: RiskLevel;
  reason: string;
}

export interface PaceContext {
  courseId: string;
  date: string;
  expectedRoundTimeMinutes: number;
  risks: PaceRisk[];
}

// ---------------------------------------------------------------------------
// Tool inputs / results
// ---------------------------------------------------------------------------

export interface BookingActionInput {
  courseId: string;
  date: string;
  requestedStartTime: string;
  players: number;
  publicAgent: boolean;
  agentId?: string;
  /** Override for "now" — ISO 8601. Used for testing the inside-N-minutes rule. */
  now?: string;
}

export interface BookingActionResult {
  allowed: boolean;
  status: ActionStatus;
  requiresApproval: boolean;
  requiresSoftHold: boolean;
  riskLevel: RiskLevel;
  reasons: string[];
  blockedBy: string[];
  recommendedAction: string;
  alternativeTeeTime?: TeeTime;
  golferSafeExplanation: string;
  operatorExplanation: string;
  fingerprintKey: string;
}

export interface PricingActionInput {
  courseId: string;
  date: string;
  startTime: string;
  currentPrice: number;
  proposedPrice: number;
  agentId?: string;
}

export interface PricingActionResult {
  allowed: boolean;
  status: ActionStatus;
  requiresApproval: boolean;
  riskLevel: RiskLevel;
  reasons: string[];
  recommendedPrice: number;
  golferSafeExplanation: string;
  operatorExplanation: string;
  fingerprintKey: string;
}

export interface SoftHold {
  id: string;
  courseId: string;
  date: string;
  teeTimeId: string;
  startTime: string;
  players: number;
  agentId?: string;
  golferName?: string;
  status: "active" | "expired" | "released" | "confirmed";
  createdAt: string;
  expiresAt: string;
}

// ---------------------------------------------------------------------------
// Decision ledger
// ---------------------------------------------------------------------------

export type FeedbackType =
  | "confirmed"
  | "abandoned"
  | "operator_overrode"
  | "golfer_complained"
  | "pace_issue"
  | "price_rejected"
  | "price_accepted"
  | "slot_filled"
  | "slot_unsold"
  | "no_show";

export interface OutcomeFeedback {
  decisionEventId: string;
  feedbackType: FeedbackType;
  notes?: string;
  metrics?: Record<string, unknown>;
  submittedAt: string;
}

export interface DecisionEvent {
  id: string;
  timestamp: string;
  agentId?: string;
  toolName: string;
  courseId: string;
  actionType: string;
  fingerprintKey: string;
  inputSummary: string;
  resultSummary: string;
  allowed: boolean;
  requiresApproval: boolean;
  riskLevel: RiskLevel;
  reasons: string[];
  contextUsed: string[];
  outcome?: OutcomeFeedback;
}

// ---------------------------------------------------------------------------
// Learning memory
// ---------------------------------------------------------------------------

export type LessonType =
  | "booking"
  | "pricing"
  | "pace"
  | "operator_preference";

export type LessonStatus = "suggested" | "active" | "retired";

export interface LearningLesson {
  id: string;
  type: LessonType;
  fingerprintKey: string;
  text: string;
  confidence: number;
  evidenceCount: number;
  lastOutcomeScore?: number;
  correctedValue?: string;
  status: LessonStatus;
}

export interface LearningMemory {
  courseId: string;
  lessons: LearningLesson[];
  operatorPreferences: LearningLesson[];
  pricingPatterns: LearningLesson[];
  pacePatterns: LearningLesson[];
  blockedPatterns: LearningLesson[];
}

export interface LearningInsight {
  type: string;
  text: string;
  confidence: number;
  evidenceCount: number;
}

// ---------------------------------------------------------------------------
// Decision fingerprint (see docs/LEARNING_LOOP.md)
// ---------------------------------------------------------------------------

export interface DecisionFingerprint {
  actionType: string;
  courseId: string;
  dayOfWeek: string;
  timeBucket: "early" | "morning" | "midday" | "twilight";
  requestedSlotBucket: string;
  playerCountBucket?: "single" | "pair" | "group";
  publicAgent?: boolean;
  nearMemberBlock?: boolean;
  nearLeagueBlock?: boolean;
  nearOutingBlock?: boolean;
  priceBand?: string;
}
