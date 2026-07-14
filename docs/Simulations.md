# Simulation Blueprint Template

Every new simulation added to the engine should follow this structure. Sections may be split into more specific headings where needed — see WeaponClash.md, which splits Core Rules into Physics, Weapons, Weapon Rotation, Player Collision, Weapon Collision, Weapon Hit, and Damage.

---

## Name

Simulation name.

---

## Objective

Describe how a player wins. Include the win condition directly here — there is no separate Win Condition section.

---

## Determinism

The simulation must produce identical results when started with the same random seed, regardless of machine performance or frame rate.

---

## Definition of Done

Not complete until the same seed produces the same result on repeated runs.

Verify

- Same winner.
- Same final statistics.
- Same outcome for every player.

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

## Spawn

Describe exactly where and how players spawn.

---

## Movement

Describe how players move. Depending on the simulation this section may instead be called Physics (see WeaponClash.md) — use whichever name fits.

Examples

- Physics
- Grid
- Pathfinding

---

## Core Rules

The mechanics shared by every player.

Examples

- Territory capture
- Weapon collision
- Bouncing
- Projectiles

Every player follows these rules. Split into more specific sections if one "Core Rules" section becomes hard to read.

---

## Elimination

Describe exactly when and how a player is removed from the simulation.

---

## Character Skills

Describe how every Character modifies the shared mechanics. See Skills.md for the general skill contract.

Heavy

Swift

Sleeper

Trickster

Future Characters

---

## Simulation Loop

The per-tick sequence of steps the simulation runs, from movement/action through to checking whether the simulation has ended.

---

## Statistics

Live statistics shown during the simulation.

---

## Intro Screen

What the intro screen displays, and for how long.

---

## Winner Screen

What the winner screen displays.

---

## Visual Rules

Any simulation-specific visual behaviour (movement smoothing, recoloring, etc).

---

## TODO

Future improvements.
