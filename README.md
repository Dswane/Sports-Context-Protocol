# SCP Golf — Profile 001 of the Sports Context Protocol

**The context, safety, and memory layer for sports agents. Golf first.**

> Before a sports agent acts, it checks SCP. Then SCP learns from what happened.

**SCP — Sports Context Protocol** — is an open context layer for AI agents
operating in sports. Every sport venue has the same five things underneath:
**inventory, rules, actions, consequences, and memory.** SCP is the standard
way an agent reads those before it acts, and learns from the outcome after.

**SCP Golf is Profile 001** — the first working profile. Golf is the cleanest
wedge because an agent cannot safely book, price, move, or recommend anything
at a course without understanding tee-sheet state, protected inventory,
pricing policy, pace risk, events, and operator memory. Golf makes the problem
impossible to ignore.

This repository is **SCP Golf Alpha**: a synthetic demo course, a local
[MCP](https://modelcontextprotocol.io) server, booking and pricing safety
checks, soft holds, a decision ledger, and a self-learning memory. No real
course data, no integrations, no database.

- Protocol-level spec: [`docs/SCP_CORE_SPEC.md`](docs/SCP_CORE_SPEC.md)
- The profile system: [`docs/SCP_PROFILES.md`](docs/SCP_PROFILES.md)
- This profile: [`docs/SCP_GOLF_PROFILE.md`](docs/SCP_GOLF_PROFILE.md)

## Why golf agents need this

AI golf agents are coming — answering calls, booking tee times, quoting prices,
moving reservations. The problem: most agents only know the conversation. They
do not know the *course*: the tee-sheet state, the member protections, the
league blocks, the pricing floor, the pace risk, the operator's preferences,
and what happened the last time a similar decision was made.

SCP Golf gives them that, and then it learns.

## What the alpha does

- Models one synthetic course — **Harbor Ridge Golf Club** — for Saturday,
  June 6, 2026: a 67-slot tee sheet with member, league, and outing blocks.
- Exposes the course as **11 MCP resources** (read-only context).
- Exposes **9 MCP tools** for safe booking, pricing, soft holds, decision
  logging, outcome feedback, and learning insights.
- Exposes **4 MCP prompts** (reusable workflows).
- Logs every decision to a ledger and **learns from outcomes** — operator
  overrides, pace issues, price rejections — so the next similar decision is
  better.

## Install

```bash
npm install
npm run build
npm run typecheck
npm run test
```

## Run

```bash
npm run dev      # runs the MCP server on stdio (tsx, no build needed)
npm start        # runs the compiled server from dist/
```

Test it interactively with the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector npm run dev
```

## The tools

| Tool | What it does |
|---|---|
| `get_course_context` | Full operating context — read this before acting. |
| `get_available_inventory` | Available tee times near a preferred time. |
| `check_booking_action` | Is a booking allowed, blocked, risky? Writes a decision. |
| `check_pricing_action` | Is a quoted/discounted price allowed? Writes a decision. |
| `create_soft_hold` | Temporary hold on a tee time before confirmation. |
| `write_decision_event` | Log a decision directly. |
| `submit_outcome_feedback` | **The learning tool.** Feed an outcome back to SCP. |
| `get_learning_insights` | What SCP has learned. |
| `explain_action` | Explain a result for golfer / operator / developer. |

## The resources

`scp://course/demo` and its children: `context`, `tee-sheet`,
`booking-policy`, `pricing-policy`, `events`, `weather`, `pace`,
`decision-ledger`, `learning-memory`, `soft-holds`.

## The self-learning loop

This is the heart of SCP. It is operational learning — no model training.

1. An agent calls a tool. SCP builds a **decision fingerprint** (a bucketed,
   deterministic description of the *kind* of decision).
2. SCP checks rules and learned memory keyed on that fingerprint.
3. SCP recommends a safe action and logs a decision event.
4. Feedback arrives via `submit_outcome_feedback`.
5. SCP scores the outcome and updates its learning memory.
6. The next decision with a matching fingerprint is shaped by that memory.

The demo moment: ask for Saturday ~09:00, have an operator override the result
once, ask again — SCP now recommends the operator's preferred time. See
[`docs/LEARNING_LOOP.md`](docs/LEARNING_LOOP.md).

## Docs

- [`docs/SCP_CORE_SPEC.md`](docs/SCP_CORE_SPEC.md) — the protocol, sport-agnostic.
- [`docs/SCP_PROFILES.md`](docs/SCP_PROFILES.md) — the profile system and roadmap.
- [`docs/SCP_GOLF_PROFILE.md`](docs/SCP_GOLF_PROFILE.md) — Profile 001 primitive mapping.
- [`docs/SCP_GOLF_SPEC.md`](docs/SCP_GOLF_SPEC.md) — golf implementation detail.
- [`docs/QUICKSTART.md`](docs/QUICKSTART.md) — run and test locally.
- [`docs/DEMO_PROMPTS.md`](docs/DEMO_PROMPTS.md) — 10 demo prompts.
- [`docs/LEARNING_LOOP.md`](docs/LEARNING_LOOP.md) — how the learning works.
- [`docs/ROADMAP.md`](docs/ROADMAP.md) — phases beyond the alpha.

## Status

Alpha. Synthetic data. Booking safety first. Self-learning from decision
outcomes. Not partnered with any course, not integrated with any provider, not
live with any operator.

## License

MIT
