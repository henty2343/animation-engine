# Simulation Blueprint Template

Every new simulation added to the engine should follow this structure.

---

## Name

Simulation name.

---

## Objective

Describe how a player wins.

---

## Determinism

The simulation must produce identical results when started with the same random seed, regardless of machine performance or frame rate.

---

## Players

- Representation
- Health (if applicable)
- Size
- Supported player count

---

## Arena

- Arena type
- Arena size
- Spawn positions
- Arena-specific rules

---

## Movement

Describe how players move.

Examples

- Physics
- Grid
- AI
- Pathfinding

---

## Core Rules

The mechanics shared by every player.

Examples

- Territory capture
- Weapon collision
- Bouncing
- Projectiles

Every player follows these rules.

---

## Character Skills

Describe how every Character modifies the shared mechanics.

Heavy

Swift

Sleeper

Trickster

Future Characters

---

## Statistics

Live statistics shown during the simulation.

---

## Win Condition

Exactly when the simulation ends.

---

## Definition of Done

Not complete until the same seed produces the same result on repeated runs.

Verify

- Same winner.
- Same final statistics.
- Same outcome for every player.

---

## TODO

Future improvements.
