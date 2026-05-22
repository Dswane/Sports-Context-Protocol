# SCP Golf — Roadmap

The alpha is Phase 1. The phases below are the path from a local demo to the
context layer every golf agent checks before it acts.

## Phase 1 — Local alpha  (this repository)
Synthetic course, local MCP server over stdio, booking and pricing safety,
soft holds, decision ledger, self-learning memory, tests, docs.

## Phase 2 — Hosted MCP + second course
Remote MCP over Streamable HTTP. API keys and basic auth. A persistent
database (Postgres) replacing the JSON files behind the same storage
interface. A decision-ledger view.

### How a second course plugs in (Phase 2 contract)

The alpha is hardcoded to a single course (`demo` → Harbor Ridge). Phase 2
makes the course id a routing parameter rather than a constant:

1. **Data layout.** Today every JSON file in `src/data/` is implicitly the
   `demo` course. Phase 2 namespaces them per course: `data/<courseId>/course.json`,
   `data/<courseId>/tee-sheet.json`, `data/<courseId>/booking-policy.json`,
   `pricing-policy.json`, `events.json`, `weather.json`, `pace.json`,
   `decision-ledger.json`, `learning-memory.json`, `soft-holds.json`. The same
   ten files per course; nothing new.
2. **Storage layer.** `src/core/storage.ts` gains a `courseId` argument on
   read/write helpers and resolves under `data/<courseId>/`. Every reader in
   `src/core/context.ts` is updated to take a `courseId` and forward it. No
   other file in `src/core/` needs to know that multiple courses exist.
3. **Tool surface.** Every tool already accepts `courseId` (defaulted to
   `demo`). Phase 2 removes the default and threads `courseId` into the calls
   it already makes — `getBookingPolicy(courseId)`, `getTeeSheet(courseId)`,
   etc. The MCP tool descriptions do not change.
4. **Fingerprint.** Already carries `courseId` as a key segment, so lessons
   stay per-course by construction. No migration of existing lessons is needed
   beyond namespacing the file path.
5. **Learning memory.** Per-course memory file; cross-course learning is
   explicitly deferred to Phase 5 and uses anonymised pattern transfer, not
   shared memory.

A new course is therefore a one-directory drop-in: ship its ten JSON files
under `data/<courseId>/`, and SCP serves it through the same nine tools and
eleven resources with no code change. This is the boundary that lets "SCP" be
described as a standard rather than a single-course implementation.

## Phase 3 — Real course shadow mode
A course uploads a tee-sheet export and its policies. SCP runs in
recommendation-only mode — no live bookings. Operators give feedback; the
learning memory adapts to that specific course. This is the first real proof
outside synthetic data.

## Phase 4 — Integrations
Tee-sheet provider APIs, weather APIs, POS / pricing systems, calendar and
event feeds. Voice, SMS, and booking agents call SCP before they act.

## Phase 5 — Cross-course learning
Anonymised patterns across courses. Course-type benchmarks. Preference
templates and recommended rule packs that a new course can start from.

## What stays constant across every phase
Before a golf agent acts, it checks SCP. Then SCP learns from what happened.
The decision fingerprint and the learning loop are the durable core; storage,
transport, and integrations are implementation details that change underneath
them.
