# Progress

Last updated: after Phase 4 implementation.

## Current Phase

Phase 5 — Shared UI. Not started — awaiting approval to begin (see Roadmap.md, Development Rules).

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
- `src/engine/rendering/CharacterRenderer.ts` — draws one character as a colored circle at a given position. This shape is a simulation-agnostic placeholder; each simulation's real representation (squares for Color Expansion, circles for Weapon Clash — see ColorExpansion.md / WeaponClash.md, Players) arrives with that simulation in Phase 6+.
- `src/engine/rendering/Renderer.ts` — the shared rendering pipeline (`renderFrame`): clears the canvas, draws the arena, then draws every character on top. Also defines `RenderableCharacter` (character + x/y), an engine/rendering-only concept, distinct from any simulation's own state shape.
- `src/engine/core/SimulationEngine.ts` — added the requestAnimationFrame tick loop: `startLoop(onFrame)` / `stopLoop()`, plus a private `tick` that computes elapsed time each frame and invokes the caller's render callback. Deliberately does not call `Simulation.update()` — the fixed-timestep hook into this same loop is Phase 3 (see Engine.md, Main Loop and Determinism). Also gave `SimulationEngine` a default type parameter (`TState = unknown`) so it can be instantiated before a simulation is loaded.
- `src/components/Arena/Arena.tsx` — mounts the canvas, starts the engine's tick loop on mount and stops it on unmount, drawing every frame via `renderFrame`. Contains no drawing logic itself (see Architecture.md, Components).
- `src/App.tsx`, `src/App.css` — replaced the Vite template content (hero image, counter, docs/social links) with a minimal wrapper mounting `<Arena />`, so the rendering pipeline is visible when running the dev server.

No gameplay or simulation logic was implemented, per the Phase 2 deliverable.

### Phase 3 — Simulation Lifecycle

Implemented, entirely within `src/engine/core/SimulationEngine.ts`:

- `start(seed, onFrame)` — requires a simulation to already be loaded via `load()` (throws otherwise). Builds the initial state via `Simulation.createInitialState(seed)`, remembers the seed and render callback, resets the fixed-timestep accumulator, and calls the existing `startLoop(onFrame)` to begin driving the tick — exactly as anticipated in Phase 2's Progress notes ("Phase 3 will likely call startLoop internally once it adds those methods").
- `stop()` — halts the tick loop via `stopLoop()`. The last computed state is preserved (readable via `getState()`) rather than cleared, so a stopped run can still be inspected.
- `restart()` — re-runs the loaded simulation from the beginning using the same seed and render callback as the last `start()` call. Takes no arguments; both are remembered internally. This is the mechanism for verifying "same seed produces same result on repeated runs" per each simulation doc's Definition of Done.
- `reset()` — stops the loop and clears state, seed, the remembered render callback, and the accumulator, without unloading the simulation itself. `load()` now calls `reset()` first, so loading a new simulation can never leave a stale loop calling `update()` on the old one.
- `isRunning()` — small accessor (state exists and the loop is active) mirroring the existing `getSimulation()`/`getState()` pattern. Not explicitly listed in Roadmap.md, but a natural, low-risk complement to start/stop — flagging it here in case it's not wanted.
- Fixed timestep: `tick()` now calls a private `advanceSimulationStep(deltaTimeMs)` before invoking the render callback (matching Engine.md's Main Loop order: Engine Tick → Simulation Update → Rendering). This method accumulates real elapsed time and calls `Simulation.update()` in a loop, always passing exactly `FIXED_TIMESTEP_MS` (defined locally in this file, 1000/60) regardless of the actual frame's `deltaTimeMs` — this is what makes the eventual outcome independent of rendering FPS or machine performance (see Engine.md, Determinism). It stops the run immediately via `stop()` the moment `Simulation.isComplete()` reports true.
- The render callback is captured at the top of `tick()`, before `advanceSimulationStep()` runs, so the frame on which a run completes (which calls `stop()` internally and clears `onFrame`) still renders once with the final state — matching "Simulation freezes immediately" in both simulations' Winner Screen sections.

No other files were touched. No real simulation exists yet to `load()` (Color Expansion and Weapon Clash are still empty placeholders — Phase 6 and Phase 8), and no UI wires up `start()`/`stop()`/`restart()`/`reset()` yet (Menu is Phase 5). This phase is purely the engine-level mechanism.

Verified: `tsc -b`, `oxlint`, and `vite build` all pass cleanly with this change.

### Phase 4 — Shared Systems

Implemented:

- `src/engine/statistics/StatisticsStore.ts` — generic per-player statistics store (`StatisticsStore<TStats>`). Holds one `TStats` record per player id via `set`/`update`/`get`/`has`/`delete`, and exposes a ranked view via `getRanked(comparator)`. `TStats` and the comparator are always supplied by the caller — the store itself has no idea what fields exist for any simulation, matching Roadmap.md's "the engine never defines what statistics exist." Also defines `RankedEntry<TStats>` (an engine/statistics-only concept, mirroring `RenderableCharacter` in engine/rendering — not placed in `/src/types` since it isn't a simulation state shape).
- `src/engine/statistics/Ranking.ts` — the generic ranking/sorting helpers: `descendingBy(selectValue)` and `ascendingBy(selectValue)`, each producing a comparator from a caller-supplied numeric selector. Covers "sorted by highest HP" (Weapon Clash) and "sorted by current territory" (Color Expansion) without either field name appearing in engine code.
- `src/shared/Config.ts` — generic reusable configuration container (`Config<T>`). Takes `defaults` and optional `overrides`, freezes the merged result, and exposes `get(key)`, `getAll()`, and `withOverrides(partial)` (returns a new instance, never mutates). Placed in `/shared` rather than `/engine` per Architecture.md's placement rule, since it has no engine-specific (tick-loop) dependency.
- `docs/Architecture.md` — added Statistics to the top-level Engine system list and to the `/src/engine` folder bullet list; added Config to the `/src/shared` folder bullet list; added short "## Statistics" and "## Configuration" ownership sections mirroring the existing "## Rendering" section.

Not implemented — flagged for clarification rather than guessed:

- **Shared Helpers.** Roadmap.md's third Phase 4 bullet ("Reusable engine utilities. No simulation-specific logic.") has no concrete examples anywhere in the docs, unlike Statistics and Configuration, which both come with an explicit purpose and a "the engine never defines X" boundary. Nothing in the current codebase or either simulation doc points to a specific missing utility today. Per docs/CLAUDE.md ("If Requirements Are Missing: Do not invent behaviour. Ask for clarification."), this was raised to the project owner rather than filled in with speculative helpers.

Explicitly not touched, and why:

- `FIXED_TIMESTEP_MS` in `engine/core/SimulationEngine.ts` was not moved into the new `Config` container. Progress.md's Phase 3 decisions already settled that it belongs there as a tick-loop-specific private constant, not a general engine-wide setting — Phase 4 doesn't revisit that decision.
- Neither simulation's `Config.ts` (still empty placeholders) was populated. Every balance value they'd need (grid dimensions, movement speed, damage, rotation speed, weapon lengths) is still listed as TODO in Todo.md's Balance section — inventing numbers now would violate "Do not invent behaviour" in docs/CLAUDE.md. Those files get filled in once balance is decided, in Phase 6 (Color Expansion) and Phase 8 (Weapon Clash).

No UI, engine tick, or simulation was wired up to either new system yet — that begins once a real simulation (Phase 6+) has stats to report and settings to configure.

Awaiting the project owner's manual `tsc -b` / `oxlint` / `vite build` verification, per Roadmap.md's Development Rules.

## Decisions Made Along the Way

- SimulationManager was merged into SimulationEngine — no separate class (see Architecture.md).
- Character selection: the creator selects exactly which character fills each player slot, 2–4 slots (see Engine.md, Menu).
- components/UI and components/Shared are kept, purpose not yet decided (see Architecture.md).
- Resolved a conflict in Architecture.md: the Simulation section listed `Render()` as something every simulation provides, while the Rendering section and Components section both said the engine renders and a simulation only supplies state. Confirmed with the project owner that the engine-renders reading is correct; `Render()` was removed from the Simulation section and the `Simulation` type has no render method.
- Added `Skill` to the `/src/types` list in Architecture.md — Roadmap.md's Phase 1 scope calls for a shared Skill type, and it fits the stated /types criteria (used by every simulation, no runtime logic of its own).
- Documented `/src/characters`, `/src/simulations`, and `/src/menu` in Architecture.md's Folder Structure — they already existed in the repo but weren't described there.
- Character colors in the registry are placeholder defaults from a shared palette (`CHARACTER_COLOR_PALETTE` in Colors.ts) — Characters.md specifies that characters have a color, not which exact swatches, so these can change freely without any architectural impact.
- Corrected Roadmap.md's quality-gate description: Claude has no network access in this environment and cannot run `tsc -b`, `oxlint`, or `vite build` itself. The project owner runs all three manually as part of their review after each milestone. The gates themselves are unchanged — only who runs them.
- Tick-loop naming: added `startLoop()` / `stopLoop()` to `SimulationEngine` rather than `start()` / `stop()`, since Roadmap.md reserves `start`/`stop`/`restart`/`reset` for Phase 3's *simulation* lifecycle. Phase 3 will likely call `startLoop` internally once it adds those methods.
- The `Arena.tsx` demo (arena size 480, four characters from the character registry arranged in a circle) is temporary Phase 2 scaffolding to prove the rendering pipeline, per Roadmap.md's Phase 2 deliverable ("Characters should be visible inside an empty arena"). It is not simulation logic and will be replaced once the Menu (Phase 5) and a real simulation (Phase 6+) supply actual state.
- `RenderableCharacter` (character + x/y) was added in `engine/rendering/Renderer.ts`, not `/src/types`, since it's a rendering-only concept describing how to draw a character, not a simulation state shape — each simulation keeps its own position representation in its own folder per Architecture.md and maps it into this shape before rendering.
- Arena background/border colors in `ArenaRenderer.ts` are placeholder hex values (no CSS variables are read from canvas) — final visual design is out of scope for Phase 2.
- Fixed timestep value (`FIXED_TIMESTEP_MS = 1000 / 60`) is a private constant inside `SimulationEngine.ts` rather than in `src/shared/Constants.ts`. Per Architecture.md's placement rule, it belongs in `/engine` because it is part of the tick loop itself, not a simulation-agnostic shared value.
- `load()` now calls `reset()` internally before assigning the new simulation. This is a small behavior change from Phase 1/2 (previously it only nulled `state`) — needed once `start()` could leave a tick loop running; without it, loading a new simulation mid-run would leave the old loop calling `update()`/`isComplete()` against a simulation that's no longer the loaded one.
- `restart()` takes no arguments: the seed and render callback from the last `start()` call are remembered internally (`seed`, `lastOnFrame`) rather than requiring the caller to re-supply them, since Roadmap.md lists "Restart simulation" as a zero-argument lifecycle action alongside stop/reset.
- Introduced `lastOnFrame` as distinct from `onFrame`: `onFrame` is cleared by `stopLoop()` (it represents "the tick's currently active callback"), while `lastOnFrame` persists across stop/start so `restart()` has something to reuse. Both are cleared together by `reset()`.
- `StatisticsStore` and `Ranking.ts` were placed in `engine/statistics`, not `/shared`, because Roadmap.md's Phase 4 explicitly calls this an engine system ("the engine stores, updates, sorts and exposes statistics") and Architecture.md's top-level "## Engine" list is the natural place to register it — even though, unlike the tick loop or renderer, it has no direct requestAnimationFrame dependency of its own.
- `Config<T>` was placed in `/shared`, not `/engine`, following Architecture.md's placement rule literally: it has no engine-specific (tick-loop) dependency, so it belongs alongside `Settings.ts` rather than being pulled into `/engine` just because Roadmap.md's phase heading says "engine systems."
- `StatisticsStore.update()` throws if no record exists yet for that player, rather than silently creating a partial one — every simulation's own Spawn section establishes a player's initial values up front, so requiring an explicit `set()` first catches a missed initialization rather than masking it with an incomplete stats object.

## For a New Chat

Read Blueprint.md first, then this file, before anything else.

Phase 1 through Phase 4 files (listed above under Completed Phases) are implemented. Phases 1–3 pass `tsc -b`, `oxlint`, and `vite build`; Phase 4 is awaiting the project owner's manual verification of the same three checks. Everything else under `src/engine/audio`, `src/engine/recording`, `src/engine/ui`, `src/engine/core/Physics.ts`, `src/simulations`, `src/menu`, and `src/components/UI`/`src/components/Shared` is still an empty placeholder — a file existing does not mean it is implemented; check actual file contents, not just the file tree, before assuming any phase is complete.

The demo arena/characters wired into `src/components/Arena/Arena.tsx` and `src/App.tsx` are Phase 2 scaffolding only, meant to prove the rendering pipeline works — they are not the Menu (Phase 5) or a real simulation (Phase 6+), and should be replaced rather than extended when those phases begin. That demo never calls `load()` or `start()`, so Phase 3's lifecycle additions have no effect on it today.

`SimulationEngine` now has a full run lifecycle (`start`/`stop`/`restart`/`reset`) and a fixed-timestep simulation update hooked into the same tick loop from Phase 2 — but there is still no real `Simulation<TState>` implementation anywhere in the repo to load into it. The lifecycle is exercised only by the engine's own logic until Phase 6 (Color Expansion) supplies the first one.

`StatisticsStore<TStats>` (engine/statistics) and `Config<T>` (shared/Config.ts) are now available as reusable infrastructure, but nothing constructs an instance of either yet — no simulation exists to report stats or read config from. Each simulation's own `Config.ts` (still an empty placeholder in both ColorExpansion and WeaponClash) is expected to build a `Config<TheirOwnShape>` once that simulation's balance values are decided (Todo.md, Balance).

"Shared Helpers," the third item in Phase 4, was not implemented — it has no concrete spec anywhere in the docs, and was raised to the project owner for clarification instead of guessed at.

Update "Current Phase" and "Completed Phases" above after every milestone (see Roadmap.md, Development Rules).
