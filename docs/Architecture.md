# Architecture

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
