# SCP Golf — Specification

## What SCP Golf is
A self-learning operational context layer for AI golf agents, delivered as an
MCP server. An agent reads SCP's context and calls SCP's safety tools before it
books, prices, or recommends. SCP logs each decision and learns from outcomes.

## The demo course
**Harbor Ridge Golf Club** — synthetic, public course with protected member
inventory. 18 holes, America/New_York, 10-minute tee intervals, max group 4.
Demo date: Saturday, June 6, 2026. Tee sheet runs 06:30-17:30 (67 slots).

Blocks: member inventory 07:30-08:50; booked groups 10:30/10:40/10:50; league
block 11:00-11:50; corporate outing 13:00; open twilight 15:00-17:30.

## Resources (read-only context)
`scp-golf://course/demo` plus `context`, `tee-sheet`, `booking-policy`,
`pricing-policy`, `events`, `weather`, `pace`, `decision-ledger`,
`learning-memory`, `soft-holds`. Each returns JSON. `context` is the assembled
full operating picture and is what an agent should read first.

## Tools
Nine tools — see README.md for the table. Decision tools
(`check_booking_action`, `check_pricing_action`) always write a DecisionEvent.
`submit_outcome_feedback` is the learning entry point.

## Data objects
Defined in `src/types/golf.ts`: Course, TeeTime, BookingPolicy, PricingPolicy,
CourseEvent, WeatherContext, PaceContext, SoftHold, DecisionEvent,
OutcomeFeedback, LearningLesson, LearningMemory, DecisionFingerprint.

## The safety model
- **Booking safety** (`src/core/policies.ts`): a public agent can never book
  protected, league, or outing inventory; group size is capped; soft holds are
  required; learned operator preferences can downgrade an otherwise-allowed
  action to a warning and shift the recommendation.
- **Pricing safety** (`src/core/pricing.ts`): an absolute price floor that is
  never crossed; time-window rates; an auto-discount ceiling; a Saturday-morning
  discount approval rule; learned pricing patterns.
- **Pace safety** (`src/core/pace.ts`): static risk windows plus group-size and
  adjacent-block adjustments.

## Golfer-safe language
Golfer-facing output must never reveal internal operations. It must not say
"protected member inventory", "league block", "outing block", "operator
override", or "revenue protection". It should say "that time is not available"
and offer an alternative. `src/core/explain.ts` enforces this with a final
`golferSafe()` filter; the operator and developer audiences see full detail.

## The learning model
See `docs/LEARNING_LOOP.md`. In summary: every decision is reduced to a
deterministic, bucketed **fingerprint key**; lessons are stored against that
key with a confidence and an evidence count; outcomes are scored and move
confidence by a fixed learning rate; a lesson is promoted from `suggested` to
`active` once it has at least two consistent pieces of evidence and confidence
of at least 0.5. There is no model training anywhere.
