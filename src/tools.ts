/**
 * tools.ts — registers the nine SCP Golf MCP tools on the server.
 *
 * Each tool returns MCP content as a single JSON text block. Decision tools
 * (check_booking_action, check_pricing_action) also write to the ledger.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import type {
  AgentAudience,
  OutcomeFeedback,
  FeedbackType,
} from "./types/golf.js";
import { getFullCourseContext } from "./core/context.js";
import { getAvailableInventory } from "./core/inventory.js";
import { checkBookingAction } from "./core/policies.js";
import { checkPricingAction } from "./core/pricing.js";
import { createSoftHold } from "./core/holds.js";
import {
  writeDecisionEvent,
  getDecisionEvent,
  updateDecisionWithOutcome,
} from "./core/ledger.js";
import { updateLearningMemoryFromOutcome, getLearningInsights } from "./core/learning.js";
import {
  decorateBooking,
  decoratePricing,
  explainAction,
} from "./core/explain.js";
import { nowIso } from "./core/time.js";

/** Wrap any value as a single JSON text content block. */
function json(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
  };
}

export function registerTools(server: McpServer): void {
  // -------------------------------------------------------------------------
  // 1. get_course_context
  // -------------------------------------------------------------------------
  server.registerTool(
    "get_course_context",
    {
      title: "Get course context",
      description:
        "Returns the full operating context for the course: tee-sheet summary, " +
        "inventory, booking and pricing policies, events, weather, pace risks, " +
        "recent decisions, and learning insights. An agent should call this " +
        "before acting.",
      inputSchema: {
        courseId: z.string().default("demo"),
        date: z.string().default("2026-06-06"),
      },
    },
    async () => json(getFullCourseContext()),
  );

  // -------------------------------------------------------------------------
  // 2. get_available_inventory
  // -------------------------------------------------------------------------
  server.registerTool(
    "get_available_inventory",
    {
      title: "Get available inventory",
      description:
        "Finds available tee times near a preferred time. Never returns " +
        "protected, booked, or blocked inventory as bookable.",
      inputSchema: {
        date: z.string().default("2026-06-06"),
        preferredTime: z.string().optional(),
        timeWindowMinutes: z.number().optional(),
        players: z.number().int().min(1).default(1),
        publicAgent: z.boolean().default(true),
      },
    },
    async (args) =>
      json(
        getAvailableInventory({
          date: args.date,
          preferredTime: args.preferredTime,
          timeWindowMinutes: args.timeWindowMinutes,
          players: args.players,
          publicAgent: args.publicAgent,
        }),
      ),
  );

  // -------------------------------------------------------------------------
  // 3. check_booking_action  (writes a decision event)
  // -------------------------------------------------------------------------
  server.registerTool(
    "check_booking_action",
    {
      title: "Check booking action",
      description:
        "Checks whether a booking is allowed, blocked, risky, or warns based " +
        "on policy and learned memory. Writes a decision event to the ledger.",
      inputSchema: {
        courseId: z.string().default("demo"),
        date: z.string().default("2026-06-06"),
        requestedStartTime: z.string(),
        players: z.number().int().min(1).default(1),
        publicAgent: z.boolean().default(true),
        agentId: z.string().optional(),
        now: z.string().optional(),
      },
    },
    async (args) => {
      const result = decorateBooking(checkBookingAction(args));
      const event = writeDecisionEvent({
        agentId: args.agentId,
        toolName: "check_booking_action",
        courseId: args.courseId,
        actionType: "book_tee_time",
        fingerprintKey: result.fingerprintKey,
        inputSummary: `${args.players} player(s) requested ${args.requestedStartTime} on ${args.date}`,
        resultSummary: `${result.status}: ${result.recommendedAction}`,
        allowed: result.allowed,
        requiresApproval: result.requiresApproval,
        riskLevel: result.riskLevel,
        reasons: result.reasons,
        contextUsed: [
          "tee-sheet",
          "booking-policy",
          "events",
          "pace",
          "learning-memory",
        ],
      });
      return json({ decisionEventId: event.id, result });
    },
  );

  // -------------------------------------------------------------------------
  // 4. check_pricing_action  (writes a decision event)
  // -------------------------------------------------------------------------
  server.registerTool(
    "check_pricing_action",
    {
      title: "Check pricing action",
      description:
        "Checks whether a quoted or discounted price is allowed, given the " +
        "absolute floor, time-window rate, discount limits, approval rules, " +
        "and learned pricing patterns. Writes a decision event.",
      inputSchema: {
        courseId: z.string().default("demo"),
        date: z.string().default("2026-06-06"),
        startTime: z.string(),
        currentPrice: z.number(),
        proposedPrice: z.number(),
        agentId: z.string().optional(),
      },
    },
    async (args) => {
      const result = decoratePricing(checkPricingAction(args));
      const event = writeDecisionEvent({
        agentId: args.agentId,
        toolName: "check_pricing_action",
        courseId: args.courseId,
        actionType: "quote_price",
        fingerprintKey: result.fingerprintKey,
        inputSummary: `Proposed $${args.proposedPrice} (from $${args.currentPrice}) at ${args.startTime}`,
        resultSummary: `${result.status}: recommend $${result.recommendedPrice}`,
        allowed: result.allowed,
        requiresApproval: result.requiresApproval,
        riskLevel: result.riskLevel,
        reasons: result.reasons,
        contextUsed: ["pricing-policy", "learning-memory"],
      });
      return json({ decisionEventId: event.id, result });
    },
  );

  // -------------------------------------------------------------------------
  // 5. create_soft_hold
  // -------------------------------------------------------------------------
  server.registerTool(
    "create_soft_hold",
    {
      title: "Create soft hold",
      description:
        "Creates a temporary hold on a tee time before confirmation. Marks " +
        "the slot as soft_hold on the tee sheet.",
      inputSchema: {
        courseId: z.string().default("demo"),
        date: z.string().default("2026-06-06"),
        teeTimeId: z.string().optional(),
        startTime: z.string().optional(),
        players: z.number().int().min(1).default(1),
        agentId: z.string().optional(),
        golferName: z.string().optional(),
      },
    },
    async (args) => {
      try {
        return json(createSoftHold(args));
      } catch (err) {
        return json({ error: (err as Error).message });
      }
    },
  );

  // -------------------------------------------------------------------------
  // 6. write_decision_event
  // -------------------------------------------------------------------------
  server.registerTool(
    "write_decision_event",
    {
      title: "Write decision event",
      description:
        "Logs a decision event to the ledger. Most decision tools write their " +
        "own events; this tool is for agents that want to log an action " +
        "directly.",
      inputSchema: {
        agentId: z.string().optional(),
        toolName: z.string(),
        courseId: z.string().default("demo"),
        actionType: z.string(),
        fingerprintKey: z.string().default("manual"),
        inputSummary: z.string(),
        resultSummary: z.string(),
        allowed: z.boolean(),
        requiresApproval: z.boolean().default(false),
        riskLevel: z.enum(["low", "medium", "high"]).default("low"),
        reasons: z.array(z.string()).default([]),
      },
    },
    async (args) => {
      const event = writeDecisionEvent(args);
      return json({ decisionEventId: event.id, status: "logged" });
    },
  );

  // -------------------------------------------------------------------------
  // 7. submit_outcome_feedback  (the learning tool)
  // -------------------------------------------------------------------------
  server.registerTool(
    "submit_outcome_feedback",
    {
      title: "Submit outcome feedback",
      description:
        "The learning tool. Attaches an outcome to a past decision and " +
        "updates SCP's learning memory so future similar decisions improve.",
      inputSchema: {
        decisionEventId: z.string(),
        feedbackType: z.enum([
          "confirmed",
          "abandoned",
          "operator_overrode",
          "golfer_complained",
          "pace_issue",
          "price_rejected",
          "price_accepted",
          "slot_filled",
          "slot_unsold",
          "no_show",
        ]),
        notes: z.string().optional(),
        metrics: z.record(z.unknown()).optional(),
      },
    },
    async (args) => {
      const decision = getDecisionEvent(args.decisionEventId);
      if (!decision) {
        return json({
          error: `No decision event found with id ${args.decisionEventId}.`,
        });
      }
      const outcome: OutcomeFeedback = {
        decisionEventId: args.decisionEventId,
        feedbackType: args.feedbackType as FeedbackType,
        notes: args.notes,
        metrics: args.metrics,
        submittedAt: nowIso(),
      };
      const updatedDecision = updateDecisionWithOutcome(
        args.decisionEventId,
        outcome,
      );
      const { updates, insights } = updateLearningMemoryFromOutcome(
        decision,
        outcome,
      );
      return json({
        updatedDecision,
        learningUpdates: updates,
        newInsights: insights,
      });
    },
  );

  // -------------------------------------------------------------------------
  // 8. get_learning_insights
  // -------------------------------------------------------------------------
  server.registerTool(
    "get_learning_insights",
    {
      title: "Get learning insights",
      description:
        "Returns what SCP has learned: lessons, operator preferences, pricing " +
        "and pace patterns, and similar past decisions. Optionally filtered " +
        "to a decision fingerprint key.",
      inputSchema: {
        courseId: z.string().default("demo"),
        fingerprintKey: z.string().optional(),
      },
    },
    async (args) => json(getLearningInsights(args.fingerprintKey)),
  );

  // -------------------------------------------------------------------------
  // 9. explain_action
  // -------------------------------------------------------------------------
  server.registerTool(
    "explain_action",
    {
      title: "Explain action",
      description:
        "Explains a decision result for a chosen audience: golfer (simple, no " +
        "internal language), operator (operational detail), or developer " +
        "(structured detail).",
      inputSchema: {
        actionType: z.string(),
        result: z.record(z.unknown()),
        audience: z.enum(["golfer", "operator", "developer"]).default("golfer"),
      },
    },
    async (args) => {
      const text = explainAction(
        args.actionType,
        // The result object is passed through from a prior tool call.
        args.result as never,
        args.audience as AgentAudience,
      );
      return json({ explanation: text });
    },
  );
}
