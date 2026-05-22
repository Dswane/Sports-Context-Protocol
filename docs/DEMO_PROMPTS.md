# SCP Golf — Demo Prompts

Ten prompts to use once the server is connected to an MCP client. They walk
from a simple booking to the self-learning payoff.

### 1. Book four players around 9 AM Saturday
> Use SCP Golf to help a golfer book four players around 9 AM on Saturday,
> June 6, 2026.

Expected: SCP checks inventory, avoids protected member inventory, finds an
available ~09:1x slot, explains it safely, recommends a soft hold, logs the
decision.

### 2. Check whether 8:10 AM is bookable for the public
> Can a public agent book 8:10 AM for four players?

Expected: blocked. Golfer-safe explanation. SCP offers the next available slot
at or after the request (09:00).

### 3. Suggest the best twilight time
> What is the best twilight tee time available?

Expected: an available slot in the 15:00-17:30 window, low pace risk.

### 4. Check a discount below the price floor
> Can the agent offer 4 PM for $40?

Expected: blocked — below the $45 absolute floor. SCP recommends $45.

### 5. Create a soft hold
> Create a soft hold for 09:10 for four players.

Expected: a soft hold id and a 10-minute expiry; the tee sheet slot becomes
soft_hold.

### 6. Explain a blocked member time to a golfer
> Explain to the golfer why 8:10 AM is not available.

Expected: simple, friendly language with no internal policy terms, plus an
alternative.

### 7. Generate an operator morning briefing
> Give me the operator morning briefing for Saturday, June 6.

Expected: inventory risks, protected blocks, pricing notes, weather, pace
risks, learning insights, recommended actions.

### 8. Check a Saturday morning discount
> Can the agent offer 9 AM for $80 on Saturday?

Expected: allowed in principle but requires operator approval — Saturday
morning discount rule.

### 9. Submit operator-override feedback
> Submit feedback that the operator overrode the 9:10 recommendation and
> preferred 9:30 because it was too close to the member block.

Expected: the decision is updated, learning memory gains an operator-preference
lesson, and SCP reports the new insight.

### 10. Ask again — the magic moment
> Now ask again for four players around 9 AM Saturday, using SCP Golf's
> learning memory.

Expected: SCP remembers the override. It notes 09:10 is technically available
but recommends 09:30 based on prior operator feedback. **This is the demo.**
