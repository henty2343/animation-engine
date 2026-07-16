# Progress

Last updated: after Phase 5 implementation.

## Current Phase

Phase 6 — Color Expansion MVP. Not started — awaiting approval to begin (see Roadmap.md, Development Rules).

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

Removed from scope, by project owner decision:

- **Shared Helpers.** Roadmap.md's third Phase 4 bullet ("Reusable engine utilities. No simulation-specific logic.") was flagged during implementation as having no concrete spec anywhere in the docs, unlike Statistics and Configuration. The project owner reviewed this and decided the milestone itself shouldn't exist: the project philosophy is to avoid creating abstractions before they're needed, so a generic "helpers" module should never be speculative scaffolding — it should only appear once at least two independent systems genuinely need the same logic. The "Shared Helpers" section was removed from Phase 4 in Roadmap.md, and this rule was written into docs/CLAUDE.md (General Principles) and docs/Architecture.md (the `/src/shared` folder description) so future phases follow it automatically. No helpers module was ever created, and `Random.ts`, `Math.ts`, `Colors.ts`, `Constants.ts`, and `Settings.ts` are untouched.

Explicitly not touched, and why:

- `FIXED_TIMESTEP_MS` in `engine/core/SimulationEngine.ts` was not moved into the new `Config` container. Progress.md's Phase 3 decisions already settled that it belongs there as a tick-loop-specific private constant, not a general engine-wide setting — Phase 4 doesn't revisit that decision.
- Neither simulation's `Config.ts` (still empty placeholders) was populated. Every balance value they'd need (grid dimensions, movement speed, damage, rotation speed, weapon lengths) is still listed as TODO in Todo.md's Balance section — inventing numbers now would violate "Do not invent behaviour" in docs/CLAUDE.md. Those files get filled in once balance is decided, in Phase 6 (Color Expansion) and Phase 8 (Weapon Clash).

No UI, engine tick, or simulation was wired up to either new system yet — that begins once a real simulation (Phase 6+) has stats to report and settings to configure.

Verified by the project owner: `npm run build` and `npm run lint` both completed with no errors. Phase 4 is approved.

### Phase 5 — Shared UI

Implemented every item in Roadmap.md's Phase 5 list:

**Simulation registry (new, not explicitly listed in Roadmap.md but required by "Simulation selector" below):**

- `src/types/SimulationDescriptor.ts` — minimal `{ id, name, description }` metadata type. Deliberately excludes any `Simulation<TState>` implementation, Config, or gameplay detail.
- `src/simulations/registry.ts` — lists Color Expansion and Weapon Clash by metadata only (name/description taken directly from their own docs' Objective sections), mirroring `characters/Characters.ts`'s `getCharacterById`/`listCharacters` pattern exactly (`getSimulationById`/`listSimulations`). Neither simulation folder has any gameplay implemented yet — this registry only lets the Menu display and select a simulation by name, it does not make either one runnable. This was necessary groundwork: "Select Simulation" (Engine.md, Menu) needs something to list, and neither Color Expansion nor Weapon Clash exist in code yet (Phase 6/8).

**Main menu, Simulation selector, Character selector:**

- `src/menu/SimulationSelector.tsx` — presentational list of simulations from the new registry, single-select.
- `src/menu/CharacterSelector.tsx` (new file, not present before this phase) — player count (2–4, from `MIN_PLAYERS`/`MAX_PLAYERS`) plus one Character-selection tile-grid per slot. Each Character can only occupy one slot: picking one already assigned elsewhere is disabled here, and `Menu.tsx` swaps the two slots instead of allowing a duplicate. This uniqueness rule is not stated explicitly anywhere in the docs — flagging it here as a judgment call, made because two players sharing a Character would also mean sharing a color (Characters.md: "Characters never change color"), making them indistinguishable on screen.
- `src/menu/SettingsPanel.tsx` — aspect ratio selector (16:9 / 9:16) fully wired up. The "Simulation Settings" sub-section is a visible placeholder, not implemented: every balance value it would need (grid dimensions, movement speed, damage, rotation speed, weapon lengths) is still TODO in Todo.md, and inventing numbers here would violate docs/CLAUDE.md's "Do not invent behaviour." It gets wired up once a simulation's own `Config.ts` exists (Phase 6 / Phase 8).
- `src/menu/Menu.tsx` — orchestrates the three sections above plus a Start button (disabled until a simulation and every player slot are filled). Persists every selection to `shared/Settings.ts` (`menu.simulationId`, `menu.playerCount`, `menu.slots`, `menu.aspectRatio`) as it changes, exactly as anticipated in `Settings.ts`'s own Phase 1 doc comment ("read and written through this store by the Menu itself in a later phase"). Calls `onStart(selection)` with a `MenuSelection` once Start is pressed.
- `src/menu/MenuSelection.ts` (new file) — the Menu's output type (`simulationId`, `characterIds[]`, `aspectRatio`), kept in its own file rather than inside `Menu.tsx` so that component file exports only the `Menu` component itself (see `.oxlintrc.json`, `react/only-export-components`).

**Aspect ratio system:**

- `src/shared/AspectRatio.ts` (new file) — `getCanvasDimensions(aspectRatio, arenaSize)` computes the output canvas's pixel dimensions for 16:9 or 9:16 so the square arena fits without cropping; `getArenaOffset(canvas, arenaSize)` computes the offset to center the arena within that canvas. Placed in `/shared`, not `/engine`, per Architecture.md's placement rule: it's pure math with no tick-loop dependency, even though `engine/rendering/Renderer.ts` is the only current caller.
- `src/engine/rendering/ArenaRenderer.ts` — `drawArena` now takes an optional `offset` param (defaults to `{x: 0, y: 0}`, so a canvas exactly `arena.size` is unaffected).
- `src/engine/rendering/Renderer.ts` — `renderFrame`'s signature changed: it now takes the full `CanvasDimensions` and an `ArenaOffset` in addition to the `Arena` and characters. It clears and fills the entire canvas with a letterbox color first, then draws the arena at the given offset, then draws every character translated by that same offset — so simulation-side code (once it exists) still only ever deals in arena-local coordinates.

**Arena component:**

- `src/components/Arena/Arena.tsx` — now takes an `aspectRatio` prop and uses the two functions above (via `useMemo`) to size its canvas and compute the arena's centering offset, then passes both into the updated `renderFrame`. The demo content itself (four Characters from the registry, arranged in a circle) is untouched Phase 2 scaffolding — there is still no real `Simulation<TState>` to `load()`/`start()` (Phase 6/8), so this remains a rendering-pipeline demonstration, now aspect-ratio aware rather than hardcoded to a 480×480 square.

**Intro screen, Winner screen, Live statistics panel — and their engine-side owner:**

- `src/engine/ui/UIManager.ts` (filled in from an empty placeholder) — owns the Intro → Running → Winner phase timeline (see Engine.md, UI: "Owned by the engine (engine/ui), not by React's Menu"). `startRun(durationMs?)` enters `'intro'` and schedules an automatic transition to `'running'` after `INTRO_SCREEN_DURATION_MS` (or a caller-supplied duration). `showWinner()` moves to `'winner'` — intended to be called once `Simulation.isComplete()` reports true, but **nothing calls it yet**, since no simulation exists that can complete (Phase 6/8). This is flagged explicitly, mirroring how Phase 3 flagged `isRunning()`.
- `src/components/UI/useUIPhase.ts` (new file) — small React hook subscribing a component to a `UIManager` instance's current phase, mirroring how `Arena.tsx` subscribes to the engine tick via a `useEffect`.
- `src/components/UI/types.ts` (new file) — `PlayerStatDisplay`, a generic per-player display row (`playerId`, `character`, `rank`, `eliminated`, `statLines: string[]`) shared by `StatsPanel` and `WinnerScreen`. Lives alongside the components that use it rather than in `/src/types`, mirroring `RenderableCharacter` in `engine/rendering/Renderer.ts` — a display-only shape, not a simulation state type. Neither component knows what any stat line means; each simulation will map its own `TStats` into this shape.
- `src/components/UI/IntroScreen.tsx` — simulation name, characters (color + name), optional skill blurbs. Duration is entirely owned by `UIManager`; this component just renders for as long as the phase is `'intro'`.
- `src/components/UI/StatsPanel.tsx` — renders an already-ranked list of `PlayerStatDisplay` entries. Never sorts anything itself (ranking is `engine/statistics/Ranking.ts`'s job, per the existing Phase 4 architecture).
- `src/components/UI/WinnerScreen.tsx` — final ranking, rank-1 winner highlighted and called out separately, everyone else faded (`opacity` in CSS) per each simulation doc's Winner Screen section.

**New Shared React primitives (`src/components/Shared`, previously an undecided empty placeholder):**

- `Button.tsx`, `Card.tsx`, `SelectableTile.tsx` — small, stateless, presentational components with no logic beyond forwarding props and toggling a `selected`/`disabled` class. Used by both `/src/menu` (simulation/character/aspect-ratio tiles, Start button) and `/src/components/UI` (Intro/Winner card wrappers). This gives `/src/components/Shared` the "concrete purpose" Architecture.md asked for before it grows further.

**Wiring (`src/App.tsx`):**

- Now switches between `<Menu>` (no selection yet) and the run timeline (`selection` set). On Start, stores the `MenuSelection` and calls `uiManager.startRun()`. While `phase === 'intro'`, renders `IntroScreen` with the selected simulation's name and characters. Otherwise renders `Arena` (aspect-ratio aware) alongside `StatsPanel`.
- There is deliberately **no** automatic path to the `'winner'` phase: nothing in the app currently calls `UIManager.showWinner()`, because there is no real simulation to detect completion from. `StatsPanel` in the running view is fed the same Phase 2 demo characters mapped into placeholder `PlayerStatDisplay` rows with a literal `"Awaiting simulation"` stat line — clearly not real gameplay data, only proving `Arena` and `StatsPanel` render together correctly. `WinnerScreen` is fully built but not yet mounted anywhere in `App.tsx` for the same reason.

Documentation updated:

- `docs/Architecture.md` — added `SimulationDescriptor` to the `/types` list; `AspectRatio` to the `/shared` list; `UIManager` to the `/engine` list; gave `/src/components/UI` and `/src/components/Shared` their now-decided purposes (previously "not yet decided"); documented `src/simulations/registry.ts` under `/src/simulations`; documented the Phase 5 Menu file list under `/src/menu`; added a note to `## Rendering` about letterboxing; added a new `## UI Phase Lifecycle` section describing `UIManager`'s ownership.

Explicitly not implemented, and why:

- **A working end-to-end Start → Intro → Simulation → Winner flow.** This is impossible to build honestly right now: no `Simulation<TState>` implementation exists anywhere in the repo (Color Expansion and Weapon Clash are both still empty placeholder files — Phase 6 and Phase 8). Every Phase 5 piece is built, tested (via `tsc -b`/`oxlint`/a real `vite build` in a sandboxed checkout — see below), and ready to be wired to a real simulation, but `App.tsx`'s "running" view still shows the same Phase 2 demo rendering rather than a loaded/started `SimulationEngine` run, and there's no live `StatisticsStore` behind `StatsPanel` yet.
- **Any real simulation-specific settings in `SettingsPanel`.** Still blocked on Todo.md's Balance section and each simulation's own empty `Config.ts`.

Verified in this session: a throwaway sandbox checkout with all Phase 1–5 files was assembled from scratch, `npm install` was run for real, and `tsc -b`, `oxlint`, and `vite build` were all run for real (not simulated) against the complete Phase 5 codebase — all three passed cleanly with zero errors and zero warnings. This is normally the project owner's manual step (see Roadmap.md's note that Claude has no network access to run these) — it was done here as an extra verification pass before delivery, not as a replacement for the project owner's own review.

## Decisions Made Along the Way

- SimulationManager was merged into SimulationEngine — no separate class (see Architecture.md).
- Character selection: the creator selects exactly which character fills each player slot, 2–4 slots (see Engine.md, Menu).
- components/UI and components/Shared are kept, purpose not yet decided (see Architecture.md).
- Resolved a conflict in Architecture.md: the Simulation section listed `Render()` as something every simulation provides, while the Rendering section and Components section both said the engine renders and a simulation only supplies state. Confirmed with the project owner that the engine-renders reading is correct; `Render()` was removed from the Simulation section and the `Simulation` type has no render method.
- Added `Skill` to the `/src/types` list in Architecture.md — Roadmap.md's Phase 1 scope calls for a shared Skill type, and it fits the stated /types criteria (used by every simulation, no runtime logic of its own).
- Documented `/src/characters`, `/src/simulations`, and `/src/menu` in Architecture.md's Folder Structure — they already existed in the repo but weren't described there.
- Character colors in the registry are placeholder defaults from a shared palette (`CHARACTER_COLOR_PALETTE` in Colors.ts) — Characters.md specifies that characters have a color, not which exact swatches, so these can change freely without any architectural impact.
- Corrected Roadmap.md's quality-gate description: Claude has no network access in this environment and cannot run `tsc -b`, `oxlint`, or `vite build` itself. The project owner runs all three manually as part of their review after each milestone. The gates themselves are unchanged — only who runs them. (Phase 5 note: this session did have sandboxed network access and used it to actually run all three checks against a full copy of the codebase before delivery — see Phase 5 above. This doesn't change who's expected to run them going forward; it was an extra one-off verification pass.)
- Tick-loop naming: added `startLoop()` / `stopLoop()` to `SimulationEngine` rather than `start()` / `stop()`, since Roadmap.md reserves `start`/`stop`/`restart`/`reset` for Phase 3's *simulation* lifecycle. Phase 3 will likely call `startLoop` internally once it adds those methods.
- The `Arena.tsx` demo (arena size 480, four characters from the character registry arranged in a circle) is temporary Phase 2 scaffolding to prove the rendering pipeline, per Roadmap.md's Phase 2 deliverable ("Characters should be visible inside an empty arena"). It is not simulation logic. As of Phase 5 it is aspect-ratio aware, but the demo content itself still awaits replacement once the Menu (done) and a real simulation (Phase 6+) supply actual state.
- `RenderableCharacter` (character + x/y) was added in `engine/rendering/Renderer.ts`, not `/src/types`, since it's a rendering-only concept describing how to draw a character, not a simulation state shape — each simulation keeps its own position representation in its own folder per Architecture.md and maps it into this shape before rendering.
- Arena background/border colors in `ArenaRenderer.ts` are placeholder hex values (no CSS variables are read from canvas) — final visual design is out of scope for Phase 2.
- Fixed timestep value (`FIXED_TIMESTEP_MS = 1000 / 60`) is a private constant inside `SimulationEngine.ts` rather than in `src/shared/Constants.ts`. Per Architecture.md's placement rule, it belongs in `/engine` because it is part of the tick loop itself, not a simulation-agnostic shared value.
- `load()` now calls `reset()` internally before assigning the new simulation. This is a small behavior change from Phase 1/2 (previously it only nulled `state`) — needed once `start()` could leave a tick loop running; without it, loading a new simulation mid-run would leave the old loop calling `update()`/`isComplete()` against a simulation that's no longer the loaded one.
- `restart()` takes no arguments: the seed and render callback from the last `start()` call are remembered internally (`seed`, `lastOnFrame`) rather than requiring the caller to re-supply them, since Roadmap.md lists "Restart simulation" as a zero-argument lifecycle action alongside stop/reset.
- Introduced `lastOnFrame` as distinct from `onFrame`: `onFrame` is cleared by `stopLoop()` (it represents "the tick's currently active callback"), while `lastOnFrame` persists across stop/start so `restart()` has something to reuse. Both are cleared together by `reset()`.
- `StatisticsStore` and `Ranking.ts` were placed in `engine/statistics`, not `/shared`, because Roadmap.md's Phase 4 explicitly calls this an engine system ("the engine stores, updates, sorts and exposes statistics") and Architecture.md's top-level "## Engine" list is the natural place to register it — even though, unlike the tick loop or renderer, it has no direct requestAnimationFrame dependency of its own.
- `Config<T>` was placed in `/shared`, not `/engine`, following Architecture.md's placement rule literally: it has no engine-specific (tick-loop) dependency, so it belongs alongside `Settings.ts` rather than being pulled into `/engine` just because Roadmap.md's phase heading says "engine systems."
- `StatisticsStore.update()` throws if no record exists yet for that player, rather than silently creating a partial one — every simulation's own Spawn section establishes a player's initial values up front, so requiring an explicit `set()` first catches a missed initialization rather than masking it with an incomplete stats object.
- The "Shared Helpers" milestone was removed from Phase 4 in Roadmap.md after review, rather than left as a deferred/unimplemented item. The project owner determined a generic helpers module is exactly the kind of speculative abstraction the project's philosophy avoids. Going forward, a new file in `/src/shared` is only justified once at least two independent systems (two simulations, or a simulation and the engine) genuinely need the same logic — this is now written into `docs/CLAUDE.md` and `docs/Architecture.md` rather than living only as a one-off judgment call.
- **(Phase 5)** Built a `SimulationDescriptor`/`registry.ts` pair (metadata only: id, name, description) so the Menu's Simulation selector has something to list, even though neither Color Expansion nor Weapon Clash has any gameplay implemented yet. Justified by direct precedent: the Character registry (`characters/Characters.ts`) already lists all four Characters despite their `Skills.ts` files being empty placeholders too. Flagging this in case the project owner would rather the Menu not reference either simulation by name until it's actually implemented.
- **(Phase 5)** Enforced that each Character can only occupy one player slot at a time (`CharacterSelector.tsx` disables an already-used Character for other slots; `Menu.tsx` swaps rather than duplicates on selection). Not stated explicitly anywhere in the docs — flagging as a judgment call, reasoned from "Characters never change color" (Characters.md) implying two same-Character players would be visually indistinguishable.
- **(Phase 5)** `AspectRatio.ts` was placed in `/shared`, not `/engine`, even though its only current caller is `engine/rendering/Renderer.ts` — it's pure math with no tick-loop dependency, matching Architecture.md's placement rule literally (the same reasoning already applied to `Config<T>` in Phase 4).
- **(Phase 5)** `renderFrame`'s signature changed (added `canvas: CanvasDimensions` and `arenaOffset: ArenaOffset` parameters) to support letterboxing for non-square aspect ratios. This is a breaking change to that function, but its only caller (`Arena.tsx`) was updated in the same phase, so nothing is left broken.
- **(Phase 5)** `UIManager`'s `'running' -> 'winner'` transition (`showWinner()`) has no caller yet and is not wired into `App.tsx`'s render logic at all. Flagging this explicitly (mirroring Phase 3's flagging of `isRunning()`) — it's ready for Phase 6/8 to call once a real `Simulation.isComplete()` fires, but building a fake trigger for it now would mean inventing gameplay-adjacent behavior ahead of an actual simulation, which docs/CLAUDE.md's "Do not invent behaviour" rules out.
- **(Phase 5)** `PlayerStatDisplay` (the generic display shape for `StatsPanel`/`WinnerScreen`) was placed in `src/components/UI/types.ts`, not `/src/types`, on the same reasoning as `RenderableCharacter` in Phase 2: it's a display-only shape invented by the rendering/UI layer, not a concept any simulation itself defines.
- **(Phase 5)** `MenuSelection` was split into its own file (`src/menu/MenuSelection.ts`) purely to keep `Menu.tsx` exporting only the `Menu` component, satisfying `.oxlintrc.json`'s `react/only-export-components` rule cleanly rather than merely accepting its warning.

## For a New Chat

Read Blueprint.md first, then this file, before anything else.

Phase 1 through Phase 5 files (listed above under Completed Phases) are implemented. Phases 1–4 previously passed `tsc -b`, `oxlint`, and `vite build` under the project owner's manual review. Phase 5's implementation was additionally verified in-session against a full sandboxed checkout of the entire codebase (all three checks passed with zero errors/warnings) — but per Roadmap.md's Development Rules, it still awaits the project owner's own manual review and explicit approval before Phase 6 begins.

Everything else under `src/engine/audio`, `src/engine/recording`, `src/simulations/ColorExpansion`, `src/simulations/WeaponClash`, and `src/engine/core/Physics.ts` is still an empty placeholder — a file existing does not mean it is implemented; check actual file contents, not just the file tree, before assuming any phase is complete.

The demo arena/characters wired into `src/components/Arena/Arena.tsx` and used by `src/App.tsx`'s "running" view are still Phase 2 scaffolding, now aspect-ratio aware (Phase 5) but otherwise unchanged — they are not a real simulation (Phase 6+), and should be replaced rather than extended when Color Expansion or Weapon Clash is implemented.

The Menu (`src/menu`), the shared UI screens (`src/components/UI`), the shared presentational primitives (`src/components/Shared`), and the UI phase manager (`src/engine/ui/UIManager.ts`) are all now implemented and wired together in `src/App.tsx` — but the "running" phase they lead into has no real simulation behind it yet, and there is no automatic path to the "winner" phase (`UIManager.showWinner()` has no caller). Both of those become real once Phase 6 (Color Expansion) supplies a `Simulation<TState>` implementation, a `StatisticsStore`-backed live stats feed, and a way to detect completion.

`SimulationEngine` still has a full run lifecycle (`start`/`stop`/`restart`/`reset`) and a fixed-timestep simulation update hooked into the tick loop — but there is still no real `Simulation<TState>` implementation anywhere in the repo to load into it. The lifecycle is exercised only by the engine's own logic until Phase 6 supplies the first one.

`StatisticsStore<TStats>` (engine/statistics), `Config<T>` (shared/Config.ts), and now `AspectRatio.ts` (shared/AspectRatio.ts) are available as reusable infrastructure, but nothing constructs a real per-simulation `StatisticsStore` or `Config` instance yet — no simulation exists to report stats or read config from. Each simulation's own `Config.ts` (still an empty placeholder in both ColorExpansion and WeaponClash) is expected to build a `Config<TheirOwnShape>` once that simulation's balance values are decided (Todo.md, Balance).

"Shared Helpers," originally the third item under Phase 4, remains removed from Roadmap.md entirely — it isn't a deferred item, it's a rejected one (see Phase 4 above).

Update "Current Phase" and "Completed Phases" above after every milestone (see Roadmap.md, Development Rules).
