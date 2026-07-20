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
- Vector2 — a 2D vector (`{ x: number; y: number }`). The type itself carries no methods or logic (per this folder's own rule) — see `/src/shared`'s Vector2 math functions for the operations on it, and `engine/core/Physics.ts`'s `Circle`/`Segment` for the shapes built from it. Lives here rather than inside `engine/core/Physics.ts` because it's shared by the engine and, once Weapon Clash exists, by that simulation's own state too — the same "used by the engine or two-or-more simulations" criterion this section states above.

/src/shared

Reusable runtime utilities. No interfaces live here.

- Random
- Math
- Colors
- Constants
- Settings
- Config — generic reusable configuration container (defaults + overrides). Has no engine-specific dependency, so it lives here rather than in /engine, per the placement rule below. Used as the base for engine-wide configuration and for each simulation's own Config.ts.
- AspectRatio — pure functions computing the output canvas's pixel dimensions for a chosen aspect ratio (16:9 / 9:16) and the offset needed to center the universal square arena within it (see Roadmap.md, Phase 5 — "Aspect ratio system"; Engine.md, Arena). No tick-loop dependency, so it lives here rather than in /engine, per the placement rule below — engine/rendering/Renderer.ts is the one place that actually consumes it while drawing.
- Vector2 math — pure functions operating on the `Vector2` type in `/src/types` (add, subtract, scale, normalize, rotate, dot, cross, etc.). No engine-specific dependency, following the exact same placement logic as `Math.ts`'s existing scalar functions (`clamp`, `lerp`, `distance`, `angleBetween`). `cross` (the 2D scalar cross product) was added in Phase 9 alongside `engine/core/Physics.ts`'s new `segmentSegmentIntersect`, which is its first consumer.

New utilities are added here only once at least two independent systems (e.g. two simulations, or a simulation and the engine) genuinely need the same logic. This folder does not grow speculative or generic helpers ahead of an actual, demonstrated need — see docs/CLAUDE.md, General Principles.

/src/engine

Engine runtime systems only. Never duplicates anything from /types or /shared.

- SimulationEngine — runs the tick loop (requestAnimationFrame, update, render) and owns simulation lifecycle (start, stop, restart, reset). There is no separate SimulationManager class.
- Renderer
- Physics — reserved for genuinely simulation-agnostic geometry and collision primitives only: `Circle` and `Segment` (built on `Vector2`, see `/src/types`), collision detection (circle×circle, segment×circle, segment×segment), Bounce (dynamic-dynamic collision response), Reflection (dynamic-static collision response, e.g. off an arena wall), Overlap Correction (positional separation response for two interpenetrating circles), Sweep Test (continuous collision detection, prevents tunnelling), and Intersection (raw geometric point/overlap queries with no response computed). Every function is pure — it takes primitives in and returns primitives out, and never imports or references a simulation type (Player, Weapon, Enemy, Projectile, or any simulation's own state shape). See the Physics section below, and Progress.md's "Pre-Phase 8 — Physics Primitive Architecture" and "Phase 9 — Weapon Physics Polish" for the full account. As of Phase 9, `Physics.ts` implements the complete originally-agreed vocabulary — Collision (circle×circle, segment×circle, segment×segment), Bounce, Reflection, and Sweep Test — plus one addition beyond that original list, Overlap Correction (`correctCircleOverlap`), added because none of Collision/Bounce/Reflection/Sweep Test computes a *positional* response, which "No player overlap"/"No weapon overlap" (Roadmap.md, Phase 9) requires (see Progress.md's Phase 9 entry for the full account of this addition).
- StatisticsStore (engine/statistics) — generic per-player stats store, plus Ranking.ts's generic sort comparators. Lives here rather than /shared because Roadmap.md's Phase 4 names it an engine system directly ("the engine stores, updates, sorts and exposes statistics"). The engine never defines what statistics exist — each simulation supplies its own stats shape and its own sort comparator.
- UIManager (engine/ui) — owns the shared UI phase lifecycle (Intro -> Running -> Winner, see Engine.md, Timeline and UI). Renders nothing itself; React components in /src/components/UI subscribe to it and render whatever the current phase calls for, the same way SimulationEngine drives the tick loop while engine/rendering does the actual drawing. See Roadmap.md, Phase 5.

/src/components

- Arena — the React component that mounts the canvas the engine renders into. It contains no drawing logic; drawing happens in engine/rendering.
- UI — React components driven by engine/ui/UIManager's phase state: IntroScreen, StatsPanel, WinnerScreen (see Roadmap.md, Phase 5). Each is a pure rendering of whatever generic display data it's given (see components/UI/types.ts's PlayerStatDisplay) — none of them know what any simulation-specific stat means, mirroring engine/statistics/StatisticsStore.ts.
- Shared — small, stateless, purely presentational React primitives reused by both /src/menu and /src/components/UI: Button, Card, SelectableTile (see Roadmap.md, Phase 5). Not to be confused with the top-level /shared folder, which holds runtime utilities, not components.

/src/components/Arena, /src/components/UI, and /src/components/Shared all now have a confirmed use as of Phase 5. As of Phase 8, /src/components/Arena holds three components: the Phase 2 demo `Arena.tsx` (fallback for any simulation with no real implementation), `ColorExpansionArena.tsx`, and `WeaponClashArena.tsx`.

/src/characters

The character registry (see Characters.md). Holds Character data only — no simulation-specific behaviour, which lives in each simulation's own Skills.ts instead.

/src/simulations

One folder per simulation (e.g. ColorExpansion, WeaponClash). Each provides that simulation's own Config, Skills, Rules, Update(), and any types used by that simulation alone (see Simulation section below, and Simulations.md for the template every new simulation follows).

registry.ts, at the top level of this folder (a sibling of the ColorExpansion/ and WeaponClash/ subfolders), lists every simulation's SimulationDescriptor metadata for the Menu — mirroring characters/Characters.ts's registry pattern on the Character side (see Roadmap.md, Phase 5).

/src/menu

React-only setup screens: simulation selection, character selection, simulation-specific settings, aspect ratio, and Start (see Engine.md, Menu). Never contains gameplay logic.

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

As of Phase 8, Renderer.ts gained `renderCircleFrame`, a third pipeline alongside `renderFrame` and `renderGridFrame`, for physics-driven circle-based simulations (Weapon Clash): it draws the arena, every player as a circle, and every weapon as a line segment. It shares the same arena-drawing/letterbox logic as the other two pipelines.

As of Phase 9, `RenderableCharacter` (see Renderer.ts) carries an optional `isFlashing` flag, used to draw a character in a Hit-Freeze damage-flash color instead of its own (see WeaponClash.md, Hit Freeze). This is a purely visual, generic flag — Renderer.ts and CharacterRenderer.ts don't know it means "just got hit"; they only know how to draw a circle in one of two colors depending on a boolean a simulation supplies, mirroring how neither file knows what "damage" or "HP" mean either.

## Physics

`engine/core/Physics.ts` provides genuinely simulation-agnostic geometry and collision primitives — `Circle` and `Segment`, both built on the shared `Vector2` type (see `/src/types`) — and pure operations on them:

- **Collision** — detection only, no response computed: circle×circle, segment×circle, segment×segment.
- **Bounce** — dynamic-dynamic collision response (two moving circles exchanging velocity).
- **Reflection** — dynamic-static collision response (one moving circle off a fixed surface, e.g. an arena wall).
- **Overlap Correction** — positional separation response for two interpenetrating circles, splitting the correction between them in inverse proportion to mass (mirrors Bounce's own mass-weighting). Added in Phase 9 (see below) — not part of the original Pre-Phase 8 vocabulary, since none of Collision/Bounce/Reflection/Sweep Test computes a *positional* response, which Roadmap.md's Phase 9 "No player overlap"/"No weapon overlap" items need.
- **Sweep Test** — continuous collision detection between two moving circles, needed to prevent tunnelling at high velocity.
- **Intersection** — raw geometric point/overlap queries with no response computed.

Physics never knows what a Player, Weapon, Enemy, or Projectile is — not even indirectly, by importing a type from `/src/types` beyond `Vector2` itself, or from any simulation's own folder. Every function takes primitives in and returns primitives out. A simulation converts its own state into `Circle`/`Segment` values, calls Physics, reads the result, and decides what it means (damage, elimination, freeze-frame feedback, reversed rotation, etc.).

`Circle` carries an optional `mass` (defaulting to `1`). WeaponClash.md only specifies every player is the same size, not necessarily the same mass, but a correct elastic-collision Bounce formula naturally takes mass as a parameter. As of Phase 9, this is exercised for real: a frozen player's Circle is given an effectively infinite mass (see WeaponClash.ts's `STATIC_OBSTACLE_MASS`) when a still-moving player bounces off them, producing the "static, unmovable obstacle" behavior Hit Freeze documents, without `Physics.ts` itself needing any concept of "frozen."

**Phase 9 — implemented** (see Roadmap.md, Phase 9; Progress.md's "Phase 9 — Weapon Physics Polish" for the full account): `sweepCircleCollision` (continuous circle×circle collision, for anti-tunnelling), `correctCircleOverlap` (positional overlap correction), and `segmentSegmentIntersect` (discrete segment×segment collision, for weapon↔weapon detection) are all now implemented, completing `Physics.ts`'s primitive set for Weapon Clash.

See Progress.md's "Pre-Phase 8 — Physics Primitive Architecture" for the original vocabulary and reasoning, and "Phase 9 — Weapon Physics Polish" for what was actually implemented on top of it.

## UI Phase Lifecycle

engine/ui/UIManager owns the Intro -> Running -> Winner phase timeline (see Engine.md, Timeline and UI). It renders nothing — React components in /src/components/UI subscribe to it and render accordingly (see Roadmap.md, Phase 5).

## Statistics

Engine stores, ranks, and exposes per-player statistics via a generic store (see Roadmap.md, Phase 4).

The engine never defines what statistics exist — each simulation supplies its own stats shape and its own sort comparator.

## Configuration

Engine provides a generic, reusable configuration container (see Roadmap.md, Phase 4).

Engine-wide configuration and each simulation's own Config.ts are both built on top of it.

The engine never defines simulation settings.
