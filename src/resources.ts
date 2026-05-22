/**
 * resources.ts — registers SCP Golf's read-only MCP resources. Each returns
 * JSON text. The context resource is the most important: it is the full
 * operating picture an agent should read before acting.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  getCourse,
  getTeeSheet,
  getBookingPolicy,
  getPricingPolicy,
  getEvents,
  getWeather,
  getPace,
  getDecisionLedger,
  getLearningMemory,
  getSoftHolds,
  getFullCourseContext,
} from "./core/context.js";

function jsonResource(uri: string, value: unknown) {
  return {
    contents: [
      {
        uri,
        mimeType: "application/json",
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

interface ResourceDef {
  name: string;
  uri: string;
  description: string;
  load: () => unknown;
}

const RESOURCES: ResourceDef[] = [
  {
    name: "course",
    uri: "scp://course/demo",
    description: "The demo course profile.",
    load: getCourse,
  },
  {
    name: "context",
    uri: "scp://course/demo/context",
    description:
      "The full course operating context — read this before acting.",
    load: getFullCourseContext,
  },
  {
    name: "tee-sheet",
    uri: "scp://course/demo/tee-sheet",
    description: "The full tee sheet for the demo date.",
    load: getTeeSheet,
  },
  {
    name: "booking-policy",
    uri: "scp://course/demo/booking-policy",
    description: "Booking policy: agent rules, approval rules, soft holds.",
    load: getBookingPolicy,
  },
  {
    name: "pricing-policy",
    uri: "scp://course/demo/pricing-policy",
    description: "Pricing policy: rates, floor, discount and approval rules.",
    load: getPricingPolicy,
  },
  {
    name: "events",
    uri: "scp://course/demo/events",
    description: "Internal event blocks for the demo date.",
    load: getEvents,
  },
  {
    name: "weather",
    uri: "scp://course/demo/weather",
    description: "Weather context for the demo date.",
    load: getWeather,
  },
  {
    name: "pace",
    uri: "scp://course/demo/pace",
    description: "Pace-of-play context and risk windows.",
    load: getPace,
  },
  {
    name: "decision-ledger",
    uri: "scp://course/demo/decision-ledger",
    description: "The decision ledger — every logged decision event.",
    load: getDecisionLedger,
  },
  {
    name: "learning-memory",
    uri: "scp://course/demo/learning-memory",
    description: "SCP's learning memory — lessons and patterns.",
    load: getLearningMemory,
  },
  {
    name: "soft-holds",
    uri: "scp://course/demo/soft-holds",
    description: "Active and historical soft holds.",
    load: getSoftHolds,
  },
];

export function registerResources(server: McpServer): void {
  for (const def of RESOURCES) {
    server.registerResource(
      def.name,
      def.uri,
      { description: def.description, mimeType: "application/json" },
      async () => jsonResource(def.uri, def.load()),
    );
  }
}
