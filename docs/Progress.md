# Progress

Last updated: after Phase 6 was approved by the project owner, following one small requested change (moving the player-square-size rendering value into Color Expansion's own Config — see Phase 6 below).

## Current Phase

**Phase 6 — Color Expansion MVP — approved and complete.** Gameplay logic, rendering/UI wiring, and the Config refactor requested during review are all implemented, verified, and approved by the project owner. Per the project owner's explicit instruction, **Phase 7 (Color Expansion Skills) has not been started** — the next session should begin there, but only once told to.

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

No UI, engine tick, or simulation was wired up to either new system in this phase — that began once a real simulation had stats to report (this session — see Phase 6 below, "Rendering / UI wiring").

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

**Rendering / UI wiring (this session)** — approved by the project owner as the condition for closing Phase 6. Implements exactly the five things requested: render the grid, render territory, render square players, run it through the existing `SimulationEngine`, and trigger the winner screen on completion. No Skills, no polish, no particles, no sound, no additional gameplay changes.

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

**Post-review Config refactor (this session, requested by the project owner):** the player-square-size value was flagged during review as a tuning parameter that shouldn't live as a magic number inside rendering code, even though it isn't gameplay logic. Moved accordingly:

- `src/simulations/ColorExpansion/Config.ts` — `ColorExpansionConfigShape` gained a third field, `playerSquareCellRatio` (default `0.7`, still the same unreviewed placeholder value as before — only its location changed). Every Color-Expansion-specific tuning value — gameplay and rendering alike — now lives in this one Config instance, matching Architecture.md's Configuration section ("The engine never defines simulation settings").
- `src/engine/rendering/Renderer.ts` — removed the local `PLAYER_SQUARE_CELL_RATIO` constant. `renderGridFrame` now takes `squareSizeRatio` as an explicit parameter instead, keeping the engine itself fully generic — it has no idea the number came from Color Expansion's Config, only that some caller supplied a ratio.
- `src/components/Arena/ColorExpansionArena.tsx` — now imports `COLOR_EXPANSION_CONFIG` and passes `COLOR_EXPANSION_CONFIG.get('playerSquareCellRatio')` into `renderGridFrame`, the same way it already reads `gridSize`/`movementSpeedCellsPerSecond` indirectly through `createColorExpansionSimulation`.

No behavior changed — the on-screen result is pixel-identical to before this refactor. Verified: `tsc -b`, `oxlint`, and `npm run build` all still pass cleanly after the change.

**Verification performed this session:**

- A full sandbox checkout of the entire repo (every file, including this session's changes) was assembled from scratch, `npm install` was run for real, and `tsc -b`, `oxlint` (project's real `.oxlintrc.json`), and `npm run build` (`tsc -b && vite build`) were all run for real — all three passed cleanly with zero errors and zero warnings.
- A headless runtime smoke test (not part of the delivered files) ran full 2-, 3-, and 4-player Color Expansion games to completion, calling `mapColorExpansionStateToRenderables` every tick exactly as `ColorExpansionArena` does and asserting every cell color is either a valid string or `null` and every square position stays within the grid's bounds. Confirmed: the same seed always produces identical results; a different seed also matches (expected — still nothing consumes randomness); every game terminates with the board fully claimed (400/400 cells for the current 20×20 placeholder grid, for 2, 3, and 4 players alike); no errors from the new rendering-mapping function at any tick.

**Not implemented this session, and why:**

- **Character Skills** — explicitly out of scope per the project owner's instruction (both when gameplay logic was approved and again for this rendering-only session). `Skills.ts` remains an empty placeholder for Phase 7.
- **Polish** — no particles, no sound, no camera effects, no smoothing beyond the `moveProgress` interpolation ColorExpansion.md's Visual Rules already call for. Explicitly excluded by the project owner's instructions for this session.

**Reviewed and approved by the project owner**, following the Config refactor described above as the one requested change. Phase 6 is now finished in full — both the gameplay logic and the rendering/UI wiring. Phase 7 (Color Expansion Skills) has not been started; per the project owner's explicit instruction, it should not begin until told to.

## Decisions Made Along the Way

- SimulationManager was merged into SimulationEngine — no separate class (see Architecture.md).
- Character selection: the creator selects exactly which character fills each player slot, 2–4 slots (see Engine.md, Menu).
- Resolved a conflict in Architecture.md: engine renders, simulation only supplies state — `Render()` was removed from the `Simulation` type.
- Character colors in the registry are placeholder defaults from a shared palette (`CHARACTER_COLOR_PALETTE` in Colors.ts).
- Corrected Roadmap.md's quality-gate description: Claude has no network access on the project owner's machine and cannot run `tsc -b`, `oxlint`, or `vite build` there. In this sandboxed environment, network/bash access has been available and used every session since Phase 5 to actually run all three checks (and a runtime smoke test) before delivery — this doesn't change who's expected to run them on the project owner's own machine going forward.
- `RenderableCharacter` (character + x/y, pixel space) lives in `engine/rendering/Renderer.ts`, not `/src/types`, since it's a rendering-only concept. **(This session)** `RenderableGrid` (in `GridRenderer.ts`) and `RenderableSquareCharacter` (in `Renderer.ts`, cell space) follow the same placement logic — neither is a simulation state type.
- **(This session)** `UNIVERSAL_ARENA_SIZE` was extracted from `Arena.tsx`'s local `DEMO_ARENA` constant into `shared/Constants.ts` so Color Expansion's real arena and the Phase 2 demo arena share one source of truth. This is still the same placeholder value (480) as before — not a resolution of Engine.md's "Final arena dimensions" TODO, just deduplication.
- **(This session)** Grid-based simulations (Color Expansion) get their own rendering pipeline function, `renderGridFrame`, alongside the existing circle/pixel-space `renderFrame` used by the Phase 2 demo and expected to be reused by Weapon Clash (circles, continuous physics-space positions) in Phase 8-9. The two pipelines share `ArenaRenderer.ts`'s `drawArena` and the same letterbox/clear logic, but differ in how they interpret and draw their "contents," matching how differently the two kinds of simulations represent player position.
- **(This session)** Player squares are drawn smaller than a full grid cell purely so they remain visible against their own same-colored territory cell. Originally a hardcoded constant in `Renderer.ts`; after project-owner review, moved into `ColorExpansionConfigShape` as `playerSquareCellRatio` (default `0.7`, still unreviewed as a value, but now living alongside every other Color-Expansion-specific tuning number instead of inside engine rendering code) — `renderGridFrame` takes it as a parameter rather than reading any simulation's Config itself, keeping the engine generic.

## For a New Chat

Read Blueprint.md first, then this file, before anything else.

Phase 1 through Phase 6 files are implemented and have been approved by the project owner in full — gameplay logic, rendering/UI wiring, and the post-review Config refactor (moving `playerSquareCellRatio` out of rendering code and into `ColorExpansion/Config.ts`) are all done and approved. Per the project owner's explicit instruction, **Phase 7 has not been started** and should not begin until told to, even though Phase 6 itself is fully closed.

`src/simulations/ColorExpansion/Grid.ts`, `Config.ts`, and `ColorExpansion.ts` are implemented, including `ColorExpansion.ts`'s render-mapping function `mapColorExpansionStateToRenderables` and `Config.ts`'s third field `playerSquareCellRatio` (both added this session). `src/simulations/ColorExpansion/Skills.ts` remains an empty placeholder — Character Skills are Phase 7. Everything else under `src/engine/audio`, `src/engine/recording`, `src/simulations/WeaponClash`, and `src/engine/core/Physics.ts` is still an empty placeholder. A file existing does not mean it is implemented; check actual file contents, not just the file tree, before assuming any phase is complete.

Color Expansion is now fully watchable end-to-end: `src/App.tsx` builds the player roster and a fresh seed on Start, and — once `simulationId === 'color-expansion'` — `src/components/Arena/ColorExpansionArena.tsx` loads and runs the real simulation through `SimulationEngine`, rendering the grid and square players every tick via `engine/rendering/Renderer.ts`'s `renderGridFrame` (backed by `GridRenderer.ts` and `CharacterRenderer.ts`'s `drawCharacterSquare`, with the player-square-size ratio read from `COLOR_EXPANSION_CONFIG` rather than hardcoded — see the Config refactor in Phase 6 above), feeding `StatsPanel` live ranked stats via a real `StatisticsStore`, and triggering `UIManager.showWinner()` the moment the simulation completes so `WinnerScreen` shows the final ranking. `src/components/Arena/Arena.tsx` (the Phase 2 demo) is unchanged in behavior and still used as the fallback for any simulation without a real implementation (currently only Weapon Clash).

`SimulationEngine`, `StatisticsStore<TStats>` + `Ranking.ts`, `Config<T>`, and `AspectRatio.ts` are all now exercised by a real simulation for the first time (previously built but unused infrastructure per earlier Progress.md notes).

Weapon Clash's own `Config.ts`, `Skills.ts`, `Weapon.ts`, and `WeaponClash.ts` (all still empty placeholders) are expected to follow the same pattern Color Expansion just completed twice over — gameplay logic first, rendering/UI wiring second — once Phase 8 begins.

"Shared Helpers," originally the third item under Phase 4, remains removed from Roadmap.md entirely — it isn't a deferred item, it's a rejected one (see Phase 4 above).

Update "Current Phase" and "Completed Phases" above after every milestone (see Roadmap.md, Development Rules).
