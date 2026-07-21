# Progress

Last updated: after the project owner playtested Phase 9 (Weapon Physics Polish) and requested one more round of changes before approving it — Gravity, randomized initial weapon rotation, a fix for a genuine bug (2-player matches structurally never saw a weapon↔weapon collision), and a weapon-collision robustness pass (a "must fully leave" cooldown plus sub-stepped anti-tunnelling detection). See "Post-Phase-9 Playtesting Follow-up," under Current Phase below, for the full account. This follow-up is implemented and verified, same as Phase 9 itself was, but — per Roadmap.md's Development Rules ("Never continue to the next milestone without approval") — Phase 9 as a whole is still not marked approved here; that requires the project owner's own review.

**Update — Phase 7 approved.** The project owner has reviewed Phase 7 directly and tested it, with no errors. Phase 7 (Color Expansion Skills) is now considered complete, joining Phases 1–6 as fully approved work.

**Update — Pre-Phase 8 cleanup session:** three small, documentation/naming-only changes were made after Phase 7 was implemented, at the project owner's request, directly responding to the Phase 7 review's own "architectural weaknesses" findings. None of them touch gameplay. See "Pre-Phase 8 — Architecture Cleanup," under Completed Phases below, for the full account.

**Update — Pre-Phase 8 Physics Primitive Architecture session:** following Phase 7's approval, the project owner requested a firmer architectural rule for the still-unimplemented `engine/core/Physics.ts`: it must operate only on generic geometric primitives (`Vector2`, `Circle`, `Segment`) and generic operations on them (Collision, Bounce, Reflection, Sweep Test, Intersection) — never on simulation concepts like Player, Weapon, Enemy, or Projectile. See "Pre-Phase 8 — Physics Primitive Architecture," under Completed Phases below, for the full account. No code was written this session — `Physics.ts` remains an empty placeholder, exactly as before — this only sharpens the boundary the earlier Pre-Phase 8 cleanup session had already agreed to in principle.

**Update — Pre-Phase 8 Weapon Clash Simulation Loop Design session:** immediately after the Physics Primitive Architecture session, the project owner and Claude settled the full per-tick simulation loop for Weapon Clash — the exact step order, which parts belong to `engine/core/Physics.ts` versus `src/simulations/WeaponClash/`, a redefinition of Hit Feedback into a proper Hit Freeze hit-stop mechanic, and the flow governing player velocity (chosen once at spawn, never re-decided, only ever modified by collision response). See "Pre-Phase 8 — Weapon Clash Simulation Loop Design," under Completed Phases below. No code was written this session; `docs/WeaponClash.md` was updated to reflect the agreed design ahead of implementation, and the one open judgment call (whether a frozen player blocks as a static obstacle or is excluded from collision entirely) has since been resolved — a frozen player blocks as a static obstacle — see "Pre-Phase 8 — Weapon Clash Simulation Loop Design" below.

**Update — Phase 8 approved, including Constant Movement Speed.** The project owner reviewed Phase 8 (Weapon Clash MVP) together with the Pre-Phase 9 Constant Movement Speed addition (see below) and approved both. No implementation changes were requested — the sole follow-up was documentation/comment clarification of the zero-velocity fallback's intent (see "Pre-Phase 9 — Constant Movement Speed" below for the exact wording change). Phase 8, in full, now joins Phases 1–7 as approved work.

## Current Phase

**Phase 9 — Weapon Physics Polish — implemented and verified; awaiting project owner review.** See "Phase 9 — Weapon Physics Polish" below for the original account, and "Post-Phase-9 Playtesting Follow-up" immediately below for a further round of changes made after the project owner playtested it, before final approval.

### Post-Phase-9 Playtesting Follow-up

Requested by the project owner after playtesting Phase 9 directly, as a final pass before approving it. Four items, in the order implemented:

#### 1. Gravity

A very small, constant downward acceleration, added to `WeaponClashConfigShape` as `gravityPixelsPerSecondSquared` (placeholder default: `25`). Applied in `update()`'s Step 1c, to velocity *direction* only, via a new `applyGravity` helper — added to `player.velocity` before that tick's movement and wall reflection, exactly like the existing wall-Reflection/Bounce responses already modify velocity direction ahead of Step 4's constant-speed renormalization. Because Step 4 (`enforceConstantMovementSpeed`) unconditionally re-normalizes every non-frozen player's velocity back to the exact configured `movementSpeedPixelsPerSecond` every tick regardless of what happened earlier that tick, Gravity's raw contribution to magnitude is always discarded — its only lasting effect is to curve trajectories, never to speed a player up or slow them down. Skipped for frozen players (folded into the same `isFrozen` guard that already skips movement and weapon rotation for them), consistent with Hit Freeze's "No movement."

**Architectural decision: kept inside `WeaponClash.ts`, not added to `Physics.ts`.** Physics.ts's own standing rule (Architecture.md, Physics) is that it holds only genuinely simulation-agnostic geometry/collision primitives, and never simulation-specific gameplay decisions. Gravity here is a *chosen force* specific to this one simulation (like its constant movement speed, or its rotation speed), not a generic collision primitive — so it belongs in `WeaponClash.ts`'s own `update()`, built from `shared/Vector2.ts`'s existing `add`/`scale`, exactly the same placement logic that already keeps `enforceConstantMovementSpeed` and `randomUnitVector` there instead of in `Physics.ts`.

**Safeguard: capped vertical-velocity fraction, not just "should be fine in practice."** The request was explicit that players "must... never end up resting at the bottom of the arena." Since a player's speed can never reach exactly zero (already guaranteed — see Movement Speed), literal rest was already structurally impossible; the real risk was a player's *direction* drifting arbitrarily close to straight down/up over many consecutive, uninterrupted ticks, leaving it bouncing in a near-purely-vertical line with negligible horizontal drift — which, while not literal "rest," would look and feel like it. Rather than rely on player/weapon collisions to reliably interrupt this often enough in practice, a structural cap was added: `MAX_GRAVITY_VERTICAL_SPEED_FRACTION = 0.9` (an internal correctness constant, not a Config/balance value — mirrors `STATIC_OBSTACLE_MASS`'s own placement logic) limits how much of a player's total speed Gravity's vertical pull may ever claim, guaranteeing a persistent, non-negligible horizontal component always remains, every tick, regardless of how many uninterrupted ticks pass.

**Verified directly**, not just asserted: a 10-simulated-minute headless run (2 players, seed 7) found players spent only 2.1% of ticks within 5px of the bottom wall, with the longest unbroken streak there being 11 ticks (0.18 simulated seconds) — nowhere close to "resting." A separate 9-seed/roster-combination smoke test (see Verification below) additionally asserted, every tick, that every non-frozen, non-eliminated player's velocity magnitude stayed within 0.5 px/s of the exact configured `movementSpeedPixelsPerSecond` — confirming Gravity never leaks into overall speed.

#### 2. Randomized initial weapon rotation direction (and a necessary further fix: initial weapon angle)

Requested: randomize each player's initial weapon rotation direction (clockwise/counter-clockwise) from the seeded RNG. Implemented in `createInitialState`: a `random.chance(0.5) ? 1 : -1` draw per player (in the same fixed player-slot processing order every other per-player RNG draw already uses), multiplied by the Config's `rotationSpeedRadiansPerSecond` magnitude to produce that player's signed starting `rotationSpeed`.

Investigating item 3 (below) surfaced that this alone would only be a **partial** fix for the 2-player bug it was meant to help with — see item 3's own account for why initial weapon *angle* also had to be randomized, not just direction, to fully and unconditionally resolve it. Both draws were added together, in this fixed order (position → velocity angle → weapon angle → rotation direction) per player, per `createInitialState`'s own updated doc comment.

**This changes deterministic outcomes for previously-recorded seeds** (any given seed now consumes the RNG stream differently and so produces a different initial state than before this session) — expected and consistent with every previous phase's own gameplay changes; the determinism *guarantee* itself (same seed → same result, on any given version of the code) is unaffected, and was re-verified (see Verification below).

#### 3. Fixed a genuine bug: 2-player matches never saw a weapon↔weapon collision

**Root cause, confirmed by direct inspection before writing any fix:** every player spawned with the same fixed weapon angle (`0`, a Phase 8 judgment call — "simplest deterministic choice," since WeaponClash.md doesn't specify one) and the same fixed positive `rotationSpeedRadiansPerSecond`. Two weapons that start at the same angle and rotate at the exact same signed speed stay at *exactly* the same angle forever — and two truly parallel (non-collinear) line segments can never intersect, as a matter of Euclidean geometry, no matter how their two pivot points move. This is not a flaw in `segmentSegmentIntersect`'s handling of the parallel case (parallel, non-collinear segments genuinely never cross — the function's existing behavior there is correct); the bug was in the spawn configuration making that parallel state *permanent* rather than a fleeting, incidental one.

A direct headless check confirmed this before any fix was written: a 2-player match (seed 1), inspected after 600 ticks (10 simulated seconds), showed both players' `weaponAngle` at the exact same value (`59.5000...`, diff `0`) — not approximately equal, *identical*, floating-point bit for bit.

**Why this specifically, and only reliably, affected 2-player matches.** In a 2-player match, the only pair in the match always freezes *together* whenever either lands a hit on the other (Hit Freeze applies to both attacker and victim of the same event) — so nothing ever knocks their weapons out of phase with each other; both pause and resume rotating in perfect lockstep, indefinitely. In 3–4 player matches, the same permanently-parallel trap existed at spawn for every pair too, but a hit between any *two* players leaves every *other* player's weapon rotating on, unaffected — introducing phase drift between the frozen pair and that third player (though not between the frozen pair *and each other*, who remain in lockstep with each other even through repeated mutual freezes). With enough distinct pairs and asynchronous freeze events, 3–4 player matches would eventually desynchronize most pairs by chance; a 2-player match, having only one possible pair, never had that chance.

**The fix:** both initial weapon angle and initial rotation direction are now randomized independently per player (see item 2 above). Randomizing direction alone would only have made the bug *less likely* (still ~50% chance any given pair rolls the same direction, in which case they'd remain permanently parallel exactly as before). Randomizing starting angle is what makes the fix unconditional: any two players' weapons are now only ever at the exact same relative angle at isolated, momentary instants (probability zero with a continuous RNG draw) rather than permanently, for every player count.

**This revises a Phase 8 judgment call.** `weaponAngle: 0` for every player was previously documented (Progress.md, "Phase 8 — Weapon Clash MVP," judgment calls) as a deliberate, considered simplification with "no documented gameplay effect." That reasoning did not anticipate this specific structural consequence, and is superseded by the fix described here — flagged explicitly rather than silently overwritten, per this project's own established practice of tracking revised judgment calls.

**Verified directly:** after the fix, the same seed=1 2-player match check was re-run and produces a different, non-degenerate initial angle pair (and every seed tested — 1 through 999 — showed a distinct, nonzero angle relationship after 600 ticks, even for the seeds that happened to draw the same rotation *direction* for both players, confirming the angle randomization alone is sufficient). The 9-combination smoke test (see Verification below) additionally confirms 2-player matches now do register weapon↔weapon collision events (230–540 per match, comparable in kind to 3–4 player matches), where every single 2-player run previously showed exactly zero.

#### 4. Weapon collision robustness: "sticking" and tunnelling

Two related correctness improvements to Weapon Collision (weapon↔weapon), both flagged as open items in the original Phase 9 session's own Todo.md and now addressed:

- **"Sticking" (repeated bounce+reversal every tick while still overlapping).** A new `activeWeaponCollisionIds: Set<string>` field on `WeaponClashPlayerState` tracks, symmetrically, which other players' weapons a given player's weapon is *currently* locked in contact with — directly mirroring `activeWeaponHitIds`'s existing "must fully leave before hitting again" pattern for Weapon Hit, applied to Weapon Collision instead. On first contact, both players' sets are updated and the bounce+reversal response fires once; on every subsequent tick the segments are still found intersecting, the response is skipped (cooldown); the moment they're no longer intersecting, both entries are cleared, ready for a fresh contact later. Without this, a pair whose overlap persisted for several consecutive ticks would flip `rotationSpeed`'s sign back and forth *every* tick — directly observed in this session's own prior verification data (the Phase 9 smoke test's one non-terminating 4-player/seed-1 run showed 120,584 rotation-sign flips across 72,000 ticks, more than 1.5 per tick on average — a strong signature of exactly this oscillation, not ordinary gameplay).

- **Tunnelling.** No true continuous (closed-form) collision test is implemented for two independently rotating *and* translating segments — unlike player↔player collision's circles (moving at constant velocity, with a clean closed-form quadratic solution — see `sweepCircleCollision`), two segments each simultaneously translating and rotating have no equally simple closed form, and implementing one was judged disproportionate to this project's stated "never overengineer" design philosophy. Instead, detection is now **sub-stepped**: `WEAPON_COLLISION_SUBSTEPS = 4` (an internal correctness/cost tradeoff constant, not a Config value) sample points are taken across each tick's motion, linearly interpolating both position and weapon angle between their pre-tick and post-tick values at each sample, with the segment-intersection test run at every one. A tick is treated as a collision if *any* sample intersects. This meaningfully reduces, without perfectly eliminating, the chance that two fast-moving, fast-rotating weapons cross paths entirely between one tick's single end-of-tick check and the next — an honest mitigation, documented as such (not oversold as a rigorous guarantee) in both `WeaponClash.ts`'s own comments and `docs/WeaponClash.md`.

**"Overlapping," the third named edge case, was concluded to already be adequately addressed by the existing response** rather than needing a new mechanism: unlike two circles, two rotating segments attached to independently-moving pivot points have no single well-defined "push apart along a normal" the way `correctCircleOverlap` does for circles — the existing response (bouncing the two *players'* circles apart, which is what actually separates their weapons, since a weapon has no existence independent of its wielder's position) was judged the correct, already-implemented interpretation, now made reliable by fixing detection (parallel/lockstep bug) and preventing re-triggering (cooldown) above. No additional positional-correction primitive was added for weapons specifically.

**Verified directly:** the same 9-combination smoke test (below) shows determinism fully intact after this change, and — notably, though not a targeted fix — the previously-unresolved 4-player/seed-1 match (which failed to terminate even after 90 simulated minutes in the original Phase 9 verification) now resolves in roughly 3,400 ticks (well under a minute of simulated time). This is consistent with, though not conclusive proof of, the cooldown fix eliminating the oscillation that was very likely contributing to that stall (see the "sticking" bullet above) — flagged honestly as an observed side effect, not a guaranteed general fix for stalemates at other, future placeholder values (see Todo.md).

#### Verification (this follow-up)

Re-ran the same category of checks as the original Phase 9 session, with real `tsc -b`/`oxlint`/`vite build` access, plus fresh headless smoke tests targeting this round's specific changes:

- `tsc -b` — clean, no errors.
- `oxlint` — clean, no errors or warnings.
- `vite build` — completed successfully.
- **Diagnostic check (pre-fix):** confirmed the root cause of item 3 directly — a 2-player match's weapon angles were bit-for-bit identical after 600 ticks.
- **Diagnostic check (post-fix):** the same check across seven seeds (1–999) now shows a distinct, non-degenerate angle relationship in every case.
- **9-combination smoke test** (2/3/4 players × 3 seeds each, mirroring the original Phase 9 smoke test): determinism held in every case with no exception (byte-identical final state across repeated runs of the same seed). Every 2-player run now shows nonzero weapon↔weapon collision events (230–540), where every 2-player run previously showed exactly zero. All 9 combinations completed naturally within the 20-simulated-minute window this time (previously, one combination — 4 players, seed 1 — failed to terminate even after 90 simulated minutes; see the Todo.md note on this). Every non-frozen, non-eliminated player's velocity magnitude was asserted, every tick, to stay within 0.5 px/s of the exact configured movement speed (confirming Gravity never leaks into overall speed), and no `NaN` or out-of-bounds position ever occurred.
- **Bottom-wall "resting" check:** a dedicated 10-simulated-minute, tick-by-tick check (2 players, seed 7) found players within 5px of the bottom wall only 2.1% of the time, with the longest unbroken streak there being 0.18 simulated seconds.

**Files changed this follow-up:** `src/simulations/WeaponClash/WeaponClash.ts` (gravity, randomized spawn angle/direction, weapon-collision cooldown, sub-stepped detection), `src/simulations/WeaponClash/Config.ts` (new `gravityPixelsPerSecondSquared`), `docs/WeaponClash.md` (new Gravity section; updated Weapon Rotation, Weapon Collision, and Simulation Loop sections), `docs/Todo.md`, `docs/Progress.md` (this file). `Physics.ts` was deliberately **not** changed — every fix in this round is a `WeaponClash.ts`-level gameplay/detection decision, not a new generic geometry primitive (see item 1's architectural-decision note above for gravity specifically).

**Not changed:** ColorExpansion, the engine, shared UI, and every other part of Weapon Clash not named above (HP/damage mechanics, elimination, Hit Freeze's own duration/mechanism, Weapon Hit's cooldown, player-body collision's core response) — per the request's own "avoid changing unrelated gameplay."

**Awaiting the project owner's own review and approval of Phase 9 (including this follow-up) before Phase 10 begins**, per Roadmap.md's Development Rules.

### Phase 9 — Weapon Physics Polish

Implemented in dependency order, per the project owner's explicit request: Physics primitives first, then Weapon Clash gameplay built on top of them, then Hit Freeze/damage flash, then verification.

**Scope reminder.** Roadmap.md's Phase 9 item list: No player overlap, No weapon overlap, No tunnelling, Weapon bounce, Reverse weapon rotation, Hit freeze, Damage flash. All seven are implemented this session. Weapon Clash's own Character Skills remain out of scope (Phase 10, unchanged).

#### 1. Physics primitives (`src/engine/core/Physics.ts`)

Three additions, all pure functions operating only on `Vector2`/`Circle`/`Segment` — `Physics.ts` remains completely simulation-agnostic, per Architecture.md's Physics section (updated this session to describe them) and the Pre-Phase 8 Physics Primitive Architecture session's own rule:

- **`sweepCircleCollision(a, velocityA, b, velocityB, deltaTime)`** — continuous (swept) circle×circle collision detection. `circleCircleCollision` only samples positions at a single instant, so a fast-enough pair can tunnel through each other within one tick without ever overlapping at either the tick's start or end. This solves, in `b`'s frame relative to `a`, the quadratic `|relativePosition + relativeVelocity·t|² = (a.radius + b.radius)²` for the smallest non-negative `t`, returning whether/when/where (as a contact normal) the two circles first touch within `[0, deltaTime]`. Detection only — no response computed, matching `circleCircleCollision`'s own division of labor.
- **`correctCircleOverlap(a, b)`** — a new primitive category beyond the original Pre-Phase 8 vocabulary (Collision/Bounce/Reflection/Sweep Test/Intersection): a *positional* separation response for two already-overlapping circles, splitting the correction between them in proportion to the *other* circle's mass (mirroring `bounceCircles`' own mass-weighting), so an effectively-infinite-mass circle (a frozen player, see below) is corrected by a negligible amount. None of the original five categories computes a position change — Bounce and Reflection are both velocity-only responses — and "No player overlap"/"No weapon overlap" specifically need one. Flagged here as an addition to the agreed vocabulary, the same way every other judgment call in this file is flagged.
- **`segmentSegmentIntersect(a, b)`** — discrete segment×segment intersection (the weapon↔weapon hit test), via the standard parametric-line two-cross-product solution. Detection only. Parallel (including collinear-overlapping) segments are reported as non-intersecting — two rotating, finite-length weapons landing exactly parallel at the instant of a discrete per-tick check is a measure-zero case, not worth a dedicated collinear branch.

**`src/shared/Vector2.ts`** gained `cross(a, b)` (the 2D scalar cross product, `a.x*b.y - a.y*b.x`), `segmentSegmentIntersect`'s first consumer — mirroring how `Math.ts`'s scalar helpers and the rest of `Vector2.ts` are placed (Architecture.md, `/src/shared`).

**Judgment call — no continuous sweep test for segments.** The task separated "sweep tests" from "segment–segment collision" as distinct primitives, and only player↔player collision (circles) got a continuous version this session. A true continuous sweep for two independently rotating *and* translating segments has no simple closed-form solution (unlike two circles moving at constant velocity) — implementing one would be disproportionate to this project's stated Design Philosophy ("keep solutions simple... never overengineer") for a content-generation tool, not a rigor-critical physics engine. Weapon↔weapon tunnelling prevention instead relies on the discrete per-tick `segmentSegmentIntersect` check, which is a reasonable approximation at this simulation's documented rotation speeds and 60Hz tick rate but not an airtight guarantee. Flagged in `docs/WeaponClash.md`'s Weapon Collision section and in `docs/Todo.md`.

#### 2. Weapon Clash gameplay (`src/simulations/WeaponClash/WeaponClash.ts`)

`update()` was rewritten to implement the full 8-step Simulation Loop from `docs/WeaponClash.md` (previously only Phase 8's reduced subset, plus the Pre-Phase 9 Constant Movement Speed step):

1. **Advance freeze timers** — every non-eliminated player's `freezeRemainingMs` (new field on `WeaponClashPlayerState`) counts down by `deltaTimeMs`, clamped at 0. Runs first, so a freeze expiring exactly this tick already allows that player to act again this same tick (see Hit Freeze — "the simulation simply resumes").
2. **Weapon rotation + movement/wall collision** — unchanged from Phase 8, but now skips any player for whom `isFrozen(player)` (a new local helper, `freezeRemainingMs > 0`) is true.
3. **Resolve Player Collisions** — a genuine behavior change from Phase 8. A frozen player now participates as a static, infinite-mass obstacle (via a new `toCollisionCircle` helper, which assigns a frozen player's `Circle` a `mass` of `STATIC_OBSTACLE_MASS = 1_000_000`) rather than being silently skipped — matching the Pre-Phase 8 design session's own resolved judgment call and WeaponClash.md's Player Collision/Hit Freeze sections (see the documentation judgment call below). Two simultaneously-frozen players are skipped outright (neither can move; nothing to resolve). For each remaining pair: the existing discrete `circleCircleCollision` check runs first, unchanged in spirit from Phase 8's own Bounce call but now also calling the new `correctCircleOverlap` for a positional correction alongside the velocity one. If the discrete check finds no overlap, a **second, new check** runs `sweepCircleCollision` using each player's *pre-Step-2* position (captured in a `previousPositions` map before any movement happens this tick) and this tick's velocity — this is the anti-tunnelling path. On a swept collision, both players are repositioned to where they actually were at the computed time of impact (along their pre-bounce velocity), then given their post-bounce velocity, so the remainder of that tick's travel resumes next tick rather than being simulated within the same one. In every case, a frozen player's own velocity and position are explicitly left untouched (guarded by `isFrozen` checks around each assignment) regardless of what the mass-weighted formulas compute — exact, not merely approximate, immobility.
4. **Resolve Weapon Collisions** — entirely new. For every pair of non-eliminated, non-frozen players, their weapon `Segment`s (via the existing `getWeaponSegment`) are checked with the new `segmentSegmentIntersect`. On intersection: the two players' `Circle`s are bounced apart via the existing `bounceCircles` ("Bounce players apart"), and both players' `rotationSpeed` is negated ("Reverse both weapon rotation directions"). A frozen player is excluded from this step entirely (checked at the top of both loops), unlike Step 3's static-obstacle treatment — this distinction is explicit in WeaponClash.md's own Weapon Collision vs. Player Collision sections.
5. **Normalize Movement Speed** — the existing `enforceConstantMovementSpeed` (from the Pre-Phase 9 session) now also skips any frozen player, so a frozen player's velocity stays exactly what it was the instant it froze rather than being rescaled to full speed in a stale direction.
6. **Resolve Weapon Hits** — the existing Phase 8 logic, with frozen-player exclusions added: an already-frozen attacker or victim is skipped outright; if an attacker's own hit freezes it mid-pass (hitting one victim can freeze the attacker itself), the inner loop `break`s before checking any further victims that same tick — "cannot be involved in any further hit... including later in the same tick the freeze was triggered." On a successful (new-contact) hit, both attacker and victim now have `freezeRemainingMs` set to `hitFreezeDurationMs` (new Config value, 100ms) in addition to the existing damage/cooldown bookkeeping.
7. **Update statistics / remove eliminated** — unchanged from Phase 8.

**`src/simulations/WeaponClash/Config.ts`** gained `hitFreezeDurationMs: 100` — not a placeholder, like `startingHp`/`baseDamage`: WeaponClash.md states "0.1 seconds" literally.

**Damage flash.** `mapWeaponClashStateToRenderables` now sets a new `isFlashing: isFrozen(player)` field on each `RenderableCharacter`. `engine/rendering/Renderer.ts`'s `RenderableCharacter` interface gained this same optional field (used by both `renderFrame` and `renderCircleFrame`, defaulting to falsy/unused for simulations with no such concept), and `engine/rendering/CharacterRenderer.ts`'s `drawCharacter` gained an `isFlashing` parameter, filling with a new `HIT_FLASH_COLOR` constant (white) instead of the character's own color when true. Because `isFlashing` is computed directly from `freezeRemainingMs > 0`, the flash and the freeze always start and end on exactly the same tick, by construction — no separate timer was introduced for it.

**Documentation judgment call — resolving a pre-existing ambiguity.** WeaponClash.md's Simulation Loop section previously summarized Step 2 (Player Collision) as "between non-frozen players only," which directly contradicts that same document's own, more detailed Player Collision and Hit Freeze sections (and the Pre-Phase 8 design session's explicitly resolved judgment call), both of which describe a frozen player participating as a static obstacle rather than being excluded. This implementation follows the more detailed, explicitly-designed sections — they are unambiguous about the actual mechanism ("giving a frozen player's Circle an effectively infinite mass") — and this session corrected the Simulation Loop's terse summary in `docs/WeaponClash.md` to match, rather than silently picking one interpretation without a paper trail. Weapon Collision and Weapon Hits, by contrast, really do exclude a frozen player entirely, exactly as their own sections already stated with no contradiction.

**Other judgment calls made this session** (flagged for review, same practice as every prior phase):

- **No "must fully leave" cooldown for weapon↔weapon collision.** WeaponClash.md documents this cooldown explicitly for Weapon Hit, but not for Weapon Collision. Implemented literally as documented (no cooldown invented) — a pair of weapons whose overlap persists across several consecutive ticks will bounce and reverse rotation every one of those ticks. Flagged in `docs/Todo.md` rather than silently adding an undocumented cooldown rule.
- **`STATIC_OBSTACLE_MASS = 1_000_000`**, not a literal `Infinity`. A very large finite mass keeps `bounceCircles`'/`correctCircleOverlap`'s arithmetic well-behaved (no `Infinity`/`NaN` propagation risk) while making the frozen player's own computed velocity/position change negligible — and this implementation additionally guards every assignment back to a frozen player with an explicit `isFrozen` check, so the frozen player is exactly, not just approximately, unaffected regardless of what the mass-weighted math alone would produce.
- **Swept-collision repositioning stops each player at the time of impact** rather than attempting to simulate the remainder of that tick's motion after the bounce within the same tick (sub-stepping). Simpler, and matches how the rest of this engine already treats a single tick as one atomic unit of motion; the remaining travel simply resumes next tick under the new post-bounce velocity.

#### 3. Hit Feedback

Covered above (Hit Freeze in Weapon Clash gameplay's Step 1 and Step 6; damage flash in the rendering paragraph above). Implemented exactly as `docs/WeaponClash.md` already specified — no new mechanic beyond what that document described going in.

#### 4. Verification

**A departure from Roadmap.md's stated assumption, worth flagging explicitly:** Roadmap.md's Development Rules say "Claude has no network access in this environment and cannot run `tsc -b`, `oxlint`, or `vite build` itself." In this session, Claude *did* have working network access to the npm registry and ran all three directly, plus a headless determinism smoke test, rather than only deferring them to the project owner. The commands and their outcomes are recorded below for the project owner's own review — this does not replace the project owner's own verification and approval (per "Never continue to the next milestone without approval"), it's additional evidence gathered this session.

- `npm install` — completed cleanly against the existing `package.json` (no new dependencies were added to it; a temporary, non-persisted `tsx` was fetched via `npx` solely to run the headless smoke test below, and is not part of any delivered file).
- `tsc -b` — clean, no errors.
- `oxlint` — clean, no errors or warnings against the existing `.oxlintrc.json`.
- `vite build` — completed successfully.
- **Headless determinism smoke test** (ad hoc script, not part of the delivered files — same practice as Phase 6/7/8's own smoke tests): ran full Weapon Clash games for 2, 3, and 4 players across multiple seeds (9 roster/seed combinations total). **Determinism held in every single case with no exception**: the same seed and roster produced byte-identical final HP, position, velocity, and rotation speed on repeated runs, including for the two long-running matches described below. No `NaN` ever appeared and no player ever left the arena bounds. Hit Freeze fired and resolved correctly (freeze start/end ticks were identical across repeated runs of the same seed), and weapon↔weapon collision's rotation reversal fired as expected without introducing any nondeterminism (it reads only already-deterministic per-tick state and never touches the seeded RNG).

- **A genuine finding, not a Phase 9 bug: two of the nine runs took far longer than expected to resolve.** 7 of 9 combinations finished within the 20-simulated-minute window used in prior phases' own smoke tests. One (2 players, seed 42) finished shortly after, at ~20.7 simulated minutes. The fourth (4 players, seed 1) was extended to a 90-simulated-minute cap and *still* had not resolved, stuck at 2 remaining players. Diagnosing this: the last two survivors settle into a stable, nearly-periodic orbit around each other, bouncing off the arena walls and each other at a nearly constant separation of **~139–140px** — and the maximum distance at which either player's weapon can reach the other's body is `playerRadius + weaponLength + playerRadius` = `18 + 100 + 18` = **136px** at today's placeholder Config values. The two players are, deterministically, orbiting just barely outside each other's weapon range, indefinitely. This is a consequence of the existing constant-movement-speed elastic-bounce physics (unchanged in spirit since Phase 8/Pre-Phase 9) combined with today's specific `playerRadius`/`weaponLength`/`movementSpeedPixelsPerSecond` placeholder values — not something Phase 9's own additions (Hit Freeze, weapon↔weapon collision, sweep test, overlap correction) caused. It is also not new in kind: Phase 8's own verification already noted "weapon↔player contact was so rare a 2-player match sometimes didn't resolve within 20 simulated minutes" (see Todo.md, Balance) before any of Phase 9's mechanics existed — this is a more extreme instance of that same already-flagged placeholder-balance issue, now confirmed to be capable of producing an effectively permanent stalemate for at least one seed/roster combination. Not fixed here: no anti-stalemate mechanic is documented anywhere in WeaponClash.md, and inventing one would violate docs/CLAUDE.md's "Do not invent behaviour... ask for clarification." Flagged in `docs/Todo.md` with the concrete numbers above, for the project owner's consideration alongside the other already-open balance placeholders.

**Files changed this session:** `src/engine/core/Physics.ts`, `src/shared/Vector2.ts`, `src/simulations/WeaponClash/WeaponClash.ts`, `src/simulations/WeaponClash/Config.ts`, `src/engine/rendering/Renderer.ts`, `src/engine/rendering/CharacterRenderer.ts`, `docs/WeaponClash.md`, `docs/Architecture.md`, `docs/Todo.md`, `docs/Progress.md` (this file). No other file needed changes — `WeaponClashArena.tsx` already forwards whatever `mapWeaponClashStateToRenderables` produces straight through to `renderCircleFrame` without touching individual fields, so the new `isFlashing` field required no change there.

**Not implemented / explicitly out of scope**, matching Roadmap.md exactly:

- Weapon Clash's own Character Skills — Phase 10, unchanged.
- Weapon variant selection UI — still no Menu wiring, unchanged from Phase 8.
- A cooldown for repeated weapon↔weapon collision, and a continuous/swept test for rotating weapon segments — both flagged as judgment calls above, not implemented, since neither is documented as required.

**Awaiting the project owner's own review and approval before Phase 10 begins**, per Roadmap.md's Development Rules.

### Pre-Phase 9 — Constant Movement Speed

Requested by the project owner directly, ahead of Phase 9, while Phase 8 itself was still awaiting review (Phase 8 has since been reviewed and approved together with this addition — see above).

**The rule:** every living (non-eliminated) player's movement speed must be exactly constant for the entire run. Physics still decides *direction* every tick — wall Reflection and player↔player Bounce work exactly as before, and nothing about how a collision redirects a player changed. But physics may never leave a player permanently faster or slower than the constant configured speed: an ordinary elastic Bounce (see `engine/core/Physics.ts`, `bounceCircles`) exchanges velocity components between two circles and can change either circle's total speed, not just its direction — that drift is what this rule eliminates.

**Explicitly scoped as core, not Phase 9 polish.** The project owner was clear this should not wait behind Phase 9's "Weapon Physics Polish" items (no player overlap, no weapon overlap, no tunnelling, weapon bounce, reverse weapon rotation, hit freeze, damage flash) — it's implemented now, on top of Phase 8, and `docs/WeaponClash.md` says so explicitly in both its new Movement Speed section and its Simulation Loop section.

**Implementation:**

- **`src/simulations/WeaponClash/WeaponClash.ts`** — new `enforceConstantMovementSpeed(state, movementSpeed)`, called as a new Step 3 in `update()` (renumbering the old Step 3/"Steps 5-6" comments to Step 4/"Steps 6-7"), positioned after Step 1 (wall Reflection) and Step 2 (player↔player Bounce) — i.e. after every velocity-affecting physics this tick — and before Step 4 (weapon hits, which never touch velocity, so ordering relative to them doesn't matter). For every non-eliminated player it takes `normalize(player.velocity)` (see `shared/Vector2.ts`) and rescales it to the constant `movementSpeed`, which preserves whatever direction that tick's physics produced while discarding any speed drift. (As of Phase 9, this step also skips frozen players — see above.)
- **Degenerate zero-velocity case, handled defensively — not expected gameplay.** An exact head-on Bounce with zero tangential component could, in a razor-thin theoretical case, cancel a player's velocity to precisely `{0, 0}` — a vector `normalize()` can't give a direction for. Under normal play this should never occur; it is not part of the intended physics model, only a guard against an extremely rare numerical/degenerate edge case. Rather than leave the player stationary (violating WeaponClash.md's "Never stop moving"), a fresh direction is drawn from the run's own seeded `Random` (new `randomUnitVector` helper) — the same determinism pattern every other random draw in this file already follows, so this fallback stays fully deterministic for a given seed even though it is exceptional. Not something a headless smoke test is likely to ever exercise at today's placeholder values, but a real gap in "never stop moving" otherwise, so it's handled rather than assumed away.
- **`src/simulations/WeaponClash/Config.ts`** — `spawnVelocityMagnitude` renamed to `movementSpeedPixelsPerSecond`. No numeric value changed (still `180`). The field's role expanded from "spawn-time-only initial magnitude" to "the constant speed enforced for the whole run," so the old name no longer described what it does — and the new name mirrors Color Expansion's own `movementSpeedCellsPerSecond` in `ColorExpansion/Config.ts`, the same naming pattern for the same kind of value across both simulations.
- **`docs/WeaponClash.md`** — new **Movement Speed** section (between Physics and Weapons) stating the rule, why it's core rather than Phase 9 polish, and the degenerate-case fallback. Physics section's Players/Velocity subsections rewritten to point at it instead of the old "Keep constant momentum" bullet, which was imprecise (an ordinary elastic collision conserves total momentum and kinetic energy across both circles, not either circle's own speed — see the judgment call below). Spawn section's two velocity bullets merged into one, cross-referencing Movement Speed. Simulation Loop's full 7-step design and Phase 8 scope subset both gained a new "Normalize Movement Speed" step (positioned after all velocity-affecting collision steps, before Weapon Hits), with every later step renumbered by one. TODO's placeholder-value bullet updated for the Config rename.
- **`docs/Todo.md`** — Balance section's "Spawn velocity magnitude" entry renamed to "Movement speed," pointing at the new Config field name and noting it's now a core gameplay rule, not just a spawn-time value.

**Judgment calls made this session:**

- **The `spawnVelocityMagnitude` → `movementSpeedPixelsPerSecond` rename.** Not explicitly requested, but the old name became actively misleading once the same value governs every tick's enforced speed, not just the spawn draw (see docs/CLAUDE.md, Code Style — "Use descriptive names"). A pure rename: every reference updated, no numeric value touched. Flagged here in case the project owner would have preferred keeping the old name for a smaller diff.
- **"Keep constant momentum" replaced, not just supplemented.** The old Physics bullet used "momentum" imprecisely — real elastic collisions conserve total momentum and kinetic energy across the whole system, not any single body's own speed, which is exactly why speed could drift under the old rules. The new bullet ("movement speed is constant for every player") states the actual, now-enforced guarantee instead.
- **Normalization runs unconditionally every tick**, not only on ticks where a collision actually happened. Simpler than tracking whether this tick's physics changed anything, and harmless: on a tick with no collision, `normalize` + rescale is a no-op up to floating-point precision, since wall Reflection already preserves magnitude exactly and a quiet tick leaves velocity untouched.
- **Where the degenerate zero-velocity fallback draws its randomness from.** Reused the run's existing seeded `Random` (same instance `createInitialState`'s own spawn-direction draw and Color Expansion's Trickster hooks already consume from, each in their own simulation) rather than inventing a special-case rule — keeps this branch deterministic for a given seed with no new concept introduced.

**Determinism unaffected.** `enforceConstantMovementSpeed` is a pure function of the already-deterministic post-collision velocity (plus, in the unreached-in-practice degenerate branch, a draw from the run's own seeded RNG) — the same-seed-same-result guarantee (see Engine.md, Determinism) still holds.

**Reviewed and approved by the project owner**, including the `spawnVelocityMagnitude` → `movementSpeedPixelsPerSecond` rename, together with Phase 8 itself (see "Update — Phase 8 approved" near the top of this file). One documentation-only follow-up was requested and applied: the zero-velocity fallback needed to read unambiguously as a defensive safeguard against a rare numerical/degenerate edge case — never expected under normal gameplay — rather than as a designed-for situation. Applied to three places: this file's own bullet above, `enforceConstantMovementSpeed`'s doc comment in `WeaponClash.ts`, and the "Degenerate case" note in `docs/WeaponClash.md`'s Movement Speed section (retitled "Safeguard, not gameplay" there for the same reason).

## Completed Phases

### Phase 1 — Foundation

Implemented shared types, shared runtime utilities, the character registry, and the `SimulationEngine` class shell. No gameplay, per the Phase 1 deliverable.

### Phase 2 — Rendering

Implemented `ArenaRenderer`, `CharacterRenderer`, the shared `renderFrame` pipeline, the engine tick loop (`startLoop`/`stopLoop`), and the demo `Arena.tsx`. No gameplay or simulation logic.

### Phase 3 — Simulation Lifecycle

Implemented `start`/`stop`/`restart`/`reset`/`isRunning` on `SimulationEngine`, plus the fixed-timestep `advanceSimulationStep`. Verified: `tsc -b`, `oxlint`, and `vite build` all pass cleanly.

### Phase 4 — Shared Systems

Implemented `StatisticsStore`, `Ranking.ts`, and `Config<T>`. "Shared Helpers" was explicitly rejected as speculative. Verified by the project owner: `npm run build` and `npm run lint` both completed with no errors. Phase 4 is approved.

### Phase 5 — Shared UI

Implemented the simulation registry, the Menu (and its subcomponents), the aspect ratio system, the demo Arena component, the UI phase lifecycle (`UIManager`), and the shared UI screens (`IntroScreen`, `StatsPanel`, `WinnerScreen`) plus shared presentational primitives (`Button`, `Card`, `SelectableTile`). Verified against a full sandbox checkout: `tsc -b`, `oxlint`, and `vite build` all passed cleanly.

### Phase 6 — Color Expansion MVP

Implemented `Grid.ts`, `ColorExpansion/Config.ts` (`gridSize`, `movementSpeedCellsPerSecond` placeholders), and `ColorExpansion.ts` (`createColorExpansionSimulation`, `computeColorExpansionStats`). Then wired it up for real: `GridRenderer.ts`, `renderGridFrame`, `mapColorExpansionStateToRenderables`, `ColorExpansionArena.tsx`, and `App.tsx`'s Start flow. Verified with a full sandbox checkout (`tsc -b`, `oxlint`, `npm run build` all clean) and a headless runtime smoke test confirming determinism and correct termination for 2/3/4-player games. Reviewed and approved by the project owner, including a post-review Config refactor moving `playerSquareCellRatio` into `ColorExpansionConfigShape`.

### Phase 7 — Color Expansion Skills

Implemented Heavy, Swift, Sleeper, and Trickster exactly as documented in `ColorExpansion.md`: `Skills.ts`'s local hook interface (`modifySpeed`, `modifyCapture`, `modifyPathChoice`), `Grid.ts`'s new `findPathChoiceTowardNearestNeutralCell` (exposing tie candidates), six new Config placeholder balance values, and `ColorExpansion.ts`'s `advancePlayer` now running every hook a player's character implements. Verified with a full sandbox checkout (`tsc -b`/`oxlint` clean) and a headless multi-roster determinism/termination smoke test. Reviewed and approved by the project owner, tested with no errors.

### Phase 8 — Weapon Clash MVP

**Reviewed and approved by the project owner**, together with the Pre-Phase 9 Constant Movement Speed addition described above. See the full account below for what Phase 8 itself implemented.

**Scope, and the key judgment call made before writing any code:** Roadmap.md separates Weapon Clash into two phases — Phase 8 ("Weapon Clash MVP": Physics, Players, Weapons, HP, Damage, Arena collisions, Weapon rotation, Elimination, Win condition) and Phase 9 ("Weapon Physics Polish": no player overlap, no weapon overlap, no tunnelling, weapon bounce, reverse weapon rotation, hit freeze, damage flash). The Pre-Phase 8 Weapon Clash Simulation Loop Design session (see below) had, ahead of any code, written up the *full* end-state 7-step per-tick loop — including weapon↔weapon collision and Hit Freeze — as the target design Weapon Clash is working toward across both phases. Taking that full design and implementing all of it under a "Phase 8" label would have gone directly against Roadmap.md's Development Rules ("Implement only the current milestone. Do not implement future milestones."). Phase 8 implemented exactly its own item list, deferring Weapon↔Weapon collision, Hit Freeze, and Sweep-Test/anti-tunnelling to Phase 9 where Roadmap.md already puts them — now implemented, see "Phase 9 — Weapon Physics Polish" above.

**`src/types/Vector2.ts`** (new) — the `Vector2` type (`{ x: number; y: number }`), per the Pre-Phase 8 Physics Primitive Architecture session. No methods, per `/src/types`'s own no-runtime-logic rule.

**`src/shared/Vector2.ts`** (new) — pure Vector2 math functions (`add`, `subtract`, `scale`, `length`, `normalize`, `dot`, `rotate`), mirroring `Math.ts`'s existing scalar functions (`clamp`, `lerp`, etc.) in style and placement (no engine-specific dependency). (Phase 9 later added `cross` to this same file.)

**`src/engine/core/Physics.ts`** (previously an empty placeholder) — now holds, per the agreed primitive vocabulary and Phase 8's own scope:

- `Circle` (`center: Vector2`, `radius`, optional `mass` defaulting to 1) and `Segment` (`start: Vector2`, `end: Vector2`).
- `circleCircleCollision(a, b)` — detection only, returns whether two circles overlap and the overlap depth/normal needed for response.
- `segmentCircleIntersect(segment, circle)` — detection only, returns whether a segment intersects a circle (the weapon-hit test).
- `reflectOffWall(position, velocity, radius, arenaSize)` — dynamic-static response: reflects a circle's velocity (and corrects its position) off any of the four arena walls.
- `bounceCircles(a, velocityA, b, velocityB)` — dynamic-dynamic response: elastic collision exchange between two circles, respecting each circle's `mass` (so an effectively-infinite-mass circle — Hit Freeze use, now implemented in Phase 9 — barely moves, while a normal circle bounces off it fully).

Deliberately NOT implemented in Phase 8 (see the scope judgment call above): `segmentSegmentIntersect` (weapon↔weapon detection), `sweepCircleCollision`, and `correctCircleOverlap` — all three are Phase 9 items, and all three are now implemented (see "Phase 9 — Weapon Physics Polish" above).

**`src/simulations/WeaponClash/Config.ts`** — `WeaponClashConfigShape` with:

- `startingHp: 100` and `baseDamage: 1` — not placeholders; both are literal values WeaponClash.md itself states ("100 HP", "Damage = 1"), so these are implemented as specified rather than guessed.
- `playerRadius`, `rotationSpeedRadiansPerSecond`, `weaponLength`, `spawnVelocityMagnitude` (later renamed `movementSpeedPixelsPerSecond`) — genuine **temporary placeholders**, following exactly the pattern Color Expansion's `gridSize`/`movementSpeedCellsPerSecond` established in Phase 6.

**`src/simulations/WeaponClash/Weapon.ts`** (previously empty) — a small, pure module for weapon geometry: given a player's center, radius, and current rotation angle, `getWeaponSegment(center, playerRadius, weaponLength, angle)` returns the `Segment` from the player's edge outward.

**`src/simulations/WeaponClash/WeaponClash.ts`** (previously empty) — `createWeaponClashSimulation(players)`, following exactly the same `Simulation<TState>` factory shape as `createColorExpansionSimulation`. See Phase 9's account above for how this file was subsequently extended.

**`src/engine/rendering/Renderer.ts`** — added `RenderableWeapon` (`{ color, start: Vector2, end: Vector2 }`) and `renderCircleFrame(...)`, a third rendering pipeline alongside `renderFrame`/`renderGridFrame`.

**`src/engine/rendering/WeaponRenderer.ts`** (new) — `drawWeapon(ctx, weapon)`.

**`src/components/Arena/WeaponClashArena.tsx`** (new) — mounts the canvas and drives Weapon Clash via `SimulationEngine`, mirroring `ColorExpansionArena.tsx`.

**`src/App.tsx`** — now checks `selection.simulationId === 'weapon-clash'` and renders `WeaponClashArena` in that case.

**Judgment calls made in Phase 8** (all previously flagged, several since resolved by later sessions):

- The Phase 8/Phase 9 scope line (see above) — the single most consequential judgment call, now fully resolved with Phase 9's implementation.
- Weapon variant selection is still not implemented — unchanged, still flagged.
- Weapon starting angle is `0` for every player, not randomized — unchanged.
- Spawn rejection sampling with a generous finite attempt cap — unchanged.
- HP/damage as literal spec values, not guessed placeholders — unchanged.
- The "must fully leave before hitting again" cooldown for Weapon Hit is tracked as a per-pair contact flag — unchanged; Phase 9 did not introduce an equivalent cooldown for Weapon Collision (see Phase 9's own judgment calls above).
- Placeholder values were retuned after the first verification pass (`rotationSpeedRadiansPerSecond`, `weaponLength`, `movementSpeedPixelsPerSecond`) — unchanged, still unplaytested placeholders.

**Verification performed for Phase 8:** a full sandbox checkout, `npm install`, `tsc -b`, `oxlint` all run for real; a headless runtime smoke test confirmed determinism and correct termination for 2/3/4-player games across multiple seeds.

**Not implemented in Phase 8** (now implemented in Phase 9, see above): Weapon↔Weapon collision and rotation reversal, Hit Freeze, Sweep Test/anti-tunnelling, damage flash. **Still not implemented** (Phase 10): Weapon Clash's own Character Skills. **Still not implemented** (no Menu wiring exists): weapon variant selection UI.

### Pre-Phase 7 fix (start of that session)

`src/types/Skill.ts`'s doc comment previously read "Each simulation's Skills.ts implements one Skill per character" — stale phrasing from before the hook-interface architecture was locked down (see "Pre-Phase 7 — Skill Architecture & Documentation" below), flagged at the end of that session as a one-line fix to make before real Phase 7 work began. Corrected to describe the actual model: each simulation builds its own local hook interface out of the generic `Skill<TState, TValue>` shape, and a character implements zero, one, or several of that interface's optional hooks. No behavior change — doc comment only.

### Pre-Phase 7 — Skill Architecture & Documentation

**Architecture decided:**

- The generic `Skill<TState, TValue>` type (`src/types/Skill.ts`) stays in `/src/types` as a completely generic function shape. It defines only the shape of a single hook and must never know anything about any simulation-specific mechanic (movement, capture, pathfinding, damage, weapons, grids, etc.).
- Each simulation defines its own **local hook interface** inside its own `Skills.ts`, built from that generic shape. Hook names belong only to the simulation that defines them — Color Expansion's `modifySpeed` / `modifyCapture` / `modifyPathChoice` are not shared with, inherited by, or expected to match any other simulation's hooks. Weapon Clash will define its own hook interface, with its own names, once it is designed (Phase 10).
- Hooks are **optional**, on a per-character, per-hook basis. A character only implements the hooks its skill actually modifies; wherever a simulation calls a hook, a missing hook is treated as identity — the base value is used unmodified.
- `docs/Skills.md` was rewritten to stay purely engine-level documentation: it states the contract (read-only, returns a modified value, never mutates state, passive-only, modifies-not-invents a mechanic) and the rule that every simulation defines its own local hook interface — but it no longer names any simulation-specific hooks.
- A new rule, worded by the project owner, was added to `Skills.md` under "Adding a Skill to a New Simulation": _"A simulation should define the smallest hook interface necessary. Introduce a new hook only when an existing hook cannot express the intended behavior."_

**Verification:** that session was documentation-only — no code was changed, so no `tsc -b` / `oxlint` / `vite build` run was needed or performed.

### Pre-Phase 8 — Architecture Cleanup

Prompted directly by the Phase 7 review's own "Did Phase 7 expose architectural weaknesses?" findings. Three small, documentation/naming-only changes, requested explicitly by the project owner, with no gameplay or behavior change and no code paths altered:

1. **`Skill<TState, TValue>` renamed to `Skill<TContext, TValue>`** (`src/types/Skill.ts`).
2. **Randomness-in-hooks rule made explicit** (`docs/Skills.md`, new Contract subsection "Randomness").
3. **`Simulation.update()`'s mutation contract documented** (`src/types/Simulation.ts`).

**Physics.ts boundary, decided ahead of Phase 8 (no code written yet):** reviewed and agreed before any Weapon Clash implementation begins. `engine/core/Physics.ts` is reserved for genuinely simulation-agnostic primitives only: vector math, circle-circle collision detection, wall/boundary collision, collision response (bounce/reflection), and continuous/swept collision to prevent tunnelling. Everything specific to Weapon Clash's own rules belongs inside `src/simulations/WeaponClash/`.

**Verification:** documentation and doc-comments only. No gameplay file changed.

### Pre-Phase 8 — Physics Primitive Architecture

Requested by the project owner immediately after Phase 7's approval, before any Weapon Clash code is written.

**The rule:** `Physics.ts` must never know what a Player, Weapon, Enemy, or Projectile is. It operates exclusively on:

- **Vector2** — a 2D vector (x, y). Lives in `/src/types`; math functions live in `/src/shared`.
- **Circle** — center (`Vector2`) + `radius`, with an optional `mass` (defaulting to 1).
- **Segment** — two endpoints (`Vector2`, `Vector2`).
- **Collision** — detection only, no response: circle×circle, segment×circle, segment×segment.
- **Bounce** — dynamic-dynamic collision response.
- **Reflection** — dynamic-static collision response.
- **Sweep Test** — continuous collision detection, needed to prevent tunnelling.
- **Intersection** — raw geometric point/overlap queries with no response computed.

Every function is pure. Not implemented that session — `Physics.ts`, `Vector2`, and every function above remained unwritten; that session settled the vocabulary and contract only. (Phase 9 later added one category beyond this original list — Overlap Correction — see "Phase 9 — Weapon Physics Polish" above for why.)

**Verification:** documentation-only session — no code changed.

### Pre-Phase 8 — Weapon Clash Simulation Loop Design

Requested by the project owner immediately after the Physics Primitive Architecture session above, before any Phase 8 code was written.

**The agreed per-tick order:**

1. **Update Physics** — (a) advance freeze timers, (b) weapon rotation for non-frozen players, (c) player movement and wall collision for non-frozen players.
2. **Resolve Player Collisions** — between non-frozen players only.
3. **Resolve Weapon Collisions** — reverses both weapons' rotation direction; between non-frozen players only.
4. **Resolve Weapon Hits** — checked in a fixed player order; a player frozen earlier in the same pass is excluded from every later check in that pass, as either attacker or victim.
5. **Update player statistics.**
6. **Remove eliminated players.**
7. **Check if the simulation has ended.**

**Hit Freeze redefined.** WeaponClash.md's original "Hit Feedback" section (attacker/victim freeze + flash) is renamed and expanded into a full hit-stop contract: on a successful hit, both attacker and victim freeze for 0.1s and flash; while frozen, a player has no movement, no weapon rotation, no collision response, and cannot be involved in any further hit as either attacker or victim. When the freeze ends, the player resumes with the exact velocity, direction, and rotation state they had before the freeze; nothing is reset or recalculated.

**Judgment call resolved:** a frozen player acts as a static, unmovable obstacle during their freeze window, not as excluded from collision entirely. Mechanism: when converting a frozen player's state into a Circle for a Physics.ts collision call, WeaponClash assigns it an effectively infinite mass — Physics.ts's existing Bounce primitive then naturally produces zero velocity change for the frozen player and a normal reflection for whichever still-moving player collided with them. (Note, added in Phase 9: this session's own step-2 summary above used the phrase "between non-frozen players only" for Player Collision, which reads as excluding frozen players — that phrasing was carried forward uncritically into `docs/WeaponClash.md`'s Simulation Loop section and has now been corrected there; this session's *resolved judgment call*, right above, was always the intended and implemented behavior.)

**Velocity flow clarified:** a player's movement direction and magnitude are chosen exactly once, at `createInitialState`, from the run's seeded `Random`. Every tick's movement step reads whatever velocity is already stored from the end of the previous tick. Physics.ts modifies velocity in exactly two places, both collision responses: wall Reflection and Bounce. (Phase 9 added a third: weapon↔weapon Bounce, and a fourth as a positional-only change: Overlap Correction.)

**Not implemented that session.** `Physics.ts` and every file in `src/simulations/WeaponClash/` remained empty placeholders — that session settled the design only.

**Verification:** documentation-only session — no code changed.

## Decisions Made Along the Way

- SimulationManager was merged into SimulationEngine — no separate class (see Architecture.md).
- Character selection: the creator selects exactly which character fills each player slot, 2–4 slots (see Engine.md, Menu).
- Resolved a conflict in Architecture.md: engine renders, simulation only supplies state — `Render()` was removed from the `Simulation` type.
- Character colors in the registry are placeholder defaults from a shared palette (`CHARACTER_COLOR_PALETTE` in Colors.ts).
- `RenderableCharacter` (character + x/y, pixel space) lives in `engine/rendering/Renderer.ts`, not `/src/types`, since it's a rendering-only concept. `RenderableGrid`, `RenderableSquareCharacter`, and `RenderableWeapon` follow the same placement logic.
- Grid-based simulations (Color Expansion) get their own rendering pipeline function, `renderGridFrame`; circle/physics-based simulations (Weapon Clash) get `renderCircleFrame` — both share `ArenaRenderer.ts`'s `drawArena` and the same letterbox/clear logic.
- **(Pre-Phase 7 session)** Skill hook interfaces are local per simulation, never shared or inherited across simulations.
- **(Pre-Phase 7 session)** Hooks are optional per character, with missing hooks treated as identity at the call site.
- **(Phase 7)** A hook's `TState` is a small, hook-specific context type, not the full simulation state.
- **(Pre-Phase 8, Physics Primitive Architecture)** `Physics.ts` operates only on generic primitives (`Vector2`, `Circle`, `Segment`) and generic operations on them — it never imports or references a simulation type.
- **(Pre-Phase 8, Physics Primitive Architecture)** `Circle` carries an optional `mass` (default 1).
- **(Pre-Phase 8, Weapon Clash Simulation Loop Design)** The full per-tick order — freeze timers → weapon rotation → movement/wall collision → player collision → weapon collision → weapon hits → statistics → elimination → win check — was settled before any Weapon Clash code was written, as the target end-state design.
- **(Phase 8)** The full Pre-Phase 8 design was implemented across two phases, not one: Phase 8 implemented the MVP subset Roadmap.md actually lists for it; Weapon↔Weapon collision, Hit Freeze, and Sweep Test were deferred to Phase 9 — now implemented.
- **(Phase 8)** `startingHp`/`baseDamage` are literal spec values (100, 1); `playerRadius`/`rotationSpeedRadiansPerSecond`/`weaponLength`/`movementSpeedPixelsPerSecond` are genuine unplaytested placeholders.
- **(Phase 8)** Weapon variant selection (Sword/Axe/Bow/Spear) is not implemented.
- **(Phase 8)** The "weapon must fully leave before hitting again" rule is tracked as a per-pair contact flag, not a time-based cooldown.
- **(Pre-Phase 9)** Movement speed is a core gameplay rule, not Phase 9 polish: every living, non-frozen player's velocity is re-normalized back to a constant configured speed after each tick's physics resolves.
- **(Pre-Phase 9)** `WeaponClashConfigShape`'s `spawnVelocityMagnitude` was renamed to `movementSpeedPixelsPerSecond` (no numeric value changed).
- **(Phase 9)** `Physics.ts` gained `sweepCircleCollision` (continuous circle×circle collision), `correctCircleOverlap` (positional overlap-separation response — a new primitive category beyond the original Pre-Phase 8 vocabulary), and `segmentSegmentIntersect` (discrete segment×segment collision). No continuous/swept test was implemented for rotating weapon segments — flagged as a judgment call, not attempted, given the disproportionate complexity for this project's needs.
- **(Phase 9)** A frozen player participates in Player Collision as a static, infinite-mass obstacle (not excluded), but is excluded entirely from Weapon Collision and Weapon Hits — resolving an internal inconsistency in how `docs/WeaponClash.md`'s Simulation Loop section previously summarized Player Collision.
- **(Phase 9)** Weapon Collision has no "must fully leave" cooldown (unlike Weapon Hit) since none is documented — flagged for review rather than invented.
- **(Phase 9)** Hit Freeze (`freezeRemainingMs` per player, decremented first each tick) and its damage flash (`isFlashing`, derived directly from `freezeRemainingMs > 0`) are implemented exactly as `docs/WeaponClash.md` already specified.

## For a New Chat

Read Blueprint.md first, then this file, before anything else.

Phase 1 through Phase 8 (including the Pre-Phase 9 Constant Movement Speed addition) are implemented and approved by the project owner in full.

**Phase 9 (Weapon Physics Polish) is implemented and verified, including a post-Phase-9 playtesting follow-up** (see "Phase 9 — Weapon Physics Polish" and "Post-Phase-9 Playtesting Follow-up" above for the complete account of both), but — per Roadmap.md's Development Rules — awaiting the project owner's own review and approval before Phase 10 begins. Weapon Clash is now feature-complete for everything Roadmap.md lists through Phase 9, plus four playtesting-driven refinements: physics-driven movement with anti-tunnelling player collision and a very small, subtle Gravity; player↔player and weapon↔weapon bouncing (the latter also reversing rotation direction, gated by a "must fully leave" cooldown and detected via sub-stepped sampling to reduce tunnelling); overlap correction; randomized initial weapon rotation (both angle and direction) per player, which also fixed a genuine bug where 2-player matches could never see a weapon↔weapon collision; weapon-hit damage with Hit Freeze (0.1s hit-stop, both parties frozen and flashing white); and a last-player-standing win condition. Not yet present: Weapon Clash's own Character Skills (Phase 10) and weapon variant selection UI (no Menu wiring exists for it yet, same as before).

`src/engine/core/Physics.ts` now implements the complete originally-agreed Pre-Phase 8 vocabulary (Circle, Segment, circle×circle/segment×circle/segment×segment Collision, Bounce, Reflection, Sweep Test) plus one addition beyond it (Overlap Correction, `correctCircleOverlap`) needed for Phase 9's "no overlap" items. It was **not** touched by the post-Phase-9 follow-up — every fix there (Gravity, spawn randomization, weapon-collision cooldown, sub-stepped detection) is a `WeaponClash.ts`-level decision, not a new generic primitive.

Everything else under `src/engine/audio` and `src/engine/recording` is still an empty placeholder. A file existing does not mean it is implemented; check actual file contents, not just the file tree, before assuming any phase is complete.

Update "Current Phase" and "Completed Phases" above after every milestone (see Roadmap.md, Development Rules).
