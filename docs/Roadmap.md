# Animation Engine - Implementation Timeline

The goal is to build a reusable animation engine capable of supporting many different simulation games.

See Architecture.md for folder structure and Engine.md for the main loop and determinism guarantee. This document does not repeat them.

Every milestone must pass all of the following before moving to the next one:

- TypeScript passes (`tsc -b`)
- Lint passes (`oxlint`)
- Project builds successfully (`vite build`)

Where a milestone touches simulation logic, also verify determinism manually (same seed, same result) until automated regression tests exist.

Never continue to the next milestone without approval.

---

# Phase 1 - Foundation

Goal:
Create the project's architecture.

Implement:

* Engine foundation
* Shared types (Arena, Character, Player, Simulation, Skill)
* Character registry
* Random utility
* Math utility
* Colors utility
* Constants utility
* Settings utility
* Project architecture

No gameplay.

Deliverable:
A clean architecture ready for simulations, matching the folder structure in Architecture.md and the skill contract in Skills.md.

---

# Phase 2 - Rendering

Goal:
Render simulations without gameplay.

Implement:

* Engine tick (requestAnimationFrame)
* Arena renderer
* Character renderer
* Shared rendering pipeline
* Rendering step, driven by the engine tick
* Basic animation timing

Characters should be visible inside an empty arena.

This tick is the only loop in the engine. Phase 3 hooks simulation updates into it — it does not create a second loop.

No simulation logic.

Deliverable:
The engine can render an arena, driven by a single engine tick.

---

# Phase 3 - Simulation Lifecycle

Goal:
The engine can run simulations.

Implement:

* Start simulation
* Stop simulation
* Restart simulation
* Reset simulation
* Simulation update step, hooked into the Phase 2 engine tick (not a second loop)
* Fixed timestep for simulation updates, independent of rendering FPS

These lifecycle methods live on SimulationEngine directly — there is no separate SimulationManager class.

No actual gameplay.

Deliverable:
A simulation can be started and stopped, updating on a fixed timestep from the shared engine tick.

---

# Phase 4 - Shared Systems

Goal:
Build reusable engine systems.

Implement:

* Statistics system
* Configuration system
* Shared helpers

Deliverable:
Common systems available to every simulation.

---

# Phase 5 - Shared UI

Goal:
Build reusable UI used by every simulation.

Implement:

* Main menu
* Simulation selector
* Character selector
* Aspect ratio system (16:9 / 9:16)
* Arena component
* Intro screen
* Winner screen
* Live statistics panel

No gameplay.

Deliverable:
Every future simulation automatically uses the same UI, including both aspect ratios, backed by the Phase 4 statistics and configuration systems.

---

# Phase 6 - Color Expansion MVP

Goal:
Create the first simulation.

Implement:

* Grid
* Players
* Movement
* Territory capture
* Elimination
* Win condition

Ignore Character Skills.

Deliverable:
Playable Color Expansion. Verify determinism: same seed produces the same movement and territory outcome on repeated runs.

---

# Phase 7 - Color Expansion Skills

Implement:

* Heavy
* Swift
* Sleeper
* Trickster

Implement exactly as documented.

Deliverable:
Finished Color Expansion, meeting the Definition of Done in ColorExpansion.md — same seed produces the same winner and statistics on repeated runs, including Trickster's random skill effects.

---

# Phase 8 - Weapon Clash MVP

Goal:
Create the second simulation.

Implement:

* Physics
* Players
* Weapons
* HP
* Damage
* Arena collisions
* Weapon rotation
* Elimination
* Win condition

Ignore Character Skills.

Deliverable:
Playable Weapon Clash. Verify determinism: same seed produces the same physics outcome on repeated runs.

---

# Phase 9 - Weapon Physics Polish

Implement:

* No player overlap
* No weapon overlap
* No tunnelling
* Weapon bounce
* Reverse weapon rotation
* Hit freeze
* Damage flash

Deliverable:
Physics behaves exactly as documented.

---

# Phase 10 - Weapon Clash Skills

Implement:

* Heavy
* Swift
* Sleeper
* Trickster

Implement exactly as documented.

Deliverable:
Finished Weapon Clash, meeting the Definition of Done in WeaponClash.md — same seed produces the same winner and statistics on repeated runs, including Trickster's random skill effects.

---

# Phase 11 - Shared Polish

Implement:

* Intro screen polish
* Winner screen polish
* Statistics polish
* Config polish
* Visual polish

Do not change gameplay.

Deliverable:
Consistent presentation across all simulations.

---

# Phase 12 - Recording

Implement:

* Recording system
* Export video
* Recording settings

Use shared engine systems.

---

# Phase 13 - Audio

Implement:

* Audio manager
* Shared sounds
* Simulation-specific sounds
* Volume settings

---

# Phase 14 - Optimization

Review the project.

Improve:

* Architecture
* Naming
* Reusability
* Performance

Do not change gameplay.

---

# Development Rules

Before every milestone:

* Read the repository.
* Read every document inside /docs.
* Understand the existing architecture.

During development:

* Implement only the current milestone.
* Do not implement future milestones.
* Do not invent gameplay mechanics.
* Do not refactor unrelated systems.

After every milestone:

* Explain what was implemented.
* Explain why.
* List every modified file.
* Update Progress.md.
* Wait for approval before continuing.
