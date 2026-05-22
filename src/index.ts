#!/usr/bin/env node
/**
 * SCP Golf — MCP server entry point.
 *
 * The self-learning operational context layer for AI golf agents.
 * Before an agent books, prices, or recommends, it checks SCP.
 * Then SCP learns from what happened.
 *
 * IMPORTANT: stdio transport uses stdout for the JSON-RPC protocol. Never
 * write logs to stdout — only stderr.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerTools } from "./tools.js";
import { registerResources } from "./resources.js";
import { registerPrompts } from "./prompts.js";

/** Log only to stderr — stdout is reserved for MCP protocol messages. */
function log(message: string): void {
  process.stderr.write(`[scp-golf] ${message}\n`);
}

async function main(): Promise<void> {
  const server = new McpServer({
    name: "scp-golf",
    version: "0.1.0",
  });

  registerTools(server);
  registerResources(server);
  registerPrompts(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  log("SCP Golf MCP server running on stdio transport.");
  log("9 tools, 11 resources, 4 prompts registered. Course: Harbor Ridge (demo).");
}

main().catch((err) => {
  process.stderr.write(`[scp-golf] fatal: ${(err as Error).stack ?? err}\n`);
  process.exit(1);
});
