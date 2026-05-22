# SCP Golf — The Self-Learning Loop

This document specifies the part of SCP Golf that is easy to wave at and hard to
build: **how the system actually learns.** Everything here is operational
learning. There is no model training, no nightly retrain job, no gradient
anywhere. SCP learns the way an experienced starter learns — by remembering what
happened the last time a similar decision was made.

## 1. The loop, end to end

```
agent calls a tool  ──▶  SCP builds a DECISION FINGERPRINT
                              │
                              ▼
                    SCP checks rules + memory keyed on that fingerprint
                              │
                              ▼
                    SCP recommends an action  ──▶  writes a DecisionEvent
                              │
                              ▼
        operator / outcome feedback arrives via submit_outcome_feedback
                              │
                              ▼
        SCP scores the outcome and updates LEARNING MEMORY
                              │
                              ▼
        next decision with a matching fingerprint is shaped by that memory
```

## 2. The decision fingerprint

A fingerprint is a small, **deterministic** description of the *kind* of
decision being made. Two different golfers asking for "Saturday around 9 for
four" must produce the **same** fingerprint, or learning cannot generalise.

The fingerprint is NOT the raw input. It is a normalised bucketed projection of
it. Concretely, for a booking decision:

```jsonc
{
  "actionType": "book_tee_time",        // book_tee_time | quote_price | ...
  "courseId": "demo",
  "dayOfWeek": "Saturday",              // derived from date
  "timeBucket": "morning",              // early | morning | midday | twilight
  "requestedSlotBucket": "0900-0929",   // 30-min bucket, NOT the exact minute
  "playerCountBucket": "group",         // single | pair | group  (1 / 2-3 / 4)
  "publicAgent": true,
  "nearMemberBlock": true,              // within 30 min of a member block
  "nearLeagueBlock": false,
  "nearOutingBlock": false
}
```

The **fingerprint key** is the stable string used to index memory. It is the
ordered concatenation of the discriminating fields:

```
book_tee_time|demo|Saturday|morning|0900-0929|group|public|memberblock
```

Pricing decisions use a parallel shape:

```
quote_price|demo|Saturday|morning|twilight-rate|discount
```

The key is intentionally coarse. Coarse keys generalise (the lesson learned at
9:07 also applies at 9:14). If a key were the exact minute, SCP would learn
nothing reusable. This bucketing decision is the single most important design
choice in the learning layer.

## 3. What gets stored: the lesson

A learned lesson is a typed, confidence-weighted record:

```jsonc
{
  "id": "lesson_<short>",
  "type": "operator_preference",        // booking | pricing | pace | operator_preference
  "fingerprintKey": "book_tee_time|demo|Saturday|morning|0900-0929|group|public|memberblock",
  "text": "Avoid public bookings within 30 minutes of Saturday member blocks; prefer 09:30 or later.",
  "confidence": 0.68,                   // 0..1
  "evidenceCount": 1,                   // how many outcomes support it
  "lastOutcomeScore": -2,
  "correctedValue": "09:30",            // optional: the action the operator preferred
  "status": "suggested"                 // suggested | active | retired
}
```

A lesson is **`suggested`** after one piece of evidence, **`active`** after two
consistent pieces of evidence, and **`retired`** when contradicting evidence
drives confidence below 0.2.

## 4. Scoring

When `submit_outcome_feedback` arrives, the outcome is scored:

| feedbackType        | score |
|---------------------|-------|
| confirmed           |  +2   |
| slot_filled         |  +2   |
| price_accepted      |  +1   |
| abandoned           |  -1   |
| price_rejected      |  -1   |
| operator_overrode   |  -2   |
| golfer_complained   |  -2   |
| no_show             |  -2   |
| pace_issue          |  -3   |

## 5. Confidence update rule

SCP keeps a running confidence per fingerprint key. The update is a simple,
auditable exponential move — no statistics library, no opacity.

```
normalisedScore = clamp(score / 3, -1, +1)        // -3..+3  ->  -1..+1
direction       = normalisedScore                  // sign carries meaning

newConfidence   = clamp(
                    oldConfidence + LEARNING_RATE * (target - oldConfidence),
                    0, 1
                  )
```

where:

- `LEARNING_RATE = 0.34` (so two consistent overrides clear the 0.5 "active"
  line from a 0.0 start; this is what makes the demo's second request flip).
- For a **negative** outcome (override, complaint, pace issue), `target = 0` and
  the *lesson being strengthened* is the corrective lesson (e.g. "prefer 09:30"),
  not the original recommendation. The original recommendation's confidence
  decays toward 0; the corrective lesson's confidence climbs toward 1.
- For a **positive** outcome, `target = 1` for the recommended action's lesson.

`evidenceCount` increments by 1 on every outcome. Promotion from `suggested` to
`active` requires `evidenceCount >= 2` AND `confidence >= 0.5`.

## 6. The four learning behaviours (v1 scope)

1. **Operator preference.** Two `operator_overrode` outcomes on the same
   fingerprint key create an `active` operator-preference lesson carrying the
   `correctedValue`. Future matching decisions surface it as a warning and shift
   the recommendation to the corrected value.

2. **Pricing pattern.** Repeated `price_rejected` outcomes in a price window
   strengthen a pricing lesson that nudges future quotes upward toward what was
   accepted, or flags the window as discount-resistant.

3. **Pace pattern.** A `pace_issue` outcome (score -3, the heaviest) on a
   booking window strengthens a pace lesson fast — one pace issue lands a
   `suggested` lesson at confidence ~0.34, a second makes it `active`.

4. **Protected-inventory reinforcement.** Repeated public requests for a
   protected slot strengthen the *alternative* SCP offers, so the system gets
   faster and more confident at redirecting rather than re-evaluating.

## 7. The demo moment, mechanically

```
T0  check_booking_action  Saturday ~09:00, 4 players, public
        fingerprint key = ...|0900-0929|group|public|memberblock
        memory: no active operator-preference lesson on this key
        -> recommends 09:10, soft hold, riskLevel low
        -> writes DecisionEvent dec_A

T1  submit_outcome_feedback  dec_A  operator_overrode  correctedStartTime 09:30
        score -2
        -> corrective lesson "prefer 09:30" created, status=suggested,
           confidence ~0.34, evidenceCount 1

T2  check_booking_action  Saturday ~09:00, 4 players, public   (SAME KEY)
        memory: suggested lesson present
        -> 09:10 still technically available, but SCP now recommends 09:30,
           status=warning, reason cites prior operator feedback

   (a second override would promote the lesson to active, confidence ~0.56)
```

That T2 line is the entire pitch. Everything else in SCP Golf exists to make
that line true and trustworthy.
