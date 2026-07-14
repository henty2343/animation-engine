# Architecture

## Folder Structure

/src/types

Interfaces and type definitions only. No runtime logic ever lives here. Only holds concepts used by two or more simulations, or by the engine itself — a type used by exactly one simulation belongs inside that simulation's own folder instead.

- Arena
- Character
- Player
- Simulation

/src/shared

Reusable runtime utilities. No interfaces live here.

- Random
- Math
- Colors
- Constants
- Settings

/src/engine

Engine runtime systems only. Never duplicates anything from /types or /shared.

- SimulationEngine — runs the tick loop (requestAnimationFrame, update, render) and owns simulation lifecycle (start, stop, restart, reset). There is no separate SimulationManager class.
- Renderer
- Physics

/src/components

- Arena — the React component that mounts the canvas the engine renders into. It contains no drawing logic; drawing happens in engine/rendering.
- UI — reserved for React-side UI pieces. Purpose not yet decided.
- Shared — reserved for reusable React components. Purpose not yet decided. Not to be confused with the top-level /shared folder, which holds runtime utilities, not components.

Only /src/components/Arena has a confirmed use before Phase 1. UI and Shared are being kept for future use — give each a concrete purpose before adding files, rather than letting either grow undocumented.

Each concept has exactly one canonical location. Random belongs in /shared, not /engine. Character and Simulation are type-only and belong in /types, not /engine. If a file's location is unclear, it belongs in /types only if it has no runtime behaviour, /shared only if it has no engine-specific dependency, and /engine only if it is part of the tick loop or physics/rendering pipeline itself.

## React

React is responsible only for UI, Menu, Settings, Statistics, and starting/stopping simulations.

React never contains gameplay logic.

## Engine

- Simulation Engine
- Physics
- Rendering
- Timing
- Audio
- Recording

## Simulation

Each simulation provides

- Config
- Skills
- Rules
- Update()
- Render()

A simulation never modifies another simulation.

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
