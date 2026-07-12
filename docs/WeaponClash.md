# Simulation - Weapon Clash

## Objective

Be the last surviving character.

---

## Determinism

The simulation must produce identical results when started with the same random seed.

---

## Players

- 2–4 players.
- Represented by circles.
- 100 HP.
- Same size for every player.
- Character color matches every other simulation.

---

## Arena

- Universal square arena.
- Same dimensions as every simulation.
- Solid boundaries.
- Players cannot leave the arena.

---

## Spawn

- Random positions.
- Never overlap.
- Never touch arena walls.
- Spawn with equal random velocity.
- Random movement direction.

---

## Physics

Movement is completely physics-driven.

Players

- Never move by AI.
- Never stop moving.
- Bounce off arena walls.
- Bounce off other players.
- Keep constant momentum.

Rules

- No overlap.
- No clipping.
- No tunnelling.
- Deterministic simulation.

---

## Weapons

Every player uses the same weapon.

Weapon Variant examples

- Sword
- Axe
- Bow
- Spear

Weapon is selected before the simulation.

Rules

- Procedurally drawn.
- Same length.
- Attached to player edge.
- Rotates around player.
- Player never rotates.

---

## Weapon Rotation

Default

- Same rotation speed for everyone.

Rotation is only modified by Character Skills.

---

## Player Collision

Player ↔ Player

- Bounce.
- Never overlap.
- No damage.

---

## Weapon Collision

Weapon ↔ Weapon

- Bounce players apart.
- Reverse both weapon rotation directions.
- Weapons never overlap.
- Weapons never tunnel.

---

## Weapon Hit

Weapon ↔ Player

- Deals damage.
- One hit per contact.

A weapon must completely leave a player before it can deal damage again.

Weapons may damage multiple players in one swing.

---

## Damage

Default

- Damage = 1

Damage can only increase through Character Skills.

---

## Hit Feedback

Successful hit

Attacker

- Freeze 0.1 seconds.

Victim

- Freeze 0.1 seconds.
- Flash white during freeze.

Other players

- Continue normally.

---

## Elimination

When HP reaches 0

- Character disappears.
- No longer collides.
- Remaining players continue.

---

## Character Skills

Every Skill modifies existing mechanics.

No Skill introduces new mechanics.

---

### Heavy

Every successful hit

- Damage +1

---

### Swift

Every successful hit

- Rotation Speed +1

---

### Sleeper

Cycle

- Sleep: 1.5 seconds.
- Awake: 3 seconds.

Sleeping

- Weapon does not rotate.
- Player still bounces normally.

Awake

- Weapon rotates faster than default.

Every successful hit

- Awake rotation speed increases.

---

### Trickster

Every successful hit

Randomly upgrades

- Damage
- Rotation Speed

Duplicate rolls are allowed.

---

## Simulation Loop

Repeat until one player remains:

1. Update physics.
2. Resolve player collisions.
3. Resolve weapon collisions.
4. Resolve weapon hits.
5. Update player statistics.
6. Remove eliminated players.
7. Check if the simulation has ended.

---

## Statistics

Displayed during the simulation.

Per player

- HP
- Damage
- Rotation Speed
- Skill

Sorted by

- Highest HP

---

## Intro Screen

Displays

- Weapon Clash
- Weapon Variant
- Characters
- Skill descriptions

Duration

- ~1–2 seconds.

---

## Winner Screen

Simulation freezes immediately.

Displays

- Winner
- Final ranking
- Remaining HP
- Final Damage
- Final Rotation Speed

Winner highlighted.

Remaining players faded.

---

## Visual Rules

- Clean physics.
- Smooth collisions.
- No weapon overlap.
- No player overlap.

---

## TODO

- Balance starting rotation speed.
- Balance starting damage.
- Decide initial weapon variants.
- Future Character Skills.
