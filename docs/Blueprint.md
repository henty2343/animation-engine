# Animation Engine Blueprint

## Engine

### Purpose

- Reusable simulation engine.
- Offline only.
- React + Vite.

---

## Architecture

Menu
↓
Simulation
↓
Recording
↓
Winner
↓
MP4 Export

---

## Menu

### Simulation

- Select simulation.
- Simulation-specific settings.
- Aspect Ratio (16:9 / 9:16).
- Start Simulation.

### Simulation Settings

- Every simulation exposes only the settings it needs.
- Shared layout across every simulation.

Examples

- Number of players
- Weapon variant
- Grid size (if applicable)

---

## Timeline

1. Intro
2. Simulation
3. Winner

---

## Recording

- Starts automatically when simulation starts.
- Stops automatically when winner screen appears.
- Exports MP4 automatically.
- No manual controls.

---

## Arena

- Universal square arena.
- Same dimensions across every simulation.
- Arena size never changes between simulations.

---

## Characters

Every simulation uses the same Character system.

Character

- Name
- Color
- Optional Icon
- Simulation Skill

Rules

- Same color in every simulation.
- Same character across every simulation.
- Skills are unique to the character.
- Skill implementation changes per simulation.
- Names are shown only in the UI.

Current Characters

- Heavy
- Swift
- Sleeper
- Trickster

TODO

- Character #5

---

## Rendering

- Minimalistic 2D.
- Procedurally drawn graphics whenever possible.
- Consistent art style across every simulation.

---

## Physics

Universal Rules

- No clipping.
- No overlap.
- No tunnelling.
- Deterministic simulation.

---

## Sound

Reusable sound system.

Only gameplay sounds.

- Hits
- Collisions
- Eliminations
- Winner

No UI sounds.

---

## User Interface

Shared across every simulation.

### Intro

Displays

- Simulation name
- Variant
- Characters
- One-line Skill description

Duration

- ~1–2 seconds

---

### Live Stats

- Same layout in every simulation.
- Sorted by current ranking.
- Simulation-specific values.

Examples

- Territory
- HP
- Damage
- Rotation Speed

---

### Winner Screen

- Winner highlighted.
- Remaining characters shown in final order.
- Losers faded.
- Final statistics displayed.

---

## Character Skills

Rules

- Every character has one unique Skill.
- Skills are passive.
- Skills never introduce new mechanics.
- Skills modify existing mechanics.
- Skills should always provide an advantage.
- Skills should be visually obvious.
- Skills should remain recognizable across simulations.

---

## Future

- Custom characters.
- More simulations.
- More weapon variants.
