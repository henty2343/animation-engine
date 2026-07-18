# Architecture

## Folder Structure

/src/types

Interfaces and type definitions only. No runtime logic ever lives here. Only holds concepts used by two or more simulations, or by the engine itself — a type used by exactly one simulation belongs inside that simulation's own folder instead.

- Arena
- Character
- Player
- Simulation
- Skill
- SimulationDescriptor — minimal id/name/description metadata used by the Menu's Simulation selector and Intro Screen (see Roadmap.md, Phase 5). Deliberately holds no gameplay, Config, or Simulation<TState> implementation — see SimulationDescriptor.ts's own doc comment for why.
- Vector2 — a 2D vector (`{ x: number; y: number }`). The type itself carries no methods or logic (per this folder's own rule) — see `/src/shared`'s Vector2 math functions for the operations on it, and `engine/core/Physics.ts`'s `Circle`/`Segment` for the shapes built from it. Lives here rather than inside `engine/core/Physics.ts` because it's shared by the engine and, once Weapon Clash exists, by that simulation's own state too — the same "used by the engine or two-or-more simulations" criterion this section states above. Not yet created; introduced ahead of Phase 8 by the Physics Primitive Architecture decision — see Progress.md, "Pre-Phase 8 — Physics Primitive Architecture."

/src/shared

Reusable runtime utilities. No interfaces live here.

- Random
- Math
- Colors
- Constants
- Settings
- Config — generic reusable configuration container (defaults + overrides). Has no engine-specific dependency, so it lives here rather than in /engine, per the placement rule below. Used as the base for engine-wide configuration and for each simulation's own Config.ts.
- AspectRatio — pure functions computing the output canvas's pixel dimensions for a chosen aspect ratio (16:9 / 9:16) and the offset needed to center the universal square arena within it (see Roadmap.md, Phase 5 — "Aspect ratio system"; Engine.md, Arena). No tick-loop dependency, so it lives here rather than in /engine, per the placement rule below — engine/rendering/Renderer.ts is the one place that actually consumes it while drawing.
- Vector2 math — pure functions operating on the `Vector2` type in `/src/types` (add, subtract, scale, normalize, rotate, dot, etc.). No engine-specific dependency, following the exact same placement logic as `Math.ts`'s existing scalar functions (`clamp`, `lerp`, `distance`, `angleBetween`). Not yet created; see Progress.md, "Pre-Phase 8 — Physics Primitive Architecture."

New utilities are added here only once at least two independent systems (e.g. two simulations, or a simulation and the engine) genuinely need the same logic. This folder does not grow speculative or generic helpers ahead of an actual, demonstrated need — see docs/CLAUDE.md, General Principles.

/src/engine

Engine runtime systems only. Never duplicates anything from /types or /shared.

- SimulationEngine — runs the tick loop (requestAnimationFrame, update, render) and owns simulation lifecycle (start, stop, restart, reset). There is no separate SimulationManager class.
- Renderer
- Physics — reserved for genuinely simulation-agnostic geometry and collision primitives only: `Circle` and `Segment` (built on `Vector2`, see `/src/types`), collision detection (circle×circle, segment×circle, segment×segment), Bounce (dynamic-dynamic collision response), Reflection (dynamic-static collision response, e.g. off an arena wall), Sweep Test (continuous collision detection, prevents tunnelling), and Intersection (raw geometric point/overlap queries with no response computed). Every function is pure — it takes primitives in and returns primitives out, and never imports or references a simulation type (Player, Weapon, Enemy, Projectile, or any simulation's own state shape). See the Physics section below, and Progress.md's "Pre-Phase 8 — Physics Primitive Architecture" for the full account and illustrative function signatures. Still an empty placeholder as of this writing — no Weapon Clash code exists yet (Phase 8).
- StatisticsStore (engine/statistics) — generic per-player stats store, plus Ranking.ts's generic sort comparators. Lives here rather than /shared because Roadmap.md's Phase 4 names it an engine system directly ("the engine stores, updates, sorts and exposes statistics"). The engine never defines what statistics exist — each simulation supplies its own stats shape and its own sort comparator.
- UIManager (engine/ui) — owns the shared UI phase lifecycle (Intro -> Running -> Winner, see Engine.md, Timeline and UI). Renders nothing itself; React components in /src/components/UI subscribe to it and render whatever the current phase calls for, the same way SimulationEngine drives the tick loop while engine/rendering does the actual drawing. See Roadmap.md, Phase 5.

/src/components

- Arena — the React component that mounts the canvas the engine renders into. It contains no drawing logic; drawing happens in engine/rendering.
- UI — React components driven by engine/ui/UIManager's phase state: IntroScreen, StatsPanel, WinnerScreen (see Roadmap.md, Phase 5). Each is a pure rendering of whatever generic display data it's given (see components/UI/types.ts's PlayerStatDisplay) — none of them know what any simulation-specific stat means, mirroring engine/statistics/StatisticsStore.ts.
- Shared — small, stateless, purely presentational React primitives reused by both /src/menu and /src/components/UI: Button, Card, SelectableTile (see Roadmap.md, Phase 5). Not to be confused with the top-level /shared folder, which holds runtime utilities, not components.

/src/components/Arena, /src/components/UI, and /src/components/Shared all now have a confirmed use as of Phase 5.

/src/characters

The character registry (see Characters.md). Holds Character data only — no simulation-specific behaviour, which lives in each simulation's own Skills.ts instead.

/src/simulations

One folder per simulation (e.g. ColorExpansion, WeaponClash). Each provides that simulation's own Config, Skills, Rules, Update(), and any types used by that simulation alone (see Simulation section below, and Simulations.md for the template every new simulation follows).

registry.ts, at the top level of this folder (a sibling of the ColorExpansion/ and WeaponClash/ subfolders), lists every simulation's SimulationDescriptor metadata for the Menu — mirroring characters/Characters.ts's registry pattern on the Character side (see Roadmap.md, Phase 5). It never contains gameplay: a simulation being listed here does not mean that simulation folder has anything implemented yet.

/src/menu

React-only setup screens: simulation selection, character selection, simulation-specific settings, aspect ratio, and Start (see Engine.md, Menu). Never contains gameplay logic.

As of Phase 5: Menu.tsx (orchestrator + Start), SimulationSelector.tsx, CharacterSelector.tsx, SettingsPanel.tsx (aspect ratio; simulation-specific settings still a placeholder — see Todo.md, Balance), and MenuSelection.ts (the Menu's output type, kept separate from Menu.tsx so that file exports only the Menu component itself — see .oxlintrc.json, react/only-export-components).

Each concept has exactly one canonical location. Random belongs in /shared, not /engine. Character and Simulation are type-only and belong in /types, not /engine. If a file's location is unclear, it belongs in /types only if it has no runtime behaviour, /shared only if it has no engine-specific dependency, and /engine only if it is part of the tick loop or physics/rendering pipeline itself.

## React

React is responsible only for UI, Menu, Settings, Statistics, and starting/stopping simulations.

React never contains gameplay logic.

## Engine

- Simulation Engine
- Physics
- Rendering
- Statistics
- Timing
- Audio
- Recording

## Simulation

Each simulation provides

- Config
- Skills
- Rules
- Update()

A simulation never modifies another simulation.

Rendering is not part of what a simulation provides — see Rendering below. A simulation only supplies state; the engine draws it. Likewise, a simulation's statistics shape and sort order are its own (see Statistics below) — the engine only stores and ranks whatever the simulation gives it. The same split applies to Physics (see below): a simulation converts its own state into Physics primitives, calls Physics, and decides what the result means — Physics itself never knows the simulation's own concepts.

## Character

Characters contain

- Name
- Color

Characters never contain behaviour.

## Skills

Implemented per simulation. See Skills.md for the full contract.

## Rendering

Engine renders.

Simulation only supplies state.

As of Phase 5, the shared rendering pipeline (Renderer.ts) also draws a letterboxed background sized to the selected aspect ratio (16:9 / 9:16 — see shared/AspectRatio.ts) and centers the square arena within it. A simulation's own coordinates stay arena-local; only the engine's rendering pipeline knows about the aspect-ratio offset.

## Physics

`engine/core/Physics.ts` provides genuinely simulation-agnostic geometry and collision primitives — `Circle` and `Segment`, both built on the shared `Vector2` type (see `/src/types`) — and pure operations on them:

- **Collision** — detection only, no response computed: circle×circle, segment×circle, segment×segment.
- **Bounce** — dynamic-dynamic collision response (two moving circles exchanging velocity).
- **Reflection** — dynamic-static collision response (one moving circle off a fixed surface, e.g. an arena wall).
- **Sweep Test** — continuous collision detection, needed to prevent tunnelling at high velocity.
- **Intersection** — raw geometric point/overlap queries with no response computed.

Physics never knows what a Player, Weapon, Enemy, or Projectile is — not even indirectly, by importing a type from `/src/types` beyond `Vector2` itself, or from any simulation's own folder. Every function takes primitives in and returns primitives out. A simulation converts its own state into `Circle`/`Segment` values, calls Physics, reads the result, and decides what it means (damage, elimination, freeze-frame feedback, reversed rotation, etc.). This mirrors `Grid.ts` and `ColorExpansion.ts`'s existing split exactly: `Grid.ts`'s BFS returns candidate cells; `ColorExpansion.ts` decides what claiming one means. Weapon Clash (Phase 8) is expected to follow the identical pattern — converting its own player/weapon state into `Circle`/`Segment` before ever calling into Physics.

`Vector2` (the type) lives in `/src/types`; the pure math functions that operate on it (add, subtract, scale, normalize, rotate, dot) live in `/src/shared`, alongside `Math.ts`; `Circle`, `Segment`, and every Collision/Bounce/Reflection/Sweep-Test/Intersection function live in `engine/core/Physics.ts` itself — per this document's own placement rule above (`/types` only if it has no runtime behaviour, `/shared` only if it has no engine-specific dependency, `/engine` only if it is part of the tick loop or physics/rendering pipeline itself).

`Circle` carries an optional `mass` (defaulting to `1`). WeaponClash.md only specifies every player is the same size, not necessarily the same mass, but a correct elastic-collision Bounce formula naturally takes mass as a parameter — including it now costs nothing and avoids rewriting the collision math if a future simulation needs unevenly-weighted circles.

See Progress.md's "Pre-Phase 8 — Physics Primitive Architecture" for the full reasoning, including illustrative (not yet implemented) function signatures. `Physics.ts` remains an empty placeholder until Phase 8 begins.

## UI Phase Lifecycle

engine/ui/UIManager owns the Intro -> Running -> Winner phase timeline (see Engine.md, Timeline and UI). It renders nothing — React components in /src/components/UI subscribe to it and render accordingly (see Roadmap.md, Phase 5).

## Statistics

Engine stores, ranks, and exposes per-player statistics via a generic store (see Roadmap.md, Phase 4).

The engine never defines what statistics exist — each simulation supplies its own stats shape and its own sort comparator.

## Configuration

Engine provides a generic, reusable configuration container (see Roadmap.md, Phase 4).

Engine-wide configuration and each simulation's own Config.ts are both built on top of it.

The engine never defines simulation settings.
