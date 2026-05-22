# Claude Code — Hardening Tasks for SCP Golf

This is a **scoped punch list**, not an invitation to rebuild. The repo
compiles, all 17 tests pass, and the live MCP server works over stdio. Do not
regenerate working code. Edit this passing build.

## Hard constraints — read before touching anything

- **Never write to stdout.** stdio transport uses stdout for JSON-RPC. All logs
  go to stderr (see `log()` in `src/index.ts`).
- **Do not change the decision fingerprint key field order** in
  `src/core/fingerprint.ts`. It is the learning-loop contract. Changing it
  silently breaks every stored lesson.
- **Do not reimplement the learning loop.** Operational learning only — no
  model training, no embeddings.
- Run `npm run typecheck` and `npm run test` after every change. Both must stay
  green. 17/17 is the baseline.

## Launch-blocking tasks (do these)

1. **Resolve the stubbed approval rule.** `src/core/policies.ts` has
   `void requiresApproval` — the inside-30-minutes rule is declared but never
   fires because the demo date is fixed. Either (a) wire it to real wall-clock
   time and test it, or (b) remove it from the booking policy and docs so there
   is no claimed-but-dead feature. Pick one; do not leave it stubbed.

2. **Add an MCP `server.json` manifest** at the repo root so SCP Golf can be
   submitted to MCP registries. Registry presence is the distribution channel.
   Follow the current MCP server manifest schema.

3. **Document the second-course path.** The alpha is hardcoded to course
   `demo`. That is fine to ship, but `docs/ROADMAP.md` or `SCP_GOLF_SPEC.md`
   must state plainly how a second course would plug in (Phase 2). Someone will
   ask the moment SCP is described as a standard.

4. **Add a `LICENSE` file.** `package.json` says MIT; ship the actual file.

## Polish tasks (do if time)

5. Add a `tests/server.e2e.test.ts` that boots the compiled server over stdio,
   lists tools/resources/prompts, and runs the override → re-request magic
   moment through real JSON-RPC. The logic is already proven manually; this
   locks it into CI.

6. Add an `npm run demo` script that runs the full T0 → T1 → T2 sequence and
   prints the result, so the magic moment is one command for a screen
   recording.

7. Confirm `npm run build` copies `src/data` into `dist/data` (the build script
   already does this — verify it survives any change).

## Do NOT do

- Do not rename the repo or the package in this session (deferred decision).
- Do not refactor the golf types to be generic. SCP Golf stays golf-shaped at
  the code level; the protocol altitude lives in the docs. Premature
  abstraction here adds risk for no launch benefit.
- Do not add real course data, integrations, auth, or a database. Those are
  later phases.

## Definition of done

`npm run typecheck` clean, `npm run test` green, the live server boots and runs
the magic moment, tasks 1–4 complete, and the docs make no claim the code does
not back up.
