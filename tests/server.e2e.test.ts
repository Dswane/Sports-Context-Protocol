/**
 * server.e2e.test.ts — end-to-end smoke test over the real stdio transport.
 *
 * Boots the COMPILED server (`dist/index.js`) in a child process, speaks
 * JSON-RPC over stdio via the MCP client SDK, lists tools/resources/prompts,
 * and runs the magic moment: book → operator override → book again → SCP
 * shifts the recommendation. This locks the live server contract into CI.
 *
 * Build prerequisite: `npm run build` must have produced dist/ and copied
 * src/data → dist/data. The test fails loudly with a hint if it has not.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { resetData } from "./reset.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..");
const SERVER = join(REPO, "dist", "index.js");

function parseToolJson<T = unknown>(result: {
  content: Array<{ type: string; text?: string }>;
}): T {
  const first = result.content[0];
  assert.equal(first.type, "text", "tool result should be a text block");
  return JSON.parse(first.text ?? "") as T;
}

test("e2e: server boots over stdio and runs the magic moment", async () => {
  if (!existsSync(SERVER)) {
    assert.fail(
      `Compiled server not found at ${SERVER}. Run \`npm run build\` first.`,
    );
  }
  // Reset the on-disk state the compiled server reads.
  resetData();

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [SERVER],
  });
  const client = new Client({ name: "scp-golf-e2e", version: "0.0.0" });
  await client.connect(transport);

  try {
    // List discovery — every advertised surface should be present.
    const tools = await client.listTools();
    assert.equal(tools.tools.length, 9, "expected 9 tools");
    const toolNames = tools.tools.map((t) => t.name).sort();
    for (const expected of [
      "check_booking_action",
      "submit_outcome_feedback",
      "get_learning_insights",
    ]) {
      assert.ok(toolNames.includes(expected), `missing tool ${expected}`);
    }

    const resources = await client.listResources();
    assert.ok(resources.resources.length >= 10, "expected ≥10 resources");

    const prompts = await client.listPrompts();
    assert.equal(prompts.prompts.length, 4, "expected 4 prompts");

    // T0 — first 09:10 request goes through clean.
    const t0Result = parseToolJson<{
      decisionEventId: string;
      result: { allowed: boolean; status: string; fingerprintKey: string };
    }>(
      await client.callTool({
        name: "check_booking_action",
        arguments: {
          courseId: "demo",
          date: "2026-06-06",
          requestedStartTime: "09:10",
          players: 4,
          publicAgent: true,
          agentId: "agent_e2e",
        },
      }),
    );
    assert.equal(t0Result.result.allowed, true);
    assert.notEqual(t0Result.result.status, "blocked");

    // T1 — operator overrode: prefer 09:30 instead.
    parseToolJson(
      await client.callTool({
        name: "submit_outcome_feedback",
        arguments: {
          decisionEventId: t0Result.decisionEventId,
          feedbackType: "operator_overrode",
          notes: "Prefer 09:30 — too close to the member block.",
          metrics: { correctedStartTime: "09:30" },
        },
      }),
    );

    // T2 — same request again. SCP should now warn and recommend 09:30.
    const t2Result = parseToolJson<{
      result: {
        status: string;
        recommendedAction: string;
        fingerprintKey: string;
      };
    }>(
      await client.callTool({
        name: "check_booking_action",
        arguments: {
          courseId: "demo",
          date: "2026-06-06",
          requestedStartTime: "09:10",
          players: 4,
          publicAgent: true,
          agentId: "agent_e2e",
        },
      }),
    );
    assert.equal(
      t2Result.result.fingerprintKey,
      t0Result.result.fingerprintKey,
      "second request must produce the same fingerprint key",
    );
    assert.equal(
      t2Result.result.status,
      "warning",
      "after override, the same request should warn",
    );
    assert.ok(
      t2Result.result.recommendedAction.includes("09:30"),
      `recommendation should point at 09:30; got: ${t2Result.result.recommendedAction}`,
    );
  } finally {
    await client.close();
  }
});
