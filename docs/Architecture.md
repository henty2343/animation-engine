# Architecture

Folder Structure

/src/types

Interfaces and type definitions only. No runtime logic ever lives here.

- Arena
- Character
- Player
- Simulation
- Weapon

/src/shared

Reusable runtime utilities. No interfaces live here.

- Random
- Math
- Colors
- Constants
- Settings

/src/engine

Engine runtime systems only. Never duplicates anything from /types or /shared.

- SimulationEngine — runs the tick loop (requestAnimationFrame, update, render).
- SimulationManager — starts, stops, restarts, and resets whichever simulation is active.
- Renderer
- Physics

Each concept has exactly one canonical location. Random belongs in /shared, not /engine. Character and Simulation are type-only and belong in /types, not /engine. If a file's location is unclear, it belongs in /types only if it has no runtime behaviour, /shared only if it has no engine-specific dependency, and /engine only if it is part of the tick loop or physics/rendering pipeline itself.

Engine

- Simulation Engine
- Physics
- Rendering
- Audio
- Recording

Simulation

Each simulation provides

- Config
- Skills
- Update()
- Render()

Character

Characters contain

- Name
- Color

Characters never contain behaviour.

Skills

Implemented per simulation.

Rendering

Engine renders.

Simulation only supplies state.
