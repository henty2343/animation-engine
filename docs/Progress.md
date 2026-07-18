# Progress

Last updated: after Phase 7 (Color Expansion Skills) was reviewed, tested, and approved by the project owner, after a follow-up Pre-Phase 8 session settled the Physics primitive architecture, and after a further Pre-Phase 8 session locked down Weapon Clash's full simulation loop and Hit Freeze mechanic — all still ahead of any Weapon Clash implementation.

**Update — Phase 7 approved.** The project owner has reviewed Phase 7 directly and tested it, with no errors. Phase 7 (Color Expansion Skills) is now considered complete, joining Phases 1–6 as fully approved work.

**Update — Pre-Phase 8 cleanup session:** three small, documentation/naming-only changes were made after Phase 7 was implemented, at the project owner's request, directly responding to the Phase 7 review's own "architectural weaknesses" findings. None of them touch gameplay. See "Pre-Phase 8 — Architecture Cleanup," under Current Phase below, for the full account.

**Update — Pre-Phase 8 Physics Primitive Architecture session:** following Phase 7's approval, the project owner requested a firmer architectural rule for the still-unimplemented `engine/core/Physics.ts`: it must operate only on generic geometric primitives (`Vector2`, `Circle`, `Segment`) and generic operations on them (Collision, Bounce, Reflection, Sweep Test, Intersection) — never on simulation concepts like Player, Weapon, Enemy, or Projectile. See "Pre-Phase 8 — Physics Primitive Architecture," under Current Phase below, for the full account. No code was written this session — `Physics.ts` remains an empty placeholder, exactly as before — this only sharpens the boundary the earlier Pre-Phase 8 cleanup session had already agreed to in principle.

**Update — Pre-Phase 8 Weapon Clash Simulation Loop Design session:** immediately after the Physics Primitive Architecture session, the project owner and Claude settled the full per-tick simulation loop for Weapon Clash — the exact step order, which parts belong to `engine/core/Physics.ts` versus `src/simulations/WeaponClash/`, a redefinition of Hit Feedback into a proper Hit Freeze hit-stop mechanic, and the flow governing player velocity (chosen once at spawn, never re-decided, only ever modified by collision response). See "Pre-Phase 8 — Weapon Clash Simulation Loop Design," under Current Phase below. No code was written this session; `docs/WeaponClash.md` was updated to reflect the agreed design ahead of implementation, and one judgment call (whether a frozen player blocks as a static obstacle or is excluded from collision entirely) is flagged for the project owner's confirmation before Phase 8 implementation begins.

## Current Phase

**Phase 7 — Color Expansion Skills — implemented, reviewed, and approved by the project owner.**

Heavy, Swift, Sleeper, and Trickster are all implemented exactly as documented in ColorExpansion.md and the Pre-Phase 7 architecture session, wired into the real simulation via `src/simulations/ColorExpansion/Skills.ts`'s local hook interface (`modifySpeed`, `modifyCapture`, `modifyPathChoice`). See "Phase 7 — Color Expansion Skills" below for the full account, judgment calls, and verification performed. The project owner has since reviewed this phase directly and tested it with no errors — Phase 7 is complete.

**Phase 8 (Weapon Clash MVP) has still not been started.** This is now a deliberate pause at the project owner's explicit instruction — first to settle the `Physics.ts` architecture (see "Pre-Phase 8 — Physics Primitive Architecture" below), and then to settle Weapon Clash's own per-tick simulation loop (see "Pre-Phase 8 — Weapon Clash Simulation Loop Design" below) — before any Weapon Clash code is written, rather than a gating requirement left over from Phase 7's review, which is now satisfied.

### Pre-Phase 7 fix (start of this session)

`src/types/Skill.ts`'s doc comment previously read "Each simulation's Skills.ts implements one Skill per character" — stale phrasing from before the hook-interface architecture was locked down (see "Pre-Phase 7 — Skill Architecture & Documentation" below), flagged at the end of that session as a one-line fix to make before real Phase 7 work began. Corrected to describe the actual model: each simulation builds its own local hook interface out of the generic `Skill<TState, TValue>` shape, and a character implements zero, one, or several of that interface's optional hooks. No behavior change — doc comment only.

### Pre-Phase 7 — Skill Architecture & Documentation

**Architecture decided:**

- The generic `Skill<TState, TValue>` type (`src/types/Skill.ts`) stays in `/src/types` as a completely generic function shape. It defines only the shape of a single hook and must never know anything about any simulation-specific mechanic (movement, capture, pathfinding, damage, weapons, grids, etc.).
- Each simulation defines its own **local hook interface** inside its own `Skills.ts`, built from that generic shape. Hook names belong only to the simulation that defines them — Color Expansion's `modifySpeed` / `modifyCapture` / `modifyPathChoice` are not shared with, inherited by, or expected to match any other simulation's hooks. Weapon Clash will define its own hook interface, with its own names, once it is designed (not yet — Weapon Clash remains out of scope).
- Hooks are **optional**, on a per-character, per-hook basis. A character only implements the hooks its skill actually modifies; wherever a simulation calls a hook, a missing hook is treated as identity — the base value is used unmodified. This was chosen over mandatory pass-through implementations because it keeps each character's definition proportional to what it actually changes, avoids boilerplate, and means adding a new hook to a simulation's interface later never requires touching every character that doesn't use it.
- `docs/Skills.md` was rewritten to stay purely engine-level documentation: it states the contract (read-only, returns a modified value, never mutates state, passive-only, modifies-not-invents a mechanic) and the rule that every simulation defines its own local hook interface — but it no longer names any simulation-specific hooks. Those live in each simulation's own document instead (`ColorExpansion.md` gained a new **Skill Hooks** section).
- A new rule, worded by the project owner, was added to `Skills.md` under "Adding a Skill to a New Simulation," directly before the "document before implementing" bullet: *"A simulation should define the smallest hook interface necessary. Introduce a new hook only when an existing hook cannot express the intended behavior."*

**Color Expansion gameplay-spec gaps closed** (so Phase 7 implementation won't need to invent behavior mid-flight):

- **Heavy** — if the additional capture cell (one step beyond the cell just entered, in the current movement direction) falls outside the grid, the extra capture attempt simply does nothing. No wraparound, no error, no alternate cell chosen.
- **Swift** and **Sleeper** — treated as pure balance/config questions, following the same placeholder-config pattern Phase 6 already established for `gridSize` / `movementSpeedCellsPerSecond`. New placeholder entries were added to `docs/Todo.md`'s Balance section: Swift movement multiplier; Sleeper sleep duration, rush duration, and rush multiplier. Now implemented — see Phase 7 below.
- **Trickster** — settled on a **two-bonus** design (not three). The originally-listed "Faster movement" and "Temporary movement burst" ideas were found to collapse into the same mechanic once both bonuses last until the next reroll (same duration, differing only in magnitude) — keeping them as two separate bonuses would have been redundant rather than meaningfully different. The two bonuses are now **Speed** and **Path Preference**, mapping directly onto the `modifySpeed` / `modifyPathChoice` hooks. Mechanic: Trickster rerolls its single active bonus on a timer, always via the simulation's seeded RNG (keeping the simulation deterministic); exactly one bonus is active at a time; the first bonus is rolled immediately at spawn so Trickster is never without one. Reroll interval and the odds between the two bonuses were both still-undecided placeholder values at the time — now implemented, see Phase 7 below.

**Files updated in that session (documentation only):**

- `docs/Skills.md` — rewritten per the architecture above; no simulation-specific hook names remain in this file; the "smallest hook interface necessary" rule added.
- `docs/ColorExpansion.md` — gained a new **Skill Hooks** section (`modifySpeed`, `modifyCapture`, `modifyPathChoice`, each documented with what it modifies and when it's called); Heavy's out-of-grid capture behavior documented; Trickster's section rewritten around the two-bonus (Speed / Path Preference) design described above.
- `docs/Todo.md` — new placeholder Balance entries added under Color Expansion for Swift's movement multiplier and Sleeper's sleep duration / rush duration / rush multiplier, alongside the already-existing Trickster reroll-interval and bonus-odds placeholders.
- `docs/Characters.md` — consistency-checked against the above. The per-simulation one-line summaries still accurately describe the finalized mechanics and were left unchanged. One stale line was corrected: "One unique Skill implementation per simulation" was reworded to describe the hook-interface model.

**Flagged, not changed at the time:** `src/types/Skill.ts`'s doc comment still contained the stale "one Skill per character" phrasing — deliberately left as-is in that documentation-only session and flagged for a one-line fix at the start of Phase 7 proper. **Fixed at the start of this session** — see above.

**Verification:** that session was documentation-only — no code was changed, so no `tsc -b` / `oxlint` / `vite build` run was needed or performed.

### Pre-Phase 8 — Architecture Cleanup

Prompted directly by the Phase 7 review's own "Did Phase 7 expose architectural weaknesses?" findings. Three small, documentation/naming-only changes, requested explicitly by the project owner, with no gameplay or behavior change and no code paths altered:

1. **`Skill<TState, TValue>` renamed to `Skill<TContext, TValue>`** (`src/types/Skill.ts`). The old name suggested every hook receives the entire simulation state; Phase 7 actually gave every hook a small, hook-specific context object instead (see `Skills.ts`'s own doc comment). `Skill.ts`'s doc comment now states explicitly that `TContext` is deliberately not required to be the full simulation state. The function's own parameter name was also renamed from `state` to `context` for the same reason — a purely cosmetic change, since parameter names in a function type carry no runtime behavior and every existing call site already passes its arguments positionally. Updated everywhere the type name appeared in documentation: `docs/Skills.md` and `src/simulations/ColorExpansion/Skills.ts`'s doc comments.
2. **Randomness-in-hooks rule made explicit** (`docs/Skills.md`, new Contract subsection "Randomness"). Trickster's Path Preference bonus (Phase 7) already established the pattern of a hook drawing from the simulation's seeded `Random` to break a tie, but the rule was never written down as a rule — it was a one-off judgment call (see Phase 7's own judgment calls above). `Skills.md` now states explicitly: a hook may consume randomness from the simulation's seeded RNG when required; a hook must never create or seed its own RNG; a hook must never mutate simulation state directly. This documents the existing Color Expansion implementation as-is — nothing about `Skills.ts`'s behavior changed.
3. **`Simulation.update()`'s mutation contract documented** (`src/types/Simulation.ts`). Both Color Expansion's `update()` (and, expected, Weapon Clash's own once written) mutate their `state` object in place and return the same reference, for performance — previously an implicit convention repeated as a judgment call in each simulation's own comments, never stated on the shared interface itself. The doc comment now says explicitly that implementations may mutate `state` in place and return the same reference, and that immutable updates are not required. No behavior change; the interface's method signatures are unchanged.

**Explicitly left alone this session**, per the project owner's instruction to wait for a second real simulation (Weapon Clash) before abstracting further: the optional-hook identity fallback (still repeated at each call site in `ColorExpansion.ts`), the shared rendering preamble in `Renderer.ts` (still duplicated between `renderFrame`/`renderGridFrame`), the hook-registry abstraction, and Progress.md archival.

**Physics.ts boundary, decided ahead of Phase 8 (no code written yet):** reviewed and agreed before any Weapon Clash implementation begins, so Phase 8 doesn't have to make this call under time pressure. `engine/core/Physics.ts` is reserved for genuinely simulation-agnostic primitives only: vector math, circle-circle collision detection, wall/boundary collision, collision response (bounce/reflection), and continuous/swept collision to prevent tunnelling. Everything specific to Weapon Clash's own rules — weapon attachment and rotation, HP, damage, hit cooldown (a weapon must fully leave a player before it can hit them again), freeze-frame hit feedback, elimination, and any other rule from WeaponClash.md — belongs inside `src/simulations/WeaponClash/`, never in `engine/core/Physics.ts`, mirroring how Color Expansion's own BFS pathfinding (`Grid.ts`) stayed out of the engine entirely. This is a boundary decision, not an implementation — `Physics.ts` remains an empty placeholder until Phase 8 actually begins.

**Verification:** this session touched documentation and doc-comments only (`src/types/Skill.ts`, `src/types/Simulation.ts`, `docs/Skills.md`, `src/simulations/ColorExpansion/Skills.ts`'s comments, and this file). No gameplay file changed. A type-parameter/parameter rename inside a type alias cannot affect compiled JS output or any call site's type-check result, since every call site already used positional arguments — so no `tsc -b` / `oxlint` re-run was strictly necessary, though the project owner may still want to run it as routine hygiene before Phase 8 begins.

### Pre-Phase 8 — Physics Primitive Architecture

Requested by the project owner immediately after Phase 7's approval, before any Weapon Clash code is written. Sharpens the `Physics.ts` boundary already agreed in the "Pre-Phase 8 — Architecture Cleanup" session above (engine/core/Physics.ts holds "genuinely simulation-agnostic primitives only") into an explicit primitive vocabulary and a pure-function contract.

**The rule:** `Physics.ts` must never know what a Player, Weapon, Enemy, or Projectile is — not even indirectly, by importing a type from `/src/types` or from any simulation's own folder. It operates exclusively on:

- **Vector2** — a 2D vector (x, y). The type itself lives in `/src/types` (used by the engine and, once built, by Weapon Clash — see Architecture.md's placement rule: shared concepts used by the engine or two-or-more simulations belong in `/types`). Vector math functions that operate on it (add, subtract, scale, normalize, rotate, dot) live in `/src/shared`, alongside `Math.ts`, since — like the rest of that folder — they have no engine-specific dependency.
- **Circle** — center (`Vector2`) + `radius`, with an optional `mass` (defaulting to 1). Used for anything represented as a circle — Weapon Clash's players today (see WeaponClash.md, Players — "Represented by circles"), potentially other simulations later. Mass is included now, even though WeaponClash.md only specifies every player is the same size (not necessarily the same mass), because a correct elastic-collision formula naturally takes mass as a parameter — defaulting it to 1 costs nothing today and avoids having to rewrite the bounce math if a future simulation needs unevenly-weighted circles.
- **Segment** — two endpoints (`Vector2`, `Vector2`). Needed because Weapon Clash's weapon is not a circle: WeaponClash.md's Weapons section describes it as "attached to player edge, rotates around player" with a fixed length — a rotating line, not a circle. Without `Segment`, the primitive vocabulary would only cover player-vs-player collision, not the actual weapon-hit mechanic the simulation is built around.
- **Collision** — detection only, no response: circle×circle (player↔player), segment×circle (weapon↔player — the actual hit test), segment×segment (weapon↔weapon).
- **Bounce** — dynamic-dynamic collision response (two moving circles exchanging velocity, e.g. player↔player).
- **Reflection** — dynamic-static collision response (one moving circle off a fixed surface, e.g. off an arena wall).
- **Sweep Test** — continuous collision detection, needed to prevent tunnelling at high velocity (see WeaponClash.md, Physics — "No tunnelling").
- **Intersection** — raw geometric point/overlap queries with no response computed (a building block Collision/Sweep Test are built on, also usable standalone).

**Every function is pure.** It takes primitives in and returns primitives out — never mutates a caller's object, never knows what the caller intends to do with the result. For example (illustrative signatures — not yet implemented; `Physics.ts` remains an empty placeholder):

```ts
resolveCircleCollision(a: Circle, velocityA: Vector2, b: Circle, velocityB: Vector2)
  → { velocityA: Vector2, velocityB: Vector2 }

segmentCircleIntersect(weapon: Segment, target: Circle)
  → { hit: boolean, point?: Vector2 }
```

A simulation — Weapon Clash, in Phase 8 — converts its own state (its `WeaponPlayer`, its weapon) into these primitives, calls `Physics.ts`, reads the result back, and decides what it means (HP loss, freeze-frame feedback, elimination, reversed weapon rotation, etc.). `Physics.ts` itself never makes any of those decisions — this mirrors exactly how `Grid.ts`'s BFS returns candidate cells and `ColorExpansion.ts` decides what claiming one of them means (see `Grid.ts`; Architecture.md's Simulation section: "A simulation never modifies another simulation").

**Folder placement, applying Architecture.md's existing placement rule** ("`/types` only if it has no runtime behaviour, `/shared` only if it has no engine-specific dependency, `/engine` only if it is part of the tick loop or physics/rendering pipeline itself"):

- `Vector2` (interface only) → `/src/types`
- Vector2 math functions (pure, no engine dependency) → `/src/shared`
- `Circle`, `Segment`, and every Collision/Bounce/Reflection/Sweep-Test/Intersection function → `/src/engine/core/Physics.ts` itself

**Not implemented this session.** `Physics.ts`, `Vector2`, and every function above remain unwritten — this session settled the vocabulary and contract only, exactly as the original `Physics.ts` boundary was agreed ahead of code in the prior Pre-Phase 8 session. `docs/Architecture.md`'s Engine and new Physics sections were updated to reflect this vocabulary so Phase 8 doesn't have to re-derive it under time pressure.

**Verification:** documentation-only session — no code changed, so no `tsc -b` / `oxlint` / `vite build` run was needed.

### Pre-Phase 8 — Weapon Clash Simulation Loop Design

Requested by the project owner immediately after the Physics Primitive Architecture session above, before any Phase 8 code was written. Expands WeaponClash.md's original 7-step Simulation Loop into an explicit, ordered per-tick sequence, and settles exactly which part of each step belongs to `engine/core/Physics.ts` versus `src/simulations/WeaponClash/` — the same boundary-before-code discipline the Physics Primitive Architecture session applied to the primitive vocabulary itself.

**The agreed per-tick order** (see `docs/WeaponClash.md`'s rewritten Simulation Loop section for the authoritative version):

1. **Update Physics** — (a) advance freeze timers, (b) weapon rotation for non-frozen players, (c) player movement and wall collision for non-frozen players.
2. **Resolve Player Collisions** — between non-frozen players only.
3. **Resolve Weapon Collisions** — reverses both weapons' rotation direction; between non-frozen players only.
4. **Resolve Weapon Hits** — checked in a fixed player order; a player frozen earlier in the same pass is excluded from every later check in that pass, as either attacker or victim.
5. **Update player statistics.**
6. **Remove eliminated players.**
7. **Check if the simulation has ended.**

**Why this order:** bodies settle (movement, player collision) before weapons are judged against them, since a weapon's Segment is only meaningful once its wielder's position is final for the tick. Weapon↔weapon resolves before weapon↔player, matching WeaponClash.md's original step order, and means a rotation-direction reversal from a weapon clash takes effect starting next tick rather than retroactively changing the segment already used for this tick's hit check.

**Physics.ts / WeaponClash boundary, per step** — every physics-touching step follows the same shape already established by Color Expansion's Grid.ts: WeaponClash converts its own state into a `Circle`/`Segment`, calls a pure Physics.ts primitive, reads back the result, and decides what it means. Physics.ts itself never decides damage, freeze, elimination, or rotation reversal.

- Freeze timers, weapon rotation — pure `WeaponClash/` state; no geometry involved.
- Movement + wall collision — Physics.ts's Sweep Test and Reflection; WeaponClash applies the returned velocity/position.
- Player↔player collision — Physics.ts's Sweep Test, Collision (circle×circle), and Bounce; WeaponClash applies the result and confirms it means no HP change.
- Weapon↔weapon collision — Physics.ts's Sweep Test, Collision (segment×segment), and the same Bounce primitive (applied to the players' Circles, not the weapons); the rotation-direction reversal itself is plain `WeaponClash/` state, since Physics.ts has no concept of "rotation direction."
- Weapon↔player hit — Physics.ts's Collision (segment×circle) for detection only; hit-cooldown tracking, damage, and freeze-triggering are all `WeaponClash/` gameplay state.
- Statistics, elimination, and win-condition detection are `WeaponClash/` in full, feeding the existing generic engine systems (`StatisticsStore`, `SimulationEngine.isComplete()`) the same way Color Expansion already does.

**Hit Freeze redefined.** WeaponClash.md's original "Hit Feedback" section (attacker/victim freeze + flash) is renamed and expanded into a full hit-stop contract: on a successful hit, both attacker and victim freeze for 0.1s and flash; while frozen, a player has no movement, no weapon rotation, no collision response, and cannot be involved in any further hit as either attacker or victim — including later in the same tick the triggering hit occurred. When the freeze ends, the player resumes with the exact velocity, direction, and rotation state they had before the freeze; nothing is reset or recalculated. This is deliberately a cosmetic hit-stop, not a gameplay stun — WeaponClash.md is explicit that "the goal is to make every hit feel impactful and readable without turning the freeze into a gameplay mechanic."

**Judgment call flagged for review:** whether a frozen player still acts as a static, unmovable obstacle for a still-moving player's collision check, or is excluded from collision detection entirely (allowing a brief, cosmetically-negligible overlap for up to the 0.1s freeze window, with normal collision resuming the instant they unfreeze). WeaponClash.md's own wording — "no collision response" — was read literally as excluding both parties from the check, and `docs/WeaponClash.md` now documents pass-through behavior on that basis. This is called out explicitly, the same way Phase 6/7 flagged their own tie-break and elimination-edge-case judgment calls, since the doc's wording doesn't unambiguously rule out the static-obstacle reading, and it's a one-line change in `WeaponClash.md`'s Hit Freeze section (and in whichever `WeaponClash/` file implements collision skipping) to switch to it if the project owner prefers that instead.

**Velocity flow clarified**, since Weapon Clash — unlike Color Expansion — has no AI/target-selection step at all (WeaponClash.md, Physics: "Players never move by AI"):

- A player's movement direction and magnitude are chosen exactly once, at `createInitialState`, from the run's seeded `Random` (see Spawn — equal magnitude, random direction). This is the only place a velocity value is *chosen* rather than *derived*.
- Every tick's movement step reads whatever velocity is already stored from the end of the previous tick (or the spawn value, on tick 1) — there is no per-tick "decide direction" call to re-derive it.
- Physics.ts modifies velocity in exactly two places, both collision responses: wall Reflection (movement step) and Bounce (player↔player and weapon↔weapon collision steps). Each returns a new velocity that WeaponClash writes back into the player's state.
- A player's velocity can legitimately be rewritten more than once in a single tick (e.g., a wall bounce followed by a player collision), resolved sequentially in fixed processing order — never simultaneously — which is what keeps a given seed's outcome reproducible.
- Whatever velocity is sitting in a player's state at the very end of the tick, after every collision response that tick has had its chance to run, is exactly what next tick's movement step reads. There is no separate "current" vs. "next" velocity buffer — this mirrors `ColorExpansionState`'s existing mutate-in-place convention.
- A frozen player's stored velocity is never read for movement or overwritten by collision response during the freeze window, so "resume with the exact same velocity" on unfreeze is true by construction, not something that needs to be explicitly restored.

**Files updated this session (documentation only):** `docs/WeaponClash.md` — Physics section gained a Velocity subsection; "Hit Feedback" renamed and expanded into "Hit Freeze"; Simulation Loop section rewritten with the full per-tick order above; Player Collision, Weapon Collision, and Weapon Hit sections each gained a one-line cross-reference noting that a frozen player is excluded (see Hit Freeze). `docs/Progress.md` — this entry.

**Not implemented this session.** `Physics.ts` and every file in `src/simulations/WeaponClash/` remain empty placeholders — this session settled the design only, per Blueprint.md's "every new simulation must be documented before implementation" rule, exactly as the Physics Primitive Architecture session did for the primitive vocabulary. Phase 8 implementation (Config placeholders, Todo.md entries, then Physics.ts, then the simulation itself) begins once the frozen-collision judgment call above is confirmed.

**Verification:** documentation-only session — no code changed, so no `tsc -b` / `oxlint` / `vite build` run was needed.

## Completed Phases

### Phase 1 — Foundation

Implemented:

- Shared types: `src/types/Arena.ts`, `Character.ts`, `Player.ts`, `Simulation.ts`, `Skill.ts`
- Shared runtime utilities: `src/shared/Random.ts` (seeded deterministic PRNG), `Math.ts`, `Colors.ts`, `Constants.ts`, `Settings.ts`
- Character registry: `src/characters/Characters.ts` (Heavy, Swift, Sleeper, Trickster)
- Engine foundation: `src/engine/core/SimulationEngine.ts` — class shell only (load/get simulation/get state). The tick loop and start/stop/restart/reset lifecycle are deliberately not implemented yet; those are Phase 2 and Phase 3.

No gameplay was implemented, per the Phase 1 deliverable.

Everything else under `src/engine`, `src/menu`, `src/components`, and `src/simulations` is still an empty placeholder.

### Phase 2 — Rendering

Implemented:

- `src/engine/rendering/ArenaRenderer.ts` — draws the square arena background and border for a given `Arena`.
- `src/engine/rendering/CharacterRenderer.ts` — draws one character as a colored circle at a given position. This shape is a simulation-agnostic placeholder; each simulation's real representation (squares for Color Expansion, circles for Weapon Clash — see ColorExpansion.md / WeaponClash.md, Players) arrives with that simulation.
- `src/engine/rendering/Renderer.ts` — the shared rendering pipeline (`renderFrame`): clears the canvas, draws the arena, then draws every character on top. Also defines `RenderableCharacter` (character + x/y), an engine/rendering-only concept, distinct from any simulation's own state shape.
- `src/engine/core/SimulationEngine.ts` — added the requestAnimationFrame tick loop: `startLoop(onFrame)` / `stopLoop()`, plus a private `tick` that computes elapsed time each frame and invokes the caller's render callback. Deliberately does not call `Simulation.update()` — the fixed-timestep hook into this same loop is Phase 3. Also gave `SimulationEngine` a default type parameter (`TState = unknown`) so it can be instantiated before a simulation is loaded.
- `src/components/Arena/Arena.tsx` — mounts the canvas, starts the engine's tick loop on mount and stops it on unmount, drawing every frame via `renderFrame`. Contains no drawing logic itself (see Architecture.md, Components).
- `src/App.tsx`, `src/App.css` — replaced the Vite template content (hero image, counter, docs/social links) with a minimal wrapper mounting `<Arena />`, so the rendering pipeline is visible when running the dev server.

No gameplay or simulation logic was implemented, per the Phase 2 deliverable.

### Phase 3 — Simulation Lifecycle

Implemented, entirely within `src/engine/core/SimulationEngine.ts`:

- `start(seed, onFrame)`, `stop()`, `restart()`, `reset()`, `isRunning()` — the full run lifecycle, living directly on `SimulationEngine` (no separate `SimulationManager`).
- Fixed timestep: `tick()` calls a private `advanceSimulationStep(deltaTimeMs)` before invoking the render callback, always advancing `Simulation.update()` by exactly `FIXED_TIMESTEP_MS` (1000/60) regardless of the actual frame's `deltaTimeMs` — this is what makes the eventual outcome independent of rendering FPS or machine performance. It stops the run immediately via `stop()` the moment `Simulation.isComplete()` reports true.
- The render callback is captured at the top of `tick()`, before `advanceSimulationStep()` runs, so the frame on which a run completes still renders once with the final state.

Verified: `tsc -b`, `oxlint`, and `vite build` all pass cleanly with this change.

### Phase 4 — Shared Systems

Implemented:

- `src/engine/statistics/StatisticsStore.ts` — generic per-player statistics store (`StatisticsStore<TStats>`), with `set`/`update`/`get`/`has`/`delete`/`getRanked(comparator)`. `TStats` and the comparator are always supplied by the caller.
- `src/engine/statistics/Ranking.ts` — `descendingBy(selectValue)` / `ascendingBy(selectValue)` generic comparator builders.
- `src/shared/Config.ts` — generic reusable configuration container (`Config<T>`): `defaults` + optional `overrides`, frozen, with `get`/`getAll`/`withOverrides`.

Removed from scope, by project owner decision: "Shared Helpers" (see original Phase 4 notes) — the project owner determined a generic helpers module is exactly the kind of speculative abstraction the project's philosophy avoids. This rule is now written into `docs/CLAUDE.md` and `docs/Architecture.md`.

No UI, engine tick, or simulation was wired up to either new system in this phase — that began once a real simulation had stats to report (see Phase 6 below, "Rendering / UI wiring").

Verified by the project owner: `npm run build` and `npm run lint` both completed with no errors. Phase 4 is approved.

### Phase 5 — Shared UI

Implemented every item in Roadmap.md's Phase 5 list: the simulation registry (`src/types/SimulationDescriptor.ts`, `src/simulations/registry.ts`), the Menu (`src/menu/*`), the aspect ratio system (`src/shared/AspectRatio.ts`), the Arena component (`src/components/Arena/Arena.tsx`), and the shared UI phase lifecycle (`src/engine/ui/UIManager.ts`) plus its React screens (`src/components/UI/IntroScreen.tsx`, `StatsPanel.tsx`, `WinnerScreen.tsx`) and shared presentational primitives (`src/components/Shared/Button.tsx`, `Card.tsx`, `SelectableTile.tsx`).

Explicitly not implemented in Phase 5, and why: a working end-to-end Start → Intro → Simulation → Winner flow, since no `Simulation<TState>` implementation existed anywhere in the repo yet (Color Expansion and Weapon Clash were both still empty placeholder files). Every Phase 5 piece was built and tested, ready to be wired to a real simulation once one existed — see Phase 6 below for that wiring.

Verified in this session (Phase 5's own session): a throwaway sandbox checkout was assembled from scratch, `npm install` was run for real, and `tsc -b`, `oxlint`, and `vite build` were all run for real against the complete Phase 5 codebase — all three passed cleanly.

### Phase 6 — Color Expansion MVP

**Gameplay logic** (approved by the project owner in an earlier session):

- `src/simulations/ColorExpansion/Grid.ts` — the grid data structure (`GridState`) and every operation on it: `createGrid`, `isInsideGrid`, `getCellOwner`, `claimCell`, `hasAnyNeutralCell`, and `findNextStepTowardNearestNeutralCell` (BFS to the nearest neutral cell, fixed up/right/down/left neighbor order for deterministic tie-breaks).
- `src/simulations/ColorExpansion/Config.ts` — `COLOR_EXPANSION_CONFIG`, holding two **temporary placeholder** balance values: `gridSize: 20` and `movementSpeedCellsPerSecond: 4` (unplaytested — see Todo.md).
- `src/simulations/ColorExpansion/ColorExpansion.ts` — `createColorExpansionSimulation(players)`, a factory returning a `Simulation<ColorExpansionState>`, plus `computeColorExpansionStats(state)` (live per-player territory count/percentage, feeding `engine/statistics`).

Verified in that session: `tsc`, `oxlint`, and a compiled runtime check simulating 2/3/4-player games to completion at the fixed 1000/60ms timestep, confirming determinism, correct termination, and correct final board state.

Judgment calls made (flagged for review): the fixed spawn-corner winding order (TL→TR→BR→BL, first N used), the fixed BFS neighbor tie-break order (up/right/down/left), same-cell race resolution via fixed slot-order processing, and mutating `ColorExpansionState` in place rather than cloning it every tick.

**Rendering / UI wiring (that session)** — approved by the project owner as the condition for closing Phase 6. Implements exactly the five things requested: render the grid, render territory, render square players, run it through the existing `SimulationEngine`, and trigger the winner screen on completion. No Skills, no polish, no particles, no sound, no additional gameplay changes.

- `src/shared/Constants.ts` — added `UNIVERSAL_ARENA_SIZE = 480`, the same placeholder pixel size the Phase 2 demo arena already used, now in one shared location (see Engine.md, Arena — "Same dimensions for every simulation") instead of duplicated locally.
- `src/engine/rendering/GridRenderer.ts` (**new**) — `drawGrid(ctx, grid, cellPixelSize, offset)`, a simulation-agnostic function drawing a `RenderableGrid` (a `size` plus a `cells[y][x]` matrix of hex colors or `null` for neutral). Knows nothing about players, ownership, or territory — mirrors `ArenaRenderer.ts` and `CharacterRenderer.ts` in staying purely a drawing function.
- `src/engine/rendering/CharacterRenderer.ts` — added `drawCharacterSquare(ctx, character, x, y, size)` alongside the existing circle `drawCharacter`, matching ColorExpansion.md's Players section ("Represented by squares. Same size as one grid cell.").
- `src/engine/rendering/Renderer.ts` — added `RenderableSquareCharacter` (a character positioned in grid-cell units, supporting fractional mid-transit positions) and `renderGridFrame(ctx, canvas, arena, arenaOffset, grid, squareCharacters)`, a second pipeline alongside the existing `renderFrame`: clear, letterbox, draw the arena, draw the colored grid, draw every player as a square. Still the only place drawing order is decided (see Architecture.md, Rendering).
- `src/simulations/ColorExpansion/ColorExpansion.ts` — added `mapColorExpansionStateToRenderables(state)`, mapping a `ColorExpansionState` into a `RenderableGrid` + `RenderableSquareCharacter[]`. This is a pure function with no canvas/drawing calls of its own — it mirrors `computeColorExpansionStats` exactly (state → generic display shape), keeping with "Engine renders. Simulation only supplies state." (Architecture.md, Rendering). Player positions interpolate between their current cell and in-progress target using `moveProgress` (ColorExpansion.md, Visual Rules — "Smooth movement"); territory cell colors are never interpolated, since ownership changes instantly (Visual Rules — "Instant cell recolor").
- `src/components/Arena/ColorExpansionArena.tsx` (**new**) — mounts the canvas and actually drives Color Expansion: `SimulationEngine.load(createColorExpansionSimulation(players))`, `engine.start(seed, onFrame)`, and inside `onFrame`: maps state to renderables and calls `renderGridFrame`, feeds `computeColorExpansionStats` into a real `StatisticsStore` (first real use of that Phase 4 system) ranked via `descendingBy`, reports the ranked `PlayerStatDisplay[]` up to the caller every tick, and — once `engine.isRunning()` goes false (the tick `SimulationEngine` itself stops the loop on completion) — calls `onComplete()` exactly once.
- `src/components/Arena/Arena.tsx` — small edit: now reads `UNIVERSAL_ARENA_SIZE` from `shared/Constants.ts` instead of a locally hardcoded `480`, so the Phase 2 demo and Color Expansion's real arena can never drift apart. Still used as-is for any simulation without a real implementation (Weapon Clash).
- `src/App.tsx` — on Start, now builds the `Player[]` roster from the Menu's selection (memoized so its identity stays stable across the frequent re-renders live stats cause) and a fresh random seed (Engine.md, Determinism — a new run gets a new seed, chosen by whoever starts the run). While `phase === 'running'`, renders `ColorExpansionArena` (for `simulationId === 'color-expansion'`) or the old demo `Arena` otherwise. `onStatsUpdate` feeds `StatsPanel`; `onComplete` calls `uiManager.showWinner()`, which — since `phase === 'winner'` is checked before the run-view — unmounts `ColorExpansionArena` and shows `WinnerScreen` with the final ranked stats.

Judgment calls made this session (flagged for review, same as prior phases):

- **Player square size.** Drawn smaller than a full grid cell. A player's current cell is always their own already-claimed territory, drawn in the same color — a full-cell-sized square would be invisible against its own background, so a smaller inset square is used instead. Originally implemented as a hardcoded constant in `Renderer.ts` — see the Config refactor below for where it ended up after review.
- **Seed generation.** A run's seed (`App.tsx`) is chosen via `Math.floor(Math.random() * 0xffffffff)` at the moment Start is pressed. Nothing in the docs specifies who picks a run's seed; `SimulationEngine.start(seed, onFrame)` and `Simulation.createInitialState(seed)` both already expected to receive one from their caller.
- **Refs for per-tick callbacks.** `ColorExpansionArena` stores `onStatsUpdate`/`onComplete` in refs rather than the `useEffect` dependency array, since both are typically a new function identity on every parent render (`StatsPanel` updates every tick) — including them directly would restart the whole simulation run every frame instead of once per run. This is a standard React pattern, not a gameplay decision, but is exactly the kind of infrastructure-only code this session was scoped to.
- **`StatisticsStore`/`Ranking.ts` now have their first real caller.** Both existed since Phase 4 with nothing constructing or populating one; `ColorExpansionArena` now does, ranking by `territoryPercent` descending (ColorExpansion.md, Statistics — "Live stats remain sorted by current territory").

**Post-review Config refactor (requested by the project owner):** the player-square-size value was flagged during review as a tuning parameter that shouldn't live as a magic number inside rendering code, even though it isn't gameplay logic. Moved accordingly:

- `src/simulations/ColorExpansion/Config.ts` — `ColorExpansionConfigShape` gained a third field, `playerSquareCellRatio` (default `0.7`, still the same unreviewed placeholder value as before — only its location changed). Every Color-Expansion-specific tuning value — gameplay and rendering alike — now lives in this one Config instance, matching Architecture.md's Configuration section ("The engine never defines simulation settings").
- `src/engine/rendering/Renderer.ts` — removed the local `PLAYER_SQUARE_CELL_RATIO` constant. `renderGridFrame` now takes `squareSizeRatio` as an explicit parameter instead, keeping the engine itself fully generic — it has no idea the number came from Color Expansion's Config, only that some caller supplied a ratio.
- `src/components/Arena/ColorExpansionArena.tsx` — now imports `COLOR_EXPANSION_CONFIG` and passes `COLOR_EXPANSION_CONFIG.get('playerSquareCellRatio')` into `renderGridFrame`, the same way it already reads `gridSize`/`movementSpeedCellsPerSecond` indirectly through `createColorExpansionSimulation`.

No behavior changed — the on-screen result is pixel-identical to before this refactor. Verified: `tsc -b`, `oxlint`, and `npm run build` all still pass cleanly after the change.

**Verification performed for Phase 6:**

- A full sandbox checkout of the entire repo (every file, including that session's changes) was assembled from scratch, `npm install` was run for real, and `tsc -b`, `oxlint` (project's real `.oxlintrc.json`), and `npm run build` (`tsc -b && vite build`) were all run for real — all three passed cleanly with zero errors and zero warnings.
- A headless runtime smoke test (not part of the delivered files) ran full 2-, 3-, and 4-player Color Expansion games to completion, calling `mapColorExpansionStateToRenderables` every tick exactly as `ColorExpansionArena` does and asserting every cell color is either a valid string or `null` and every square position stays within the grid's bounds. Confirmed: the same seed always produces identical results; a different seed also matches (expected — still nothing consumes randomness); every game terminates with the board fully claimed (400/400 cells for the current 20×20 placeholder grid, for 2, 3, and 4 players alike); no errors from the new rendering-mapping function at any tick.

**Not implemented in Phase 6, and why:**

- **Character Skills** — explicitly out of scope per the project owner's instruction (both when gameplay logic was approved and again for the rendering-only session). `Skills.ts` remains an empty placeholder for Phase 7.
- **Polish** — no particles, no sound, no camera effects, no smoothing beyond the `moveProgress` interpolation ColorExpansion.md's Visual Rules already call for. Explicitly excluded by the project owner's instructions for that session.

**Reviewed and approved by the project owner**, following the Config refactor described above as the one requested change. Phase 6 is now finished in full — both the gameplay logic and the rendering/UI wiring.

### Phase 7 — Color Expansion Skills

Implemented Heavy, Swift, Sleeper, and Trickster exactly as documented in `ColorExpansion.md` (Character Skills, Skill Hooks) and locked down in the Pre-Phase 7 session, on top of Phase 6's gameplay — no new mechanic was introduced; every hook only modifies movement, capture, or path choice, which Phase 6 already implemented.

**`src/types/Skill.ts`** — the one flagged fix carried over from the Pre-Phase 7 session: its doc comment no longer says "one Skill per character," and instead describes the actual hook-interface model.

**`src/simulations/ColorExpansion/Grid.ts`** — extended, not replaced, to support `modifyPathChoice`'s need to know about *ties* between equally-shortest paths, which Phase 6's single-answer BFS never exposed:

- New `computeDistanceToNearestNeutral(grid, playerId)` (private): a single multi-source BFS seeded from every neutral cell at once, giving the shortest distance to the nearest neutral cell from every passable cell in one pass.
- New, exported `findPathChoiceTowardNearestNeutralCell(grid, playerId, startX, startY)`: returns both `defaultStep` (the fixed up/right/down/left tie-break winner) and `candidates` (every first step lying on some shortest path this tick).
- `findNextStepTowardNearestNeutralCell` (Phase 6's original export) is now implemented directly on top of the function above, rather than duplicated — per docs/CLAUDE.md, "Never duplicate logic." Its `defaultStep`/return value is bit-for-bit identical to Phase 6's own BFS for every input (see that function's own doc comment for the reasoning: Phase 6's algorithm effectively raced one BFS branch per initial neighbor, in fixed order, and the new multi-source distances identify the exact same winner in the case of a tie).

**`src/simulations/ColorExpansion/Config.ts`** — added six new Character Skill balance fields (`swiftMovementMultiplier`, `sleeperSleepDurationMs`, `sleeperRushDurationMs`, `sleeperRushMultiplier`, `tricksterRerollIntervalMs`, `tricksterSpeedBonusMultiplier`), all flagged as unreviewed placeholders exactly like `gridSize`/`movementSpeedCellsPerSecond` were in Phase 6 — see Todo.md, which is updated alongside this file.

**`src/simulations/ColorExpansion/Skills.ts`** (previously an empty placeholder) — now holds:

- `ColorExpansionSkillHooks`, this simulation's local hook interface: `modifySpeed`, `modifyCapture`, `modifyPathChoice` (matching ColorExpansion.md's Skill Hooks section exactly), each typed as `Skill<TState, TValue>` with a small, hook-specific `TState` context (the acting player plus whatever that mechanic needs) rather than the full `ColorExpansionState` — see this file's own doc comment for why (keeps a hook's inputs narrow enough that it structurally can't read another player's state, matching Skills.md's "never depends on another character's hook").
- Four hook objects, one per character: Heavy implements `modifyCapture` only; Swift and Sleeper each implement `modifySpeed` only; Trickster implements both `modifySpeed` and `modifyPathChoice`, gated on whichever of its two bonuses (`'speed'` / `'pathPreference'`) is currently active.
- `getSkillHooks(character)` — a registry lookup, mirroring `characters/Characters.ts`'s own `getCharacterById` pattern.
- `getInitialTricksterBonus(character, random)` — rolls Trickster's first bonus at spawn (every other character gets `null`).
- `advanceSkillState(players, deltaTimeMs, random)` — plain, explicit per-tick bookkeeping (not a hook, since hooks may read state but never mutate it): advances every non-eliminated player's `activeTimeMs`, and rerolls Trickster's active bonus whenever the reroll-interval timer crosses a boundary.

**`src/simulations/ColorExpansion/ColorExpansion.ts`**:

- `ColorExpansionState` gained a `random: Random` field. Ignored entirely by `createInitialState` since Phase 6 (`void seed`) because nothing needed randomness yet — Trickster's initial roll, rerolls, and Path Preference draws are the first real consumers, so `createInitialState` now does `new Random(seed)` and threads it through the returned state (see `shared/Random.ts`'s own doc comment: "Each run should construct its own instance from that run's seed").
- `ColorExpansionPlayerState` gained `activeTimeMs` (elapsed active time, frozen on elimination) and `tricksterActiveBonus` (`'speed' | 'pathPreference' | null`) — both plain bookkeeping fields Skills.ts's hooks read and `advanceSkillState` writes; see those two files' own doc comments for why neither is mutated by a hook directly.
- `update()` now calls `advanceSkillState(state.players, deltaTimeMs, state.random)` once per tick, before the existing fixed-slot-order player loop, so a fresh reroll or updated sleep/rush phase is already in effect by the time that same tick's movement reads it.
- `advancePlayer` (private) now: (1) applies a character's `modifySpeed` hook, if any, to get this tick's actual speed before computing `remainingMovement` — a `Sleeper` mid-sleep simply gets `0`, so the existing `while (remainingMovement > 0)` loop naturally does nothing that tick, with no special-cased "is sleeping" branch needed; (2) calls `findPathChoiceTowardNearestNeutralCell` instead of the old single-answer lookup when picking a new target, and — if a `modifyPathChoice` hook exists — lets it choose among the returned `candidates`, else uses `defaultStep`; (3) on arrival, computes the movement direction from the player's previous cell, and — if a `modifyCapture` hook exists — asks it for extra candidate cells, validating each one (inside the grid, still neutral) before actually claiming it, exactly matching Heavy's documented out-of-grid no-op.
- `computeColorExpansionStats` and `mapColorExpansionStateToRenderables` are otherwise unchanged: no skill modifies rendering or the shape of territory statistics themselves (see ColorExpansion.md, Character Skills — "Every Skill modifies movement").

**Judgment calls made this session** (flagged for review, same practice as every prior phase):

- **Hook context types are simulation-defined, not the full `ColorExpansionState`.** Skills.md says each hook is "built from" the generic `Skill<TState, TValue>` shape; read literally-narrowly, `TState` could be required to always be the entire simulation state. This session instead defines a small, hook-specific context struct per hook (see Skills.ts's own doc comment). Chosen because (a) `modifyCapture` and `modifyPathChoice` both need information — movement direction, the tie-candidate set — that isn't part of the global state at all, and (b) narrowing what a hook receives is what actually enforces "a hook never depends on another character's hook" (Skills.md, Contract), rather than merely asking hook authors to behave.
- **`modifyPathChoice` may consume the simulation's seeded `Random`.** ColorExpansion.md describes Trickster's Path Preference bonus only as "biases which equally-shortest path is chosen," without naming a mechanism. This session reads that as license to draw from `state.random` (the same instance Trickster's bonus-reroll timer already consumes), since it's the simplest deterministic interpretation and reuses existing infrastructure rather than inventing a second source of randomness. Determinism is preserved because player processing (and therefore each hook call) already happens in a fixed slot order, per Phase 6's own established rule.
- **Trickster's reroll and initial-roll draws happen outside any hook**, in `advanceSkillState`/`getInitialTricksterBonus`, specifically so that no hook needs to mutate `tricksterActiveBonus` directly — hooks in this codebase are meant to be pure reads of already-decided state (Skills.md, Contract: "never mutates state directly"). This is a stricter reading than the contract strictly requires (the contract's "never mutates" language is about simulation state generally, e.g. HP/position/ownership, and doesn't explicitly rule out RNG-only bookkeeping like a reroll timer), but keeping it strict was judged the simpler, more defensible design.
- **No new "Skill" stat line was added**, even though ColorExpansion.md's Statistics section lists "Skill" alongside Rank/Character/Territory %. With each Character mapped to exactly one Color Expansion skill, "Skill" and "Character" are the same value today, and the Character's name is already shown directly by `StatsPanel`/`WinnerScreen` next to its color swatch — an added "Skill: Heavy" text line next to "Heavy" would just repeat it. Left out rather than guessed at; flagged here for the project owner to decide whether a distinct display is wanted once Weapon Clash's own skills (which do differ in name from "Heavy"/"Swift"/etc. in some presentations — see WeaponClash.md) make the distinction more meaningful.
- **Intro Screen skill descriptions were not wired up.** ColorExpansion.md's Intro Screen section calls for them, and `IntroScreen.tsx` already has an (unused) `skillDescriptions` prop for exactly this, but `App.tsx` doesn't populate it. Left out as UI wiring outside Phase 7's own scope (Roadmap.md scopes Phase 7 to "Heavy, Swift, Sleeper, Trickster... implement exactly as documented" — the gameplay, not this screen) and a natural fit for Phase 11 (Shared Polish) instead. Added to Todo.md.

**Verification performed for Phase 7** (mirroring Phase 6's own verification practice):

- A full sandbox checkout of the entire repo, including every Phase 7 change, was assembled from scratch; `npm install` was run for real; `tsc -b` and `oxlint` (the project's real `.oxlintrc.json`) both ran for real and passed with zero errors and zero warnings.
- A headless runtime smoke test ran full games to completion for several rosters (all four characters together; Heavy+Trickster; Swift+Sleeper+Trickster; Heavy+Swift head-to-head) at the fixed 1000/60ms timestep. Confirmed: the same seed and roster always produce byte-identical results (grid, stats, every player's final `activeTimeMs` and `tricksterActiveBonus`) on repeated runs; different seeds still terminate cleanly; every game ends with the board fully claimed; Trickster always has a non-null bonus immediately at `createInitialState`, before any tick runs; a straight Heavy-vs-Swift game showed Heavy finishing with more territory than Swift (240 vs. 160 cells on one representative seed), consistent with Heavy's extra-capture bonus actually taking effect.
- This smoke test is not part of the delivered files (same as Phase 6's own note) — it's a one-off verification script, not a permanent addition to the repo.

**Not implemented in Phase 7, and why:**

- **Weapon Clash's own skills** — out of scope; Weapon Clash remains Phase 10 (Roadmap.md), with its own hook interface still to be designed once Phase 8/9 exist.
- **Playtesting/balancing the six new placeholder values** — explicitly deferred, same as `gridSize`/`movementSpeedCellsPerSecond` in Phase 6 (see Roadmap.md, Phase 6 — "Do not spend time trying to perfectly balance the simulation before it exists"; the same principle applies here).
- **Intro Screen skill descriptions** — see judgment calls above; deferred to Phase 11.

**Reviewed and approved by the project owner**, tested with no errors. Per Roadmap.md's Development Rules, this satisfies the condition for beginning Phase 8 — though Phase 8 itself is intentionally still on hold, at the project owner's explicit instruction, until the Physics Primitive Architecture and the Weapon Clash Simulation Loop Design (see both "Pre-Phase 8" sessions above) are settled and this document/Architecture.md/WeaponClash.md are updated to reflect them, which these sessions have now done.

## Decisions Made Along the Way

- SimulationManager was merged into SimulationEngine — no separate class (see Architecture.md).
- Character selection: the creator selects exactly which character fills each player slot, 2–4 slots (see Engine.md, Menu).
- Resolved a conflict in Architecture.md: engine renders, simulation only supplies state — `Render()` was removed from the `Simulation` type.
- Character colors in the registry are placeholder defaults from a shared palette (`CHARACTER_COLOR_PALETTE` in Colors.ts).
- Corrected Roadmap.md's quality-gate description: Claude has no network access on the project owner's machine and cannot run `tsc -b`, `oxlint`, or `vite build` there. In this sandboxed environment, network/bash access has been available and used every session since Phase 5 to actually run all three checks (and a runtime smoke test) before delivery — this doesn't change who's expected to run them on the project owner's own machine going forward.
- `RenderableCharacter` (character + x/y, pixel space) lives in `engine/rendering/Renderer.ts`, not `/src/types`, since it's a rendering-only concept. `RenderableGrid` (in `GridRenderer.ts`) and `RenderableSquareCharacter` (in `Renderer.ts`, cell space) follow the same placement logic — neither is a simulation state type.
- `UNIVERSAL_ARENA_SIZE` was extracted from `Arena.tsx`'s local `DEMO_ARENA` constant into `shared/Constants.ts` so Color Expansion's real arena and the Phase 2 demo arena share one source of truth. This is still the same placeholder value (480) as before — not a resolution of Engine.md's "Final arena dimensions" TODO, just deduplication.
- Grid-based simulations (Color Expansion) get their own rendering pipeline function, `renderGridFrame`, alongside the existing circle/pixel-space `renderFrame` used by the Phase 2 demo and expected to be reused by Weapon Clash (circles, continuous physics-space positions) in Phase 8-9. The two pipelines share `ArenaRenderer.ts`'s `drawArena` and the same letterbox/clear logic, but differ in how they interpret and draw their "contents," matching how differently the two kinds of simulations represent player position.
- Player squares are drawn smaller than a full grid cell purely so they remain visible against their own same-colored territory cell. Originally a hardcoded constant in `Renderer.ts`; after project-owner review, moved into `ColorExpansionConfigShape` as `playerSquareCellRatio` (default `0.7`, still unreviewed as a value, but now living alongside every other Color-Expansion-specific tuning number instead of inside engine rendering code) — `renderGridFrame` takes it as a parameter rather than reading any simulation's Config itself, keeping the engine generic.
- **(Pre-Phase 7 session)** Skill hook interfaces are local per simulation, never shared or inherited across simulations — even though the same four Characters (Heavy, Swift, Sleeper, Trickster) recur in every simulation, each simulation reimplements their skills against its own hook names.
- **(Pre-Phase 7 session)** Hooks are optional per character, with missing hooks treated as identity at the call site — chosen over mandatory pass-through implementations to avoid boilerplate and keep character definitions proportional to what they actually modify.
- **(Pre-Phase 7 session)** Trickster's Color Expansion design was simplified from three loosely-differentiated bonuses down to two clearly distinct ones (Speed, Path Preference), after recognizing that "Faster movement" and "Temporary movement burst" would have been mechanically identical once both bonuses last until the next timer-based reroll.
- **(Pre-Phase 7 session)** Heavy's extra capture attempt is a no-op (not an error, not a wraparound) when the target cell falls outside the grid.
- **(Phase 7)** A hook's `TState` is a small, hook-specific context type this simulation defines (the acting player plus whatever that mechanic needs), not the full `ColorExpansionState` — narrower than "the simulation's own state type" might suggest taken most literally, chosen because it's what actually makes "a hook never depends on another character's hook" true by construction rather than by convention.
- **(Phase 7)** Trickster's Path Preference bonus draws from the simulation's shared seeded `Random` to break ties, since ColorExpansion.md names the mechanism only as "biases" without specifying how; this reuses the same RNG instance already threaded through `ColorExpansionState` for the bonus-reroll timer.
- **(Phase 7)** Trickster's bonus rolls and rerolls happen in plain, explicit bookkeeping (`advanceSkillState`, `getInitialTricksterBonus`), never inside a hook itself, keeping every hook in this simulation a pure read of already-decided state.
- **(Phase 7)** No separate "Skill" stat line was added to live/final statistics, since it would currently just repeat the Character name already shown; flagged instead of guessed at.
- **(Phase 7)** Intro Screen skill descriptions remain unwired, deferred to Phase 11 (Shared Polish) as UI wiring outside Phase 7's gameplay scope.
- **(Pre-Phase 8, Physics Primitive Architecture)** `Physics.ts` operates only on generic primitives (`Vector2`, `Circle`, `Segment`) and generic operations on them (Collision, Bounce, Reflection, Sweep Test, Intersection) — it never imports or references a simulation type (Player, Weapon, Enemy, Projectile). A simulation converts its own state into these primitives, calls Physics, and decides what the result means. This mirrors `Grid.ts`'s BFS returning candidate cells for `ColorExpansion.ts` to interpret.
- **(Pre-Phase 8, Physics Primitive Architecture)** `Circle` carries an optional `mass` (default 1), even though Weapon Clash doesn't yet need unevenly-weighted circles, since a correct elastic-collision formula takes mass as a parameter anyway and this avoids a rewrite later.
- **(Pre-Phase 8, Physics Primitive Architecture)** `Segment` was added to the primitive vocabulary alongside `Circle`, since Weapon Clash's rotating weapon (WeaponClash.md, Weapons) is a line attached to and rotating around a player, not a circle — `Circle` alone would only cover player↔player collision, not the weapon-hit mechanic the simulation is actually built around.
- **(Pre-Phase 8, Weapon Clash Simulation Loop Design)** The full per-tick order — freeze timers → weapon rotation → movement/wall collision → player collision → weapon collision → weapon hits → statistics → elimination → win check — was settled before any Weapon Clash code was written, along with the exact `Physics.ts`/`WeaponClash/` split at each step.
- **(Pre-Phase 8, Weapon Clash Simulation Loop Design)** Hit Feedback was redefined as a pure hit-stop (Hit Freeze): both attacker and victim fully pause — no movement, rotation, collision, or further hits — for 0.1s, then resume with their exact prior velocity/rotation state, nothing recalculated.
- **(Pre-Phase 8, Weapon Clash Simulation Loop Design)** A player's velocity is chosen once, at spawn, from the seeded RNG, and is otherwise only ever modified by collision response (wall Reflection, player/weapon Bounce) — there is no per-tick AI decision, unlike Color Expansion's target-selection step.
- **(Pre-Phase 8, Weapon Clash Simulation Loop Design)** Whether a frozen player blocks as a static obstacle or is excluded from collision entirely was flagged as an open judgment call; documented for now as pass-through (excluded entirely), pending project owner confirmation.

## For a New Chat

Read Blueprint.md first, then this file, before anything else.

Phase 1 through Phase 7 files are implemented and have been approved by the project owner in full — gameplay logic, rendering/UI wiring, the post-review Config refactor, and now all four Character Skills, are all done, tested, and approved.

**Phase 7 (Color Expansion Skills) is implemented, reviewed, and approved by the project owner** (tested with no errors). Heavy, Swift, Sleeper, and Trickster are all wired into the real simulation:

- `src/simulations/ColorExpansion/Skills.ts` holds Color Expansion's local hook interface (`modifySpeed`, `modifyCapture`, `modifyPathChoice`) and all four characters' implementations, plus `advanceSkillState`/`getInitialTricksterBonus` for Trickster's non-hook bookkeeping.
- `src/simulations/ColorExpansion/Grid.ts` gained `findPathChoiceTowardNearestNeutralCell`, exposing tie candidates for `modifyPathChoice`; the original `findNextStepTowardNearestNeutralCell` is now built on top of it and is behavior-identical to Phase 6.
- `src/simulations/ColorExpansion/ColorExpansion.ts`'s `ColorExpansionState` now carries a seeded `random: Random`, and `ColorExpansionPlayerState` gained `activeTimeMs` and `tricksterActiveBonus`. `advancePlayer` now runs every hook a player's character implements.
- `src/simulations/ColorExpansion/Config.ts` gained six new placeholder balance values for the four skills (see Todo.md).
- `src/types/Skill.ts`'s previously-flagged stale doc comment is fixed.

See "Phase 7 — Color Expansion Skills" above for the full account, every judgment call made, and the verification performed (`tsc -b` + `oxlint` clean; a headless multi-roster determinism/termination smoke test).

**Phase 8 (Weapon Clash MVP) has still not begun.** This is no longer a pending-review gate — Phase 7 is approved — it is now a deliberate pause at the project owner's explicit instruction, so the `Physics.ts` primitive architecture and Weapon Clash's own simulation loop (see immediately below) could both be settled before any Weapon Clash code is written.

**A small Pre-Phase 8 cleanup session made three documentation/naming-only changes** (see "Pre-Phase 8 — Architecture Cleanup" above): `Skill<TState, TValue>` is now `Skill<TContext, TValue>`; `Skills.md` explicitly documents when a hook may consume the simulation's RNG; and `Simulation.ts` explicitly documents that `update()` may mutate state in place and return the same reference. The `Physics.ts` boundary for Weapon Clash was also agreed in that session, ahead of any Phase 8 code: generic collision/vector-math primitives only belong in `engine/core/Physics.ts`; every Weapon-Clash-specific rule (weapon attachment/rotation, HP, damage, hit cooldown, freeze frames, elimination) belongs in `src/simulations/WeaponClash/` instead.

**A follow-up Pre-Phase 8 session (Physics Primitive Architecture) then made that boundary concrete** (see "Pre-Phase 8 — Physics Primitive Architecture" above): `Physics.ts`'s vocabulary is now `Vector2`, `Circle`, `Segment`, and pure Collision/Bounce/Reflection/Sweep-Test/Intersection functions — it never imports or references a Player, Weapon, Enemy, or Projectile type. `docs/Architecture.md` has been updated with a new Physics section documenting this, plus `Vector2` entries added to the `/src/types` and `/src/shared` folder listings. No code was written this session — `Physics.ts` remains an empty placeholder, and Phase 8 itself has still not started.

**A further Pre-Phase 8 session (Weapon Clash Simulation Loop Design) then locked down the exact per-tick order and the Physics.ts/WeaponClash boundary at each step** (see "Pre-Phase 8 — Weapon Clash Simulation Loop Design" above): freeze timers → weapon rotation → movement/wall collision → player collision → weapon collision → weapon hits → statistics → elimination → win check. This session also redefined Hit Feedback into a full Hit Freeze hit-stop contract and clarified that a player's velocity is chosen once at spawn and only ever modified by collision response afterward. `docs/WeaponClash.md` has been updated to reflect all of this. One judgment call remains flagged for the project owner's confirmation before implementation begins: whether a frozen player blocks as a static obstacle or is excluded from collision entirely during their freeze window (currently documented as excluded/pass-through). No code was written this session — `Physics.ts` and `src/simulations/WeaponClash/` remain empty placeholders, and Phase 8 has still not started.

Everything else under `src/engine/audio`, `src/engine/recording`, `src/simulations/WeaponClash`, and `src/engine/core/Physics.ts` is still an empty placeholder. A file existing does not mean it is implemented; check actual file contents, not just the file tree, before assuming any phase is complete.

Color Expansion is fully watchable end-to-end, now with all four Character Skills live: `src/App.tsx` builds the player roster and a fresh seed on Start, and — once `simulationId === 'color-expansion'` — `src/components/Arena/ColorExpansionArena.tsx` loads and runs the real simulation through `SimulationEngine`, rendering the grid and square players every tick via `engine/rendering/Renderer.ts`'s `renderGridFrame`, feeding `StatsPanel` live ranked stats via a real `StatisticsStore`, and triggering `UIManager.showWinner()` the moment the simulation completes so `WinnerScreen` shows the final ranking. `src/components/Arena/Arena.tsx` (the Phase 2 demo) is unchanged in behavior and still used as the fallback for any simulation without a real implementation (currently only Weapon Clash).

`SimulationEngine`, `StatisticsStore<TStats>` + `Ranking.ts`, `Config<T>`, `AspectRatio.ts`, and now `Random` are all exercised by a real simulation.

Weapon Clash's own `Config.ts`, `Skills.ts`, `Weapon.ts`, and `WeaponClash.ts` (all still empty placeholders) are expected to follow the same pattern Color Expansion has now completed three times over — gameplay logic, then rendering/UI wiring, then architecture-and-spec-lock-in before Skills — once Phase 8 begins. Weapon Clash will define its own local hook interface, with its own hook names, entirely independent of Color Expansion's. It will also be the first simulation to convert its own state into `Physics.ts`'s primitives (its `WeaponPlayer` → `Circle`, its weapon → `Segment`) rather than passing simulation types into the engine directly — see "Pre-Phase 8 — Physics Primitive Architecture" above.

"Shared Helpers," originally the third item under Phase 4, remains removed from Roadmap.md entirely — it isn't a deferred item, it's a rejected one (see Phase 4 above).

Update "Current Phase" and "Completed Phases" above after every milestone (see Roadmap.md, Development Rules).
