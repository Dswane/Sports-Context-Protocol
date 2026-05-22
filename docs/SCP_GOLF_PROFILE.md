# SCP Golf — Profile 001

The first working profile of Sports Context Protocol. This document maps the
five SCP core primitives (`SCP_CORE_SPEC.md` §2) onto golf course operations.
For the protocol-level definitions, read `SCP_CORE_SPEC.md` first. For the
implementation detail of this profile, see `SCP_GOLF_SPEC.md`.

## The mapping

### Inventory → tee times
A tee time is the golf inventory unit: a finite, time-bound slot with a
status (`available`, `booked`, `protected`, `blocked`, `soft_hold`), a
capacity (max group size), and a price. The demo course exposes 67 tee times
across a single day.

### Rules → blocks, caps, and agent permissions
Golf rule types and their core effects:

| Rule | Effect |
|------|--------|
| Protected member inventory | `block` for public agents |
| League block | `block` for public agents |
| Outing block | `block` for public agents |
| Max group size | `block` above the cap |
| Inside-30-minutes booking | `requires_approval` |
| Saturday-morning discount | `requires_approval` |

### Actions → book, hold, price, move, message, recommend
The alpha implements **book** (evaluated by `check_booking_action`),
**hold** (`create_soft_hold`), and **price** (`check_pricing_action`). Move,
message, and recommend are profile-defined and arrive in later phases — they
reuse the same safety-check and ledger machinery.

### Consequences → pace-of-play and weather
Golf's non-rule risk is pace. Compression windows, league-block turn times,
and full-foursome bookings raise a `riskLevel` without hard-blocking. Weather
context (rain probability, wind) shades demand and operator notes.

### Memory → operator overrides and outcomes
Golf memory learns from: operator overrides (the strongest signal), pace
issues, price rejections and acceptances, no-shows, complaints, and repeated
requests for protected inventory. See `LEARNING_LOOP.md`.

## The golf fingerprint

A golf booking decision reduces to this key shape:

```
book_tee_time | <course> | <dayOfWeek> | <timeBucket> |
<slotBucket> | <playerCountBucket> | public|internal | memberblock|nomemberblock
```

A golf pricing decision:

```
quote_price | <course> | <dayOfWeek> | <timeBucket> | <priceBand> | discount
```

The buckets are deliberately coarse so a lesson learned at 09:07 also applies
at 09:14. The field order is a contract — see `LEARNING_LOOP.md` §2.

## Customer-facing language for golf

The core "customer-facing" audience is "golfer" in this profile. Golfer-facing
output must never expose `protected member inventory`, `league block`,
`outing block`, `operator override`, or `revenue protection`. It says "that
time isn't available" and always offers an alternative. The operator and
developer audiences see full detail.

## Why this profile matters beyond golf

Profile 001 is the proof that the SCP core spec is real. Every primitive — all
five — is exercised vividly here because golf operations are constraint-dense.
A profile for a sport with fewer constraints is a simplification of this one,
not an extension of it. SCP Golf is how the protocol earns the right to call
itself a protocol.
