# SCP Golf — Quickstart

## Prerequisites
- Node.js 20 or newer.

## Setup
```bash
npm install
npm run build
npm run typecheck
npm run test
```
All 20 tests should pass (19 unit + 1 stdio e2e).

## Run the server
```bash
npm run dev
```
The server starts on stdio. It logs to stderr only (stdout is the MCP
protocol channel). You should see:
```
[scp-golf] SCP Golf MCP server running on stdio transport.
[scp-golf] 9 tools, 11 resources, 4 prompts registered. Course: Harbor Ridge (demo).
```

## Test with the MCP Inspector
```bash
npx @modelcontextprotocol/inspector npm run dev
```
The Inspector opens a UI where you can list and call tools, read resources,
and run prompts. If the Inspector command changes, check the current docs at
https://modelcontextprotocol.io.

## Run the demo in one command
```bash
npm run demo
```
Prints the full T0 → T1 → T2 sequence (request → operator override →
re-request) and confirms the magic moment is working. Useful for screen
recordings; resets state when it exits.

## Run the demo by hand
1. Call `check_booking_action` with `requestedStartTime: "09:10"`, `players: 4`,
   `publicAgent: true`. Note the `decisionEventId` it returns.
2. Call `submit_outcome_feedback` with that `decisionEventId`,
   `feedbackType: "operator_overrode"`, and
   `metrics: { "correctedStartTime": "09:30" }`.
3. Call `check_booking_action` again with the same `09:10` request.
   SCP now recommends 09:30 — it learned from the override.

## Resetting demo state
The alpha mutates `src/data/decision-ledger.json`, `src/data/soft-holds.json`,
`src/data/learning-memory.json`, and `src/data/demo-tee-sheet.json`. To start
fresh, restore those files (or re-run `npm run test`, which resets them).
