# SCP Golf — Build Instructions for Codex

## Project goal
Build and extend SCP Golf, a local MCP server for golf operations. SCP Golf
gives AI golf agents course context before they book, price, move, message, or
recommend anything. The alpha uses only synthetic demo data. Do not reference
real courses, real tee-sheet providers, real golfer data, or real customers.

## Core product principle
Before a golf agent acts, it checks SCP. Then SCP learns from what happened.

## Technical choices
- TypeScript, Node.js (ESM, NodeNext module resolution)
- @modelcontextprotocol/sdk (high-level McpServer + registerTool/Resource/Prompt)
- zod for input schemas
- JSON file storage in src/data/ for the alpha — no database
- MCP stdio transport
- No external APIs, no dashboard, no auth in the alpha

## Hard rules
- NEVER write logs to stdout. stdio transport uses stdout for JSON-RPC.
  All logging goes to stderr (see the log() helper in src/index.ts).
- Golfer-facing output must never expose internal policy language
  (no "protected member inventory", "league block", "operator override").
  The explain.ts golferSafe() filter is the safety net; do not bypass it.
- "Learning" means updating operational memory from feedback. Never implement
  model training, embeddings, or a nightly retrain.
- Every decision tool call must write a DecisionEvent to the ledger.
- Run `npm run typecheck` and `npm run test` after any change.
- Update docs/ when behavior changes.

## The learning loop is the product
The single most important behavior: ask for Saturday ~09:00, have an operator
override it once, ask again, and SCP shifts its recommendation. The decision
fingerprint (src/core/fingerprint.ts) is the contract that makes this
deterministic — do not change the fingerprint key field order without a
migration. See docs/LEARNING_LOOP.md.

## Quality expectations
- Small, pure, readable functions. Friendly errors for missing data files.
- Keep the alpha synthetic-only. New features go behind the same JSON-file
  storage layer until Phase 2.
