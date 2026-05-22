/**
 * prompts.ts — registers SCP Golf's reusable MCP prompts (workflows).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

function userPrompt(text: string) {
  return {
    messages: [
      {
        role: "user" as const,
        content: { type: "text" as const, text },
      },
    ],
  };
}

export function registerPrompts(server: McpServer): void {
  // 1. analyze_booking_request
  server.registerPrompt(
    "analyze_booking_request",
    {
      title: "Analyze a booking request",
      description:
        "Analyze a golfer booking request end to end using SCP Golf.",
      argsSchema: {
        golferRequest: z.string(),
        courseId: z.string().optional(),
        date: z.string().optional(),
      },
    },
    async (args) =>
      userPrompt(
        `Analyze this golfer booking request using SCP Golf.\n\n` +
          `Request: "${args.golferRequest}"\n` +
          `Course: ${args.courseId ?? "demo"}  Date: ${args.date ?? "2026-06-06"}\n\n` +
          `Steps:\n` +
          `1. Call get_course_context.\n` +
          `2. Call get_available_inventory for the requested time.\n` +
          `3. Call check_booking_action on the best candidate slot.\n` +
          `4. If blocked or warned, use the golfer-safe explanation and offer ` +
          `the best alternative. Do not expose internal policy language.\n` +
          `5. If the action is safe, recommend creating a soft hold.`,
      ),
  );

  // 2. operator_morning_briefing
  server.registerPrompt(
    "operator_morning_briefing",
    {
      title: "Operator morning briefing",
      description: "Generate a morning operations briefing for staff.",
      argsSchema: {
        courseId: z.string().optional(),
        date: z.string().optional(),
      },
    },
    async (args) =>
      userPrompt(
        `Create a morning operator briefing using SCP Golf context for ` +
          `course ${args.courseId ?? "demo"} on ${args.date ?? "2026-06-06"}.\n\n` +
          `Call get_course_context and get_learning_insights, then summarize:\n` +
          `- inventory risks and protected blocks\n` +
          `- pricing notes\n` +
          `- weather and how it may affect demand\n` +
          `- pace-of-play risk windows\n` +
          `- what SCP has learned recently\n` +
          `- recommended actions for the day.`,
      ),
  );

  // 3. explain_blocked_booking
  server.registerPrompt(
    "explain_blocked_booking",
    {
      title: "Explain a blocked booking",
      description:
        "Explain why a booking is blocked or not recommended, for a given audience.",
      argsSchema: {
        requestedTime: z.string(),
        players: z.string(),
        audience: z.string(),
      },
    },
    async (args) =>
      userPrompt(
        `Explain why a booking request is blocked or not recommended.\n\n` +
          `Requested time: ${args.requestedTime}  Players: ${args.players}\n` +
          `Audience: ${args.audience}\n\n` +
          `Call check_booking_action, then explain_action with the chosen ` +
          `audience. If the audience is "golfer", use simple language with no ` +
          `internal policy terms and give the best alternative. If "operator", ` +
          `include the operational detail and risk.`,
      ),
  );

  // 4. review_learning_memory
  server.registerPrompt(
    "review_learning_memory",
    {
      title: "Review learning memory",
      description: "Summarize what SCP Golf has learned.",
      argsSchema: {
        courseId: z.string().optional(),
      },
    },
    async (args) =>
      userPrompt(
        `Review SCP Golf's learning memory for course ` +
          `${args.courseId ?? "demo"}.\n\n` +
          `Call get_learning_insights and the learning-memory resource, then ` +
          `summarize what the system has learned from decisions, operator ` +
          `overrides, outcomes, and feedback — and how it will change future ` +
          `recommendations.`,
      ),
  );
}
