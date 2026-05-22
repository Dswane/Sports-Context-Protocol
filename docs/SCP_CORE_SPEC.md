# Sports Context Protocol (SCP) — Core Specification

> Before a sports agent acts, it checks SCP. Then SCP learns from what happened.

This document defines SCP at the protocol level — independent of any single
sport. Golf is the first profile (see `SCP_GOLF_PROFILE.md`), but nothing in
this core spec is golf-specific. A tennis club, a stadium, an indoor sports
facility, or a league is the same shape underneath.

## 1. The problem SCP exists to solve

AI agents are arriving in sports operations. They answer calls, book inventory,
quote prices, move reservations, recommend actions. The problem is not that
agents can't act — it's that they act *without context*. An agent knows the
conversation. It does not know the venue: what inventory is protected, what
rules apply, what the consequences of an action are, and what happened the last
time a similar decision was made.

SCP is the layer an agent reads and consults **before it acts**, and the layer
that **learns** from the outcome so the next decision is better.

## 2. The five primitives

Every sports venue or operation, in every sport, reduces to the same five
things. SCP is the standard way to expose them to an agent.

### 2.1 Inventory
The bookable, finite, time-bound units a venue sells or allocates. Each unit
has a status, a capacity, a time, and a price. Golf calls these tee times.
Other sports call them courts, lanes, fields, suites, slots — same primitive.

### 2.2 Rules
The constraints that govern what may be done with inventory: who may book what,
protected allocations, group-size limits, approval thresholds. Rules are typed
and carry an **effect**: `block`, `requires_approval`, or `warn`.

### 2.3 Actions
The operations an agent wants to perform: book, hold, price, move, message,
recommend. SCP does not perform actions against a system of record in the
alpha — it evaluates whether an action is *safe* and what the safe form of it
is.

### 2.4 Consequences
The risk an action carries that is not captured by a hard rule: pace-of-play
compression in golf, court-turnover pressure in racquet sports, gate or egress
risk in stadiums, weather. Consequences produce a **risk level**, not a block.

### 2.5 Memory
What the venue has learned from past decisions: operator overrides, outcomes,
repeated preferences. Memory is what makes SCP improve rather than merely
report. It is the primitive no read-only data API has.

## 3. The decision fingerprint

A fingerprint is a deterministic, bucketed description of the *kind* of decision
being made — not the raw request. Two similar requests must produce the same
fingerprint, or learning cannot generalise across them.

A fingerprint is built from: the action type, the venue, the day, a coarse time
bucket, a coarse inventory-slot bucket, and a small set of discriminating flags
relevant to the profile (in golf: group-size band, public-vs-internal agent,
proximity to a protected block). The fingerprint serialises to a stable string
**key**.

The fingerprint is the contract between profiles and the learning engine. The
learning engine never sees sport-specific fields — only fingerprint keys. This
is what makes SCP genuinely multi-sport: a new profile defines how to *build* a
fingerprint, and the entire learning loop works unchanged.

## 4. The safety check

Given an action and its context, SCP returns:

- `allowed` — is the action permitted at all?
- `status` — `allowed`, `warning`, or `blocked`.
- `riskLevel` — `low`, `medium`, `high`.
- `requiresApproval` — does a human need to sign off?
- `reasons` — the full reasoning, for operators and developers.
- `recommendedAction` — the safe form of the action.
- an **alternative** — if the requested action is blocked or risky, the best
  safe substitute.
- audience-scoped explanations — see §6.

## 5. The learning loop

1. An agent calls a tool. SCP builds a decision fingerprint.
2. SCP checks rules and memory keyed on that fingerprint.
3. SCP recommends a safe action and writes a decision event to a ledger.
4. An outcome arrives (operator override, completion, complaint, no-show, …).
5. SCP scores the outcome and updates memory: lessons carry a confidence and an
   evidence count; consistent evidence promotes a lesson from `suggested` to
   `active`; contradicting evidence retires it.
6. The next decision with a matching fingerprint is shaped by that memory.

There is no model training. SCP learns the way an experienced operator learns —
by remembering what happened the last time a similar decision was made. The
full mechanism (scoring table, confidence update rule, promotion thresholds) is
in `LEARNING_LOOP.md`.

## 6. Audience-scoped explanation

Every SCP result can be explained for three audiences:

- **customer-facing** — simple, never exposes internal operations or policy
  language (no "protected inventory", no "operator override history"). Always
  offers an alternative.
- **operator** — full operational detail, risk, approval requirements, the
  learned lessons that were applied.
- **developer** — structured detail including the fingerprint key.

A profile may rename "customer" (golf calls it "golfer"), but the three-tier
contract is fixed: an agent must always be able to get a safe customer-facing
explanation that leaks nothing internal.

## 7. What a profile must define

A sport profile (see `SCP_PROFILES.md`) is a mapping, not a fork. To add a
sport, a profile defines:

1. the **inventory unit** and its statuses;
2. the **rule types** that govern it;
3. the **action types** an agent can take;
4. the **consequence model** — what produces risk that isn't a hard rule;
5. how to **build a fingerprint** for that sport's decisions.

It does not redefine the safety check, the learning loop, the ledger, or the
explanation contract. Those are core and shared.

## 8. Transport and packaging

SCP is delivered as an MCP server. The core exposes its primitives as MCP
**resources** (read-only context), **tools** (safety checks, holds, feedback,
insights), and **prompts** (reusable workflows). The alpha runs locally over
stdio with synthetic data; later phases add a hosted transport and a persistent
store behind the same interface.

## 9. Non-goals

SCP is not a booking engine, not a system of record, not a sports-data or
scores API, and not an agent. It is the context, safety, and memory layer that
sits between an agent and whatever system of record a venue uses. It makes an
agent's actions safe and accountable; it does not replace the agent or the
venue's software.
