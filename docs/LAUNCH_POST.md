# Launch Post — Sports Context Protocol (SCP)

This is the canonical launch copy. The long version is the announcement
(blog / Substack / LinkedIn). The short version is the X/Twitter post. Use the
same framing in both: SCP is the thing, golf is the first proof. Never claim
"standard" — claim direction.

---

## Long version

**Sports Context Protocol: an open context layer for sports agents**

AI agents are about to start running real operations in sports. They will
answer the calls, book the inventory, quote the prices, move the reservations,
and recommend the decisions. Most of them will know the conversation. Almost
none of them will know the venue.

That gap is the problem. An agent that doesn't know what inventory is
protected, what rules apply, what an action costs operationally, or what
happened the last time a similar decision was made is not an assistant — it's
a liability with a friendly voice.

So I'm building **SCP — Sports Context Protocol**: an open context, safety, and
memory layer that a sports agent checks *before* it acts, and that learns from
the outcome *after*.

The bet underneath it is simple. Every sports venue, in every sport, has the
same five things: **inventory, rules, actions, consequences, and memory.** A
tee time, a court, a field window, a suite — all the same primitive. A member
block, a peak-hour cap, an event lockout — all the same primitive. SCP is a
standard way to expose those five things to an agent so its actions are safe
and accountable.

**The first profile is golf.** Golf is the cleanest possible wedge, because
golf makes the problem impossible to ignore. An agent cannot safely touch a
golf course without understanding tee-sheet state, protected member inventory,
league and outing blocks, pricing policy, pace-of-play risk, weather, approval
thresholds, and the operator's own learned preferences. Every one of the five
primitives is vivid and operationally real in golf on day one. A profile that
works for golf exercises the whole protocol.

SCP Golf — Profile 001 — is a working MCP server today. It runs on a synthetic
demo course: booking safety, pricing checks, pace context, soft holds, a
decision ledger, and the part that actually matters — a self-learning memory.

Here is the loop, end to end. A golfer asks for Saturday around 9 AM for four.
The agent checks SCP. SCP sees the member block ending at 8:50, the open public
inventory after it, the pricing policy, the pace risk, and recommends a safe
tee time. It logs the decision. Then an operator overrides it — "not that close
to the member block, offer 9:30." SCP records that. The next time a similar
request comes in, SCP recommends 9:30. It learned. No model training — it
learns the way an experienced starter learns, by remembering what happened the
last time.

That's the whole thesis: **before a sports agent acts, it checks SCP. Then SCP
learns from what happened.**

This is an alpha. Synthetic data. Booking safety first. No course partnerships,
no integrations, not live with any operator — and I'm not going to pretend
otherwise. What I want to find out is whether builders, sports-tech vendors,
and the people putting agents into sports operations recognise the need. If you
are building an agent that will touch a real sports operation, it needs a
context layer before it can be trusted. I think that layer should be open, and
I think it should be a standard. SCP Golf is the first proof.

Repo and specs: [link]. Tell me where this is wrong.

---

## Short version (X / Twitter)

AI agents are coming for sports operations — booking, pricing, moving
reservations. Most will know the conversation, not the venue.

Building SCP: Sports Context Protocol. An open context + memory layer an agent
checks before it acts.

Every venue has the same 5 things: inventory, rules, actions, consequences,
memory.

First profile is golf — the cleanest wedge. An agent can't safely book, price,
or move anything at a course without knowing tee-sheet state, protected
inventory, pace risk, and operator memory.

It's a working MCP server. Ask for Sat 9AM → agent checks SCP → operator
overrides → next time SCP recommends the operator's preferred time. It learns
from outcomes, no model training.

Alpha. Synthetic data. Booking safety first. Not partnered, not live — telling
you straight.

If you're putting agents into sports ops, they need a context layer first. I
think it should be open. [link]

---

## Framing rules — do not break these

- **Never say "standard" as a claim.** Say "I think it should be a standard,"
  "built to be a standard." Standard is earned by adoption, stated after, never
  before.
- **Lead with SCP, golf second.** "I built a golf MCP" is the wrong post. "I'm
  building SCP, first profile is golf" is the right one.
- **Be honest about stage.** Alpha, synthetic data, not partnered, not live.
  The honesty is credibility; skipping it reads as the hype it isn't.
- **The differentiator is open + MCP-native**, not "first to think of it."
  Others are circling this. Say plainly: this should be open infrastructure.
- **End by asking, not asserting.** "Tell me where this is wrong" invites the
  builders and vendors whose reaction is the actual signal you're launching to
  get.
