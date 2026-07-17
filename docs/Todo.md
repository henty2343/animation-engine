# Project TODO

Items here are undecided or unsequenced. Once an item is decided and given a phase, move it into Roadmap.md and remove it from here.

## Characters

- Design Character #5.

---

## Simulations

Planned

- Color Expansion
- Weapon Clash

Future

- Simulation #3
- Simulation #4
- Simulation #5

---

## Weapons

Planned Variants

- Sword
- Axe
- Bow
- Spear

Future

- Additional procedural weapon types.

---

## Balance

Color Expansion

- Grid dimensions. — Temporary placeholder: 20×20 cells (see `src/simulations/ColorExpansion/Config.ts`, `gridSize`). Not playtested; expected to change once the project owner plays a real run.
- Base movement speed. — Temporary placeholder: 4 cells/second (see `src/simulations/ColorExpansion/Config.ts`, `movementSpeedCellsPerSecond`). Not playtested; expected to change.

Weapon Clash

- Base rotation speed.
- Base damage.
- Weapon lengths.
- Weapon balancing.

---

## Visual / Rendering

Color Expansion

- Player square size. — Temporary placeholder: 70% of one grid cell (see `playerSquareCellRatio` in `src/simulations/ColorExpansion/Config.ts`). Not gameplay logic, but still a Color-Expansion-specific tuning value, so it lives in that simulation's own Config alongside `gridSize`/`movementSpeedCellsPerSecond` rather than as a hardcoded number in `engine/rendering/Renderer.ts`. The value itself (0.7) is still unreviewed and expected to change if a different visual treatment is preferred — only its location was settled this session.

---

## Future Features

- Custom Characters.
- Character editor.
- Additional simulation settings.
