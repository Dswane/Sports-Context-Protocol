# SCP Profiles

A **profile** maps the five SCP primitives (`SCP_CORE_SPEC.md` §2) onto one
sport. A profile is a mapping, not a fork — it never reimplements the safety
check, the learning loop, the ledger, or the explanation contract.

## The profile registry

| ID  | Profile | Status | Inventory unit |
|-----|---------|--------|----------------|
| 001 | Golf    | **Alpha — shipped** | Tee time |
| 002 | Racquet (tennis / padel / pickleball) | Planned | Court reservation |
| 003 | Stadium & arena operations | Planned | Allocated slot (suite, field window, gate resource) |
| 004 | League scheduling | Exploratory | Fixture / facility slot |

The numbering is deliberate. SCP Golf is **Profile 001** — the first proof,
not the product. The product is the protocol.

## Why golf is Profile 001

Golf is the cleanest wedge because golf makes the problem impossible to ignore.
An agent cannot safely book, price, move, or recommend anything at a golf
course without understanding tee-sheet state, protected member inventory,
league and outing blocks, pricing policy, pace-of-play risk, weather, approval
thresholds, and operator preferences. Every one of the five primitives is
vivid and operationally real in golf on day one.

That density is the gift. A profile built against golf exercises the full core
spec. Profiles for sports with thinner constraints then fall out as
simplifications, not extensions.

## What each profile defines

Per `SCP_CORE_SPEC.md` §7, a profile specifies exactly five things:

1. **Inventory unit** and its statuses.
2. **Rule types** and their effects.
3. **Action types**.
4. **Consequence model** — the risk that isn't a hard rule.
5. **Fingerprint construction** — how a decision in this sport reduces to a
   deterministic key.

Everything else is inherited from core.

## Sketch: how other profiles map

These are illustrative, to show the mapping holds. Only Profile 001 is built.

**Profile 002 — Racquet.** Inventory: court reservations on fixed intervals.
Rules: member tiers, peak-hour caps, league/clinic holds, doubles-vs-singles
limits. Consequences: court-turnover pressure, lighting/closing windows.
Memory: operators overriding back-to-back bookings, no-show patterns by tier.

**Profile 003 — Stadium & arena.** Inventory: time-bound allocations of suites,
field windows, and gate/loading resources. Rules: event-day lockouts,
broadcast holds, security zones. Consequences: egress and crowd-flow risk.
Memory: operations staff overriding allocations that historically caused
bottlenecks.

**Profile 004 — League scheduling.** Inventory: fixture slots against shared
facilities. Rules: rest requirements, venue conflicts, travel constraints.
Consequences: competitive-fairness and fatigue risk. Memory: schedulers
overriding fixtures that produced complaints.

In every case the inventory unit is "a finite, time-bound, bookable thing,"
the rules carry the same three effects, and the fingerprint + learning loop are
unchanged. That invariance **is** the protocol.

## Adding a profile

A new profile is a new mapping document plus a profile module that builds
fingerprints and declares its inventory/rule/action vocabulary. It reuses the
core engine wholesale. The test that a profile is correct: the learning loop,
given that profile's fingerprint keys, promotes and retires lessons exactly as
it does for golf — because it never sees anything sport-specific.
