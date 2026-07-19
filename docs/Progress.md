# Progress

Last updated: after Phase 7 (Color Expansion Skills) was reviewed, tested, and approved by the project owner, after a follow-up Pre-Phase 8 session settled the Physics primitive architecture, after a further Pre-Phase 8 session locked down Weapon Clash's full simulation loop and Hit Freeze mechanic, after Phase 8 (Weapon Clash MVP) was implemented, after a Pre-Phase 9 session added Constant Movement Speed as a core gameplay rule on top of that Phase 8 implementation, and after the project owner reviewed and approved both Phase 8 and the Constant Movement Speed addition — the only follow-up requested was clarifying, in documentation and comments only, that the zero-velocity fallback is a defensive safeguard against a rare edge case, not part of the normal physics model. Phase 8 is now fully approved; Phase 9 ("Weapon Physics Polish") has not yet begun.

**Update — Phase 7 approved.** The project owner has reviewed Phase 7 directly and tested it, with no errors. Phase 7 (Color Expansion Skills) is now considered complete, joining Phases 1–6 as fully approved work.

**Update — Pre-Phase 8 cleanup session:** three small, documentation/naming-only changes were made after Phase 7 was implemented, at the project owner's request, directly responding to the Phase 7 review's own "architectural weaknesses" findings. None of them touch gameplay. See "Pre-Phase 8 — Architecture Cleanup," under Current Phase below, for the full account.

**Update — Pre-Phase 8 Physics Primitive Architecture session:** following Phase 7's approval, the project owner requested a firmer architectural rule for the still-unimplemented `engine/core/Physics.ts`: it must operate only on generic geometric primitives (`Vector2`, `Circle`, `Segment`) and generic operations on them (Collision, Bounce, Reflection, Sweep Test, Intersection) — never on simulation concepts like Player, Weapon, Enemy, or Projectile. See "Pre-Phase 8 — Physics Primitive Architecture," under Current Phase below, for the full account. No code was written this session — `Physics.ts` remains an empty placeholder, exactly as before — this only sharpens the boundary the earlier Pre-Phase 8 cleanup session had already agreed to in principle.

**Update — Pre-Phase 8 Weapon Clash Simulation Loop Design session:** immediately after the Physics Primitive Architecture session, the project owner and Claude settled the full per-tick simulation loop for Weapon Clash — the exact step order, which parts belong to `engine/core/Physics.ts` versus `src/simulations/WeaponClash/`, a redefinition of Hit Feedback into a proper Hit Freeze hit-stop mechanic, and the flow governing player velocity (chosen once at spawn, never re-decided, only ever modified by collision response). See "Pre-Phase 8 — Weapon Clash Simulation Loop Design," under Current Phase below. No code was written this session; `docs/WeaponClash.md` was updated to reflect the agreed design ahead of implementation, and the one open judgment call (whether a frozen player blocks as a static obstacle or is excluded from collision entirely) has since been resolved — a frozen player blocks as a static obstacle — see "Pre-Phase 8 — Weapon Clash Simulation Loop Design" below.

**Update — Phase 8 approved, including Constant Movement Speed.** The project owner reviewed Phase 8 (Weapon Clash MVP) together with the Pre-Phase 9 Constant Movement Speed addition (see below) and approved both. No implementation changes were requested — the sole follow-up was documentation/comment clarification of the zero-velocity fallback's intent (see "Pre-Phase 9 — Constant Movement Speed" below for the exact wording change). Phase 8, in full, now joins Phases 1–7 as approved work. Phase 9 ("Weapon Physics Polish") has not yet started.

## Current Phase

**Phase 9 — Weapon Physics Polish — not yet started.** Phase 8 (Weapon Clash MVP), including the Constant Movement Speed rule added on top of it, is fully implemented and approved. See "Phase 8 — Weapon Clash MVP" and "Pre-Phase 9 — Constant Movement Speed" below for the full account of both, per Roadmap.md's Development Rules ("Update Progress.md" after every milestone).

### Pre-Phase 9 — Constant Movement Speed

Requested by the project owner directly, ahead of Phase 9, while Phase 8 itself was still awaiting review (Phase 8 has since been reviewed and approved together with this addition — see below).

**The rule:** every living (non-eliminated) player's movement speed must be exactly constant for the entire run. Physics still decides *direction* every tick — wall Reflection and player↔player Bounce work exactly as before, and nothing about how a collision redirects a player changed. But physics may never leave a player permanently faster or slower than the constant configured speed: an ordinary elastic Bounce (see `engine/core/Physics.ts`, `bounceCircles`) exchanges velocity components between two circles and can change either circle's total speed, not just its direction — that drift is what this rule eliminates.

**Explicitly scoped as core, not Phase 9 polish.** The project owner was clear this should not wait behind Phase 9's "Weapon Physics Polish" items (no player overlap, no weapon overlap, no tunnelling, weapon bounce, reverse weapon rotation, hit freeze, damage flash) — it's implemented now, on top of Phase 8, and `docs/WeaponClash.md` says so explicitly in both its new Movement Speed section and its Simulation Loop section.

**Implementation:**

- **`src/simulations/WeaponClash/WeaponClash.ts`** — new `enforceConstantMovementSpeed(state, movementSpeed)`, called as a new Step 3 in `update()` (renumbering the old Step 3/"Steps 5-6" comments to Step 4/"Steps 6-7"), positioned after Step 1 (wall Reflection) and Step 2 (player↔player Bounce) — i.e. after every velocity-affecting physics this tick — and before Step 4 (weapon hits, which never touch velocity, so ordering relative to them doesn't matter). For every non-eliminated player it takes `normalize(player.velocity)` (see `shared/Vector2.ts`) and rescales it to the constant `movementSpeed`, which preserves whatever direction that tick's physics produced while discarding any speed drift.
- **Degenerate zero-velocity case, handled defensively — not expected gameplay.** An exact head-on Bounce with zero tangential component could, in a razor-thin theoretical case, cancel a player's velocity to precisely `{0, 0}` — a vector `normalize()` can't give a direction for. Under normal play this should never occur; it is not part of the intended physics model, only a guard against an extremely rare numerical/degenerate edge case. Rather than leave the player stationary (violating WeaponClash.md's "Never stop moving"), a fresh direction is drawn from the run's own seeded `Random` (new `randomUnitVector` helper) — the same determinism pattern every other random draw in this file already follows, so this fallback stays fully deterministic for a given seed even though it is exceptional. Not something a headless smoke test is likely to ever exercise at today's placeholder values, but a real gap in "never stop moving" otherwise, so it's handled rather than assumed away.
- **`src/simulations/WeaponClash/Config.ts`** — `spawnVelocityMagnitude` renamed to `movementSpeedPixelsPerSecond`. No numeric value changed (still `180`). The field's role expanded from "the magnitude chosen once at spawn" to "the constant speed enforced for the whole run," so the old name no longer described what it does — and the new name now mirrors Color Expansion's own `movementSpeedCellsPerSecond` in `ColorExpansion/Config.ts`, the same naming pattern for the same kind of value across both simulations.
- **`docs/WeaponClash.md`** — new **Movement Speed** section (between Physics and Weapons) stating the rule, why it's core rather than Phase 9 polish, and the degenerate-case fallback. Physics section's Players/Velocity subsections rewritten to point at it instead of the old "Keep constant momentum" bullet, which was imprecise (an ordinary elastic collision conserves total momentum and kinetic energy across both circles, not either circle's own speed — see the judgment call below). Spawn section's two velocity bullets merged into one, cross-referencing Movement Speed. Simulation Loop's full 7-step design and Phase 8 scope subset both gained a new "Normalize Movement Speed" step (positioned after all velocity-affecting collision steps, before Weapon Hits), with every later step renumbered by one. TODO's placeholder-value bullet updated for the Config rename.
- **`docs/Todo.md`** — Balance section's "Spawn velocity magnitude" entry renamed to "Movement speed," pointing at the new Config field name and noting it's now a core gameplay rule, not just a spawn-time value.

**Judgment calls made this session:**

- **The `spawnVelocityMagnitude` → `movementSpeedPixelsPerSecond` rename.** Not explicitly requested, but the old name became actively misleading once the same value governs every tick's enforced speed, not just the spawn draw (see docs/CLAUDE.md, Code Style — "Use descriptive names"). A pure rename: every reference updated, no numeric value touched. Flagged here in case the project owner would have preferred keeping the old name for a smaller diff.
- **"Keep constant momentum" replaced, not just supplemented.** The old Physics bullet used "momentum" imprecisely — real elastic collisions conserve total momentum and kinetic energy across the whole system, not any single body's own speed, which is exactly why speed could drift under the old rules. The new bullet ("movement speed is constant for every player") states the actual, now-enforced guarantee instead.
- **Normalization runs unconditionally every tick**, not only on ticks where a collision actually happened. Simpler than tracking whether this tick's physics changed anything, and harmless: on a tick with no collision, `normalize` + rescale is a no-op up to floating-point precision, since wall Reflection already preserves magnitude exactly and a quiet tick leaves velocity untouched.
- **Where the degenerate zero-velocity fallback draws its randomness from.** Reused the run's existing seeded `Random` (same instance `createInitialState`'s own spawn-direction draw and Color Expansion's Trickster hooks already consume from, each in their own simulation) rather than inventing a special-case rule — keeps this branch deterministic for a given seed with no new concept introduced.

**Determinism unaffected.** `enforceConstantMovementSpeed` is a pure function of the already-deterministic post-collision velocity (plus, in the unreached-in-practice degenerate branch, a draw from the run's own seeded RNG) — the same-seed-same-result guarantee (see Engine.md, Determinism) still holds. This is worth the project owner spot-checking directly: re-running a known seed should still produce byte-identical final HP/position/velocity, and every living player's `length(velocity)` should now read exactly `movementSpeedPixelsPerSecond` (180, at today's placeholder) on every single tick of a run, not just at spawn.

**Verification.** Per Roadmap.md's Development Rules, Claude does not run `tsc -b`, `oxlint`, or `vite build` itself — the project owner runs all three manually as part of review. This change touches only `src/simulations/WeaponClash/{Config.ts,WeaponClash.ts}` and documentation; no new dependency, no change to any other simulation, and no change to `Simulation<TState>`'s contract. Recommended manual check beyond the usual `tsc -b`/`oxlint`/`vite build`: watch a run and confirm players visibly never speed up or slow down, only change direction, exactly as before Phase 9 begins.

**Reviewed and approved by the project owner**, including the `spawnVelocityMagnitude` → `movementSpeedPixelsPerSecond` rename. One documentation-only follow-up was requested before considering this complete: the zero-velocity fallback (see the "Degenerate zero-velocity case" bullet above) needed to read unambiguously as a defensive safeguard against a rare numerical/degenerate edge case — never expected under normal gameplay, and never part of the intended physics model — rather than as a designed-for situation, while making clear the fallback stays deterministic because it draws from the simulation's own seeded RNG. No implementation changed. Applied to three places: this file's own bullet above, `enforceConstantMovementSpeed`'s doc comment in `WeaponClash.ts`, and the "Degenerate case" note in `docs/WeaponClash.md`'s Movement Speed section (now retitled "Safeguard, not gameplay" there for the same reason). With this clarification in place, Phase 8 — Weapon Clash MVP, together with Constant Movement Speed — is complete and approved. Phase 9 ("Weapon Physics Polish") begins next.

### Pre-Phase 7 fix (start of that session)

`src/types/Skill.ts`'s doc comment previously read "Each simulation's Skills.ts implements one Skill per character" — stale phrasing from before the hook-interface architecture was locked down (see "Pre-Phase 7 — Skill Architecture & Documentation" below), flagged at the end of that session as a one-line fix to make before real Phase 7 work began. Corrected to describe the actual model: each simulation builds its own local hook interface out of the generic `Skill<TState, TValue>` shape, and a character implements zero, one, or several of that interface's optional hooks. No behavior change — doc comment only.

### Pre-Phase 7 — Skill Architecture & Documentation

**Architecture decided:**

- The generic `Skill<TState, TValue>` type (`src/types/Skill.ts`) stays in `/src/types` as a completely generic function shape. It defines only the shape of a single hook and must never know anything about any simulation-specific mechanic (movement, capture, pathfinding, damage, weapons, grids, etc.).
- Each simulation defines its own **local hook interface** inside its own `Skills.ts`, built from that generic shape. Hook names belong only to the simulation that defines them — Color Expansion's `modifySpeed` / `modifyCapture` / `modifyPathChoice` are not shared with, inherited by, or expected to match any other simulation's hooks. Weapon Clash will define its own hook interface, with its own names, once it is designed (not yet — Weapon Clash remains out of scope).
- Hooks are **optional**, on a per-character, per-hook basis. A character only implements the hooks its skill actually modifies; wherever a simulation calls a hook, a missing hook is treated as identity — the base value is used unmodified. This was chosen over mandatory pass-through implementations because it keeps each character's definition proportional to what it actually changes, avoids boilerplate, and means adding a new hook to a simulation's interface later never requires touching every character that doesn't use it.
- `docs/Skills.md` was rewritten to stay purely engine-level documentation: it states the contract (read-only, returns a modified value, never mutates state, passive-only, modifies-not-invents a mechanic) and the rule that every simulation defines its own local hook interface — but it no longer names any simulation-specific hooks. Those live in each simulation's own document instead (`ColorExpansion.md` gained a new **Skill Hooks** section).
- A new rule, worded by the project owner, was added to `Skills.md` under "Adding a Skill to a New Simulation," directly before the "document before implementing" bullet: _"A simulation should define the smallest hook interface necessary. Introduce a new hook only when an existing hook cannot express the intended behavior."_

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

Every function is pure. Not implemented that session — `Physics.ts`, `Vector2`, and every function above remained unwritten; that session settled the vocabulary and contract only.

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

**Judgment call resolved:** a frozen player acts as a static, unmovable obstacle during their freeze window, not as excluded from collision entirely. Mechanism: when converting a frozen player's state into a Circle for a Physics.ts collision call, WeaponClash assigns it an effectively infinite mass — Physics.ts's existing Bounce primitive then naturally produces zero velocity change for the frozen player and a normal reflection for whichever still-moving player collided with them.

**Velocity flow clarified:** a player's movement direction and magnitude are chosen exactly once, at `createInitialState`, from the run's seeded `Random`. Every tick's movement step reads whatever velocity is already stored from the end of the previous tick. Physics.ts modifies velocity in exactly two places, both collision responses: wall Reflection and Bounce.

**Not implemented that session.** `Physics.ts` and every file in `src/simulations/WeaponClash/` remained empty placeholders — that session settled the design only.

**Verification:** documentation-only session — no code changed.

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

**Scope, and the key judgment call made before writing any code:** Roadmap.md separates Weapon Clash into two phases — Phase 8 ("Weapon Clash MVP": Physics, Players, Weapons, HP, Damage, Arena collisions, Weapon rotation, Elimination, Win condition) and Phase 9 ("Weapon Physics Polish": no player overlap, no weapon overlap, no tunnelling, weapon bounce, reverse weapon rotation, hit freeze, damage flash). The Pre-Phase 8 Weapon Clash Simulation Loop Design session (see above) had, ahead of any code, written up the *full* end-state 7-step per-tick loop — including weapon↔weapon collision and Hit Freeze — as the target design Weapon Clash is working toward across both phases. Taking that full design and implementing all of it now would mean implementing Phase 9 items under a "Phase 8" label, directly against Roadmap.md's Development Rules ("Implement only the current milestone. Do not implement future milestones."). This session instead implements exactly Phase 8's own item list, deferring Weapon↔Weapon collision, Hit Freeze, and Sweep-Test/anti-tunnelling to Phase 9 where Roadmap.md already puts them. `docs/WeaponClash.md`'s Simulation Loop and Hit Freeze sections now say so explicitly, so this isn't a silent scope-narrowing.

**`src/types/Vector2.ts`** (new) — the `Vector2` type (`{ x: number; y: number }`), per the Pre-Phase 8 Physics Primitive Architecture session. No methods, per `/src/types`'s own no-runtime-logic rule.

**`src/shared/Vector2.ts`** (new) — pure Vector2 math functions (`add`, `subtract`, `scale`, `length`, `normalize`, `dot`, `rotate`), mirroring `Math.ts`'s existing scalar functions (`clamp`, `lerp`, etc.) in style and placement (no engine-specific dependency).

**`src/engine/core/Physics.ts`** (previously an empty placeholder) — now holds, per the agreed primitive vocabulary and Phase 8's own scope:

- `Circle` (`center: Vector2`, `radius`, optional `mass` defaulting to 1) and `Segment` (`start: Vector2`, `end: Vector2`).
- `circleCircleCollision(a, b)` — detection only, returns whether two circles overlap and the overlap depth/normal needed for response.
- `segmentCircleIntersect(segment, circle)` — detection only, returns whether a segment intersects a circle (the weapon-hit test).
- `reflectOffWall(position, velocity, radius, arenaSize)` — dynamic-static response: reflects a circle's velocity (and corrects its position) off any of the four arena walls.
- `bounceCircles(a, velocityA, b, velocityB)` — dynamic-dynamic response: elastic collision exchange between two circles, respecting each circle's `mass` (so an effectively-infinite-mass circle — future Hit Freeze use, Phase 9 — barely moves, while a normal circle bounces off it fully; not yet exercised by Phase 8, since nothing sets a non-default mass yet, but the formula already supports it, avoiding a rewrite later).

Deliberately NOT implemented this phase (see the scope judgment call above): `segmentSegmentIntersect` (weapon↔weapon detection) and any Sweep Test / continuous-collision function (anti-tunnelling) — both are Phase 9 items ("weapon bounce", "no tunnelling").

**`src/simulations/WeaponClash/Config.ts`** — `WeaponClashConfigShape` with:

- `startingHp: 100` and `baseDamage: 1` — not placeholders; both are literal values WeaponClash.md itself states ("100 HP", "Damage = 1"), so these are implemented as specified rather than guessed.
- `playerRadius`, `rotationSpeedRadiansPerSecond`, `weaponLength`, `spawnVelocityMagnitude` — genuine **temporary placeholders**, following exactly the pattern Color Expansion's `gridSize`/`movementSpeedCellsPerSecond` established in Phase 6: undecided numbers (see Todo.md, Balance — "Base rotation speed", "Weapon lengths" were already listed as undecided) needed so Phase 8 has a complete, runnable build instead of blocking on numbers nobody has chosen yet. All flagged in Todo.md, expected to change once the project owner watches a real run.

**`src/simulations/WeaponClash/Weapon.ts`** (previously empty) — a small, pure module for weapon geometry: given a player's center, radius, and current rotation angle, `getWeaponSegment(center, playerRadius, weaponLength, angle)` returns the `Segment` from the player's edge outward (see WeaponClash.md, Weapons — "Attached to player edge. Rotates around player."). No simulation state lives here — it's a pure geometry helper, mirroring how `ColorExpansion/Grid.ts` keeps its own geometry/pathfinding self-contained.

**`src/simulations/WeaponClash/WeaponClash.ts`** (previously empty) — `createWeaponClashSimulation(players)`, following exactly the same `Simulation<TState>` factory shape as `createColorExpansionSimulation`:

- `WeaponClashPlayerState` extends `Player` with `position: Vector2`, `velocity: Vector2`, `hp`, `damage`, `rotationSpeed`, `weaponAngle`, `eliminated`, and `contactedPlayerIds: Set<string>` (the "must fully leave before hitting again" cooldown — see Weapon Hit below).
- `createInitialState(seed)`: spawns players at random positions, rejecting draws that would overlap another player, touch an arena wall, or (implicitly, since players spawn one at a time in slot order) overlap an already-placed player — redrawing from the same seeded `Random` until a valid position is found. Each player's velocity direction is drawn once from the same RNG; magnitude is fixed (`spawnVelocityMagnitude`), matching WeaponClash.md's Spawn section ("equal random velocity", "random movement direction"). Weapon start angle is `0` for every player — WeaponClash.md doesn't specify a starting angle, and since it has no gameplay effect (rotation immediately begins turning it), this is the simplest deterministic choice; flagged below as a judgment call.
- `update(state, deltaTimeMs)` implements Phase 8's own subset of the Simulation Loop (see WeaponClash.md's own "Phase 8 scope" note, added this session): weapon rotation and movement/wall-reflection for every non-eliminated player, then player↔player Bounce collision, then weapon↔player hit detection and damage (skipping any pair already in contact from a previous tick, clearing that pair's contact flag once the segment and circle no longer intersect), then elimination (`hp <= 0`).
- `isComplete(state)`: true once at most one non-eliminated player remains (see WeaponClash.md, Objective — "last surviving character").
- `computeWeaponClashStats(state)` and `mapWeaponClashStateToRenderables(state)`, mirroring Color Expansion's own `computeColorExpansionStats`/`mapColorExpansionStateToRenderables` — the former for `StatisticsStore`, the latter producing `RenderableCharacter[]` (existing type) plus a new `RenderableWeapon[]` for the weapon segments.

**`src/engine/rendering/Renderer.ts`** — added `RenderableWeapon` (`{ color, start: Vector2, end: Vector2 }`) and `renderCircleFrame(...)`, a third rendering pipeline alongside `renderFrame`/`renderGridFrame`: clears, letterboxes, draws the arena, draws every character as a circle (via the existing `drawCharacter`), then draws every weapon as a line on top (new `drawWeapon`, in a new `WeaponRenderer.ts`, kept as its own file mirroring how `CharacterRenderer.ts`/`GridRenderer.ts` are each one drawing primitive per file). `characterRadius` is a parameter, not the demo's hardcoded `CHARACTER_RADIUS`, since Weapon Clash's own circle size comes from its own Config (mirroring `renderGridFrame`'s `squareSizeRatio` parameter).

**`src/engine/rendering/WeaponRenderer.ts`** (new) — `drawWeapon(ctx, weapon)`: a pure function drawing one line segment in the given color. Knows nothing about players, damage, or rotation — mirrors every other file in `engine/rendering`.

**`src/components/Arena/WeaponClashArena.tsx`** (new) — mounts the canvas and drives Weapon Clash via `SimulationEngine`, mirroring `ColorExpansionArena.tsx` exactly: loads `createWeaponClashSimulation(players)`, calls `engine.start(seed, onFrame)`, and inside `onFrame` maps state to renderables via `mapWeaponClashStateToRenderables` and calls `renderCircleFrame`, feeds `computeWeaponClashStats` into a real `StatisticsStore` ranked via `descendingBy((s) => s.hp)` (see WeaponClash.md, Statistics — "Sorted by Highest HP"), and calls `onComplete()` once `engine.isRunning()` goes false.

**`src/App.tsx`** — now checks `selection.simulationId === 'weapon-clash'` and renders `WeaponClashArena` in that case (previously falling through to the Phase 2 demo `Arena`, same as Color Expansion did before Phase 6). The demo `Arena` remains the fallback for any future simulation with no real implementation yet.

**Judgment calls made this session** (flagged for review, same practice as every prior phase):

- **The Phase 8/Phase 9 scope line** (see above) — the single most consequential judgment call this session. Everything Phase 9 explicitly names ("no player overlap", "no weapon overlap", "no tunnelling", "weapon bounce", "reverse weapon rotation", "hit freeze", "damage flash") was left out, even though the Pre-Phase 8 design session had already written up the full end-state design including these. Basic Bounce/Reflection collision response is implemented (Phase 8 explicitly lists "Arena collisions" and Physics generally), but without Sweep Test / continuous collision, so at very high velocities on a low frame rate, tunnelling is theoretically possible — acceptable for Phase 8's own stated scope, to be closed in Phase 9.
- **Weapon variant selection** (Sword/Axe/Bow/Spear) is not implemented. WeaponClash.md says a variant is "selected before the simulation," but the Menu's `SettingsPanel.tsx` still has no wiring for simulation-specific settings (its own placeholder text says so), and no documented mechanic depends on which variant is drawn — length, rotation, and rules are all identical regardless of variant. Phase 8 draws one generic weapon (a rotating line) with no variant-specific visual. Flagged in `WeaponClash.md`'s own TODO for review, the same way Color Expansion's unwired Intro Screen skill descriptions were flagged in Phase 7.
- **Weapon starting angle is `0` for every player**, not randomized. WeaponClash.md doesn't specify a starting angle, and since rotation begins immediately and looks identical either way over time, `0` was chosen as the simplest deterministic default rather than spending a second RNG draw on something with no documented gameplay effect.
- **Spawn rejection sampling.** "Never overlap. Never touch arena walls." (WeaponClash.md, Spawn) is implemented by redrawing a candidate position from the seeded RNG until it satisfies both constraints against every already-placed player, processed in fixed player-slot order (same determinism pattern Color Expansion's fixed processing order already established). A theoretical worst case (many large players in a small arena) could loop for a while; not a concern at the current placeholder `playerRadius`/`UNIVERSAL_ARENA_SIZE` values, and flagged here rather than adding an arbitrary retry cap that isn't in the docs.
- **HP/damage as literal spec values, not guessed placeholders.** `startingHp: 100` and `baseDamage: 1` are implemented exactly as WeaponClash.md states them, unlike `playerRadius`/`rotationSpeedRadiansPerSecond`/`weaponLength`/`spawnVelocityMagnitude`, which are genuine undecided numbers (already tracked as such in Todo.md) and are implemented as flagged, unplaytested placeholders in the same style as Color Expansion's own Phase 6 placeholders.
- **The "must fully leave before hitting again" cooldown** is tracked per attacker/victim pair as a `Set<string>` of currently-contacted opponent ids on each player, cleared the tick the weapon segment and that player's circle stop intersecting. This is a plain per-tick state check (segment×circle collision test), not a numeric cooldown timer — chosen because the rule is phrased geometrically ("must completely leave"), not as a fixed time duration.
- **No Hit Freeze, so no pause/flash on a successful hit.** WeaponClash.md's own Hit Freeze section and Simulation Loop section both now explicitly note this is deferred to Phase 9 (see the scope judgment call above) rather than silently missing.
- **Placeholder values were retuned after the first verification pass.** The initial guesses (`rotationSpeedRadiansPerSecond: 1.5`, `weaponLength: 60`, `spawnVelocityMagnitude: 90`) made weapon↔player contact so rare that a 2-player headless smoke test sometimes failed to resolve within 20 simulated minutes — technically still "correct" (nothing was broken; hits just almost never happened), but not a usable placeholder for a tool whose whole purpose is generating short watchable videos (see Blueprint.md, Project Vision). Retuned to `6`, `100`, and `180` respectively, which resolves a typical 2-player match in roughly 5–8 simulated minutes in testing — still fairly slow and still an unplaytested, unreviewed placeholder (same status every other number in this Config carries), but no longer pathological. Flagged here since it's a real finding from verification, not a guess made in a vacuum.

**Verification performed for Phase 8** (mirroring Phase 6/7's own verification practice):

- A full sandbox checkout of the entire repo, including every Phase 8 change, was assembled from scratch; `npm install` was run for real; `tsc -b` and `oxlint` (the project's real `.oxlintrc.json`) both ran for real.
- A headless runtime smoke test ran full Weapon Clash games to completion for 2, 3, and 4 players across multiple seeds, at the fixed 1000/60ms timestep. Confirmed: the same seed and roster always produce byte-identical results (every player's final HP, position, and velocity) on repeated runs; different seeds still terminate cleanly; every game ends with exactly one player remaining (or, in rare simultaneous-elimination edge cases, zero); no player ever spawns overlapping another or touching a wall; total HP removed from the arena never exceeds what the recorded hit count times `baseDamage` would predict (sanity-checking that damage is applied exactly once per fresh contact, not every tick a weapon happens to overlap a player).
- This smoke test is not part of the delivered files — a one-off verification script, not a permanent addition to the repo, same as Phase 6/7's own practice.

**Not implemented in Phase 8, and why:**

- **Weapon↔Weapon collision and rotation reversal, Hit Freeze, Sweep Test/anti-tunnelling, damage flash** — all explicitly Phase 9 ("Weapon Physics Polish") per Roadmap.md; see the scope judgment call above.
- **Weapon Clash's own Character Skills** — explicitly out of scope per Roadmap.md, Phase 8 ("Ignore Character Skills"); Phase 10 is Weapon Clash's own Skills phase, mirroring Phase 7 for Color Expansion.
- **Weapon variant selection UI** — see judgment calls above; no Menu wiring exists for any simulation-specific setting yet.
- **Playtesting/balancing the four new placeholder values** (`playerRadius`, `rotationSpeedRadiansPerSecond`, `weaponLength`, `spawnVelocityMagnitude`) — explicitly deferred, same as every prior phase's own placeholder values.

**Reviewed and approved**, per Roadmap.md's Development Rules ("Never continue to the next milestone without approval") — see "Update — Phase 8 approved, including Constant Movement Speed" near the top of this file, and "Pre-Phase 9 — Constant Movement Speed" above, for the full approval account. Phase 9 begins next.

## Decisions Made Along the Way

- SimulationManager was merged into SimulationEngine — no separate class (see Architecture.md).
- Character selection: the creator selects exactly which character fills each player slot, 2–4 slots (see Engine.md, Menu).
- Resolved a conflict in Architecture.md: engine renders, simulation only supplies state — `Render()` was removed from the `Simulation` type.
- Character colors in the registry are placeholder defaults from a shared palette (`CHARACTER_COLOR_PALETTE` in Colors.ts).
- `RenderableCharacter` (character + x/y, pixel space) lives in `engine/rendering/Renderer.ts`, not `/src/types`, since it's a rendering-only concept. `RenderableGrid`, `RenderableSquareCharacter`, and now `RenderableWeapon` follow the same placement logic.
- Grid-based simulations (Color Expansion) get their own rendering pipeline function, `renderGridFrame`; circle/physics-based simulations (Weapon Clash) get `renderCircleFrame` — both share `ArenaRenderer.ts`'s `drawArena` and the same letterbox/clear logic.
- **(Pre-Phase 7 session)** Skill hook interfaces are local per simulation, never shared or inherited across simulations.
- **(Pre-Phase 7 session)** Hooks are optional per character, with missing hooks treated as identity at the call site.
- **(Phase 7)** A hook's `TState` is a small, hook-specific context type, not the full simulation state.
- **(Pre-Phase 8, Physics Primitive Architecture)** `Physics.ts` operates only on generic primitives (`Vector2`, `Circle`, `Segment`) and generic operations on them — it never imports or references a simulation type.
- **(Pre-Phase 8, Physics Primitive Architecture)** `Circle` carries an optional `mass` (default 1).
- **(Pre-Phase 8, Weapon Clash Simulation Loop Design)** The full per-tick order — freeze timers → weapon rotation → movement/wall collision → player collision → weapon collision → weapon hits → statistics → elimination → win check — was settled before any Weapon Clash code was written, as the target end-state design.
- **(Phase 8)** The full Pre-Phase 8 design is being implemented across two phases, not one: Phase 8 implements the MVP subset Roadmap.md actually lists for it; Weapon↔Weapon collision, Hit Freeze, and Sweep Test are deliberately deferred to Phase 9, exactly where Roadmap.md already places them.
- **(Phase 8)** `startingHp`/`baseDamage` are literal spec values (100, 1); `playerRadius`/`rotationSpeedRadiansPerSecond`/`weaponLength`/`spawnVelocityMagnitude` are genuine unplaytested placeholders, following Color Expansion's own Phase 6 pattern.
- **(Phase 8)** Weapon variant selection (Sword/Axe/Bow/Spear) is not implemented — no Menu wiring exists for it, and no documented mechanic depends on which variant is drawn.
- **(Phase 8)** The "weapon must fully leave before hitting again" rule is tracked as a per-pair contact flag (cleared when the segment/circle stop intersecting), not a time-based cooldown, since the rule is phrased geometrically in WeaponClash.md.
- **(Pre-Phase 9)** Movement speed is a core gameplay rule, not Phase 9 polish: every living player's velocity is re-normalized back to a constant configured speed after each tick's physics resolves, so speed never drifts from collisions — only direction changes, physics-driven exactly as before. Implemented via a new `enforceConstantMovementSpeed` step in `WeaponClash.ts`'s `update()`, run after wall Reflection and player Bounce, before weapon hits.
- **(Pre-Phase 9)** `WeaponClashConfigShape`'s `spawnVelocityMagnitude` was renamed to `movementSpeedPixelsPerSecond` (no numeric value changed) once it became the constant speed enforced every tick rather than a spawn-time-only value — now mirroring Color Expansion's own `movementSpeedCellsPerSecond` naming.

## For a New Chat

Read Blueprint.md first, then this file, before anything else.

Phase 1 through Phase 7 are implemented and approved by the project owner in full. **Phase 8 (Weapon Clash MVP) is now implemented and approved**, together with the Pre-Phase 9 Constant Movement Speed addition on top of it (see "Phase 8 — Weapon Clash MVP" and "Pre-Phase 9 — Constant Movement Speed" above for the full account of both). Phase 9 ("Weapon Physics Polish") has not yet started.

Weapon Clash is now watchable end-to-end for its MVP subset of mechanics: physics-driven movement, wall and player bouncing, weapon rotation, weapon-hit damage (once per fresh contact), elimination at 0 HP, and a last-player-standing win condition. Not yet present: weapon↔weapon collision/rotation-reversal, Hit Freeze (pause + flash on hit), anti-tunnelling Sweep Test, damage flash, Weapon Clash's own Character Skills, and weapon variant selection — all deliberately deferred to Phase 9 or Phase 10 per Roadmap.md.

**On top of Phase 8, a Pre-Phase 9 session added Constant Movement Speed** as a core gameplay rule (see "Pre-Phase 9 — Constant Movement Speed" above): every living player's velocity is re-normalized back to the same constant configured speed at the end of every tick's physics, so a player's speed can never permanently drift from collisions — only direction changes, exactly as physics decides. `Config.ts`'s `spawnVelocityMagnitude` was renamed to `movementSpeedPixelsPerSecond` as part of this (no numeric value changed).

`src/engine/core/Physics.ts` now holds `Circle`, `Segment`, circle×circle Collision, segment×circle Collision, Bounce, and Reflection — but not yet segment×segment Collision or Sweep Test, both reserved for Phase 9.

Everything else under `src/engine/audio` and `src/engine/recording` is still an empty placeholder. A file existing does not mean it is implemented; check actual file contents, not just the file tree, before assuming any phase is complete.

Update "Current Phase" and "Completed Phases" above after every milestone (see Roadmap.md, Development Rules).
