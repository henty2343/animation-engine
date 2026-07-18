# Progress

Last updated: after Phase 7 (Color Expansion Skills) was implemented — Heavy, Swift, Sleeper, and Trickster are all wired into the real simulation via the hook-interface architecture locked down in the Pre-Phase 7 session, plus the one flagged fix (the stale `src/types/Skill.ts` doc comment) made at the very start of this session, per that session's own note. **Phase 7 has not yet been reviewed or approved by the project owner** — the next session should open with that review.

## Current Phase

**Phase 7 — Color Expansion Skills — implemented, awaiting project owner review.**

Heavy, Swift, Sleeper, and Trickster are all implemented exactly as documented in ColorExpansion.md and the Pre-Phase 7 architecture session, wired into the real simulation via `src/simulations/ColorExpansion/Skills.ts`'s local hook interface (`modifySpeed`, `modifyCapture`, `modifyPathChoice`). See "Phase 7 — Color Expansion Skills" below for the full account, judgment calls, and verification performed.

**Per the project owner's standing rule** (Roadmap.md, Development Rules: "Never continue to the next milestone without approval"), no Phase 8 (Weapon Clash MVP) work has been started or should be started until Phase 7 is reviewed.

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

- `src/shared/Constants.ts` — added `UNIVERSAL_ARENA_SIZE = 480`, the same placeholder pixel size the Phase 2 demo arena already used, now in one shared location (see Engine.md, Arena — "Same dimensions as every simulation") instead of duplicated locally.
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

**Awaiting project owner review.** Per Roadmap.md's Development Rules, Phase 8 should not begin until this phase is explicitly approved.

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

## For a New Chat

Read Blueprint.md first, then this file, before anything else.

Phase 1 through Phase 6 files are implemented and have been approved by the project owner in full — gameplay logic, rendering/UI wiring, and the post-review Config refactor (moving `playerSquareCellRatio` out of rendering code and into `ColorExpansion/Config.ts`) are all done and approved.

**Phase 7 (Color Expansion Skills) is now implemented but not yet reviewed by the project owner.** Heavy, Swift, Sleeper, and Trickster are all wired into the real simulation:

- `src/simulations/ColorExpansion/Skills.ts` holds Color Expansion's local hook interface (`modifySpeed`, `modifyCapture`, `modifyPathChoice`) and all four characters' implementations, plus `advanceSkillState`/`getInitialTricksterBonus` for Trickster's non-hook bookkeeping.
- `src/simulations/ColorExpansion/Grid.ts` gained `findPathChoiceTowardNearestNeutralCell`, exposing tie candidates for `modifyPathChoice`; the original `findNextStepTowardNearestNeutralCell` is now built on top of it and is behavior-identical to Phase 6.
- `src/simulations/ColorExpansion/ColorExpansion.ts`'s `ColorExpansionState` now carries a seeded `random: Random`, and `ColorExpansionPlayerState` gained `activeTimeMs` and `tricksterActiveBonus`. `advancePlayer` now runs every hook a player's character implements.
- `src/simulations/ColorExpansion/Config.ts` gained six new placeholder balance values for the four skills (see Todo.md).
- `src/types/Skill.ts`'s previously-flagged stale doc comment is fixed.

See "Phase 7 — Color Expansion Skills" above for the full account, every judgment call made, and the verification performed (`tsc -b` + `oxlint` clean; a headless multi-roster determinism/termination smoke test).

**Per Roadmap.md's Development Rules ("Never continue to the next milestone without approval"), do not begin Phase 8 (Weapon Clash MVP) until Phase 7 is explicitly reviewed and approved by the project owner.**

Everything else under `src/engine/audio`, `src/engine/recording`, `src/simulations/WeaponClash`, and `src/engine/core/Physics.ts` is still an empty placeholder. A file existing does not mean it is implemented; check actual file contents, not just the file tree, before assuming any phase is complete.

Color Expansion is fully watchable end-to-end, now with all four Character Skills live: `src/App.tsx` builds the player roster and a fresh seed on Start, and — once `simulationId === 'color-expansion'` — `src/components/Arena/ColorExpansionArena.tsx` loads and runs the real simulation through `SimulationEngine`, rendering the grid and square players every tick via `engine/rendering/Renderer.ts`'s `renderGridFrame`, feeding `StatsPanel` live ranked stats via a real `StatisticsStore`, and triggering `UIManager.showWinner()` the moment the simulation completes so `WinnerScreen` shows the final ranking. `src/components/Arena/Arena.tsx` (the Phase 2 demo) is unchanged in behavior and still used as the fallback for any simulation without a real implementation (currently only Weapon Clash).

`SimulationEngine`, `StatisticsStore<TStats>` + `Ranking.ts`, `Config<T>`, `AspectRatio.ts`, and now `Random` are all exercised by a real simulation.

Weapon Clash's own `Config.ts`, `Skills.ts`, `Weapon.ts`, and `WeaponClash.ts` (all still empty placeholders) are expected to follow the same pattern Color Expansion has now completed three times over — gameplay logic, then rendering/UI wiring, then (thanks to the Pre-Phase 7 session) architecture-and-spec-lock-in before Skills — once Phase 8 begins. Weapon Clash will define its own local hook interface, with its own hook names, entirely independent of Color Expansion's.

"Shared Helpers," originally the third item under Phase 4, remains removed from Roadmap.md entirely — it isn't a deferred item, it's a rejected one (see Phase 4 above).

Update "Current Phase" and "Completed Phases" above after every milestone (see Roadmap.md, Development Rules).
