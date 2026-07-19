# Simulation - Weapon Clash

## Objective

Be the last surviving character.

---

## Determinism

The simulation must produce identical results when started with the same random seed.

---

## Definition of Done

Not complete until the same seed produces the same result on repeated runs.

Verify

- Same winner.
- Same final statistics.
- Same HP, damage, and rotation speed for every player.

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
- Spawn with equal random velocity: magnitude equals the constant movement speed (see Movement Speed, below), direction is randomized.

---

## Physics

Movement is completely physics-driven.

Players

- Never move by AI.
- Never stop moving.
- Bounce off arena walls.
- Bounce off other players.
- Movement speed is constant for every player, for the entire simulation — see Movement Speed, below.

Rules

- No overlap.
- No clipping.
- No tunnelling.
- Deterministic simulation.

Velocity

- Direction and magnitude are chosen exactly once, at spawn, from the run's seeded RNG (see Spawn — equal magnitude, random direction).
- No AI or per-tick decision ever re-chooses a player's intended direction.
- Velocity's direction is only ever modified by collision response: reflecting off a wall, or exchanging velocity in a player↔player or weapon↔weapon bounce.
- Velocity's magnitude (speed) is never permanently changed by collision response. After every tick's physics has fully resolved, every living player's velocity is re-normalized back to the same constant movement speed, preserving whatever direction that tick's physics produced — see Movement Speed, below.
- Whatever velocity results at the end of a tick, after every collision response and the movement-speed normalization for that tick have run, is exactly what carries into the next tick. There is no separate "next" velocity buffer.

---

## Movement Speed

Every player moves at exactly the same constant speed for the entire simulation (see `movementSpeedPixelsPerSecond` in `src/simulations/WeaponClash/Config.ts`).

Rule

- Physics still decides *direction* every tick — wall reflections and player↔player (and, once implemented in Phase 9, weapon↔weapon) bounces still change which way a player is moving, exactly as before.
- Physics never permanently changes a player's *speed*. Once all of a tick's physics has resolved, every non-eliminated player's velocity is normalized back to the exact configured movement speed, in whatever direction that tick's physics left it pointing.
- This prevents speed from drifting up or down over the course of a run, no matter how many collisions a player is involved in — an ordinary elastic Bounce can otherwise change a circle's total speed, not just its direction (see `engine/core/Physics.ts`, `bounceCircles`).
- This is a core gameplay rule, in effect from Phase 8 onward — not a Phase 9 polish item.

Safeguard, not gameplay

- Under normal play, a player's velocity should never actually reach exactly zero — this is not part of the intended physics model. The theoretical possibility (an exact head-on collision with zero tangential component, which would otherwise cancel a player's velocity to precisely zero and leave nothing for the normalization above to preserve a direction from) is guarded against purely as a defensive safeguard against an extremely rare numerical/degenerate edge case, not as an expected or designed-for gameplay situation.
- If it were ever triggered, a fresh direction is drawn from the run's own seeded RNG rather than leaving the player stationary, which would violate "Never stop moving" (see Physics, above). Because that draw still comes from the simulation's seeded RNG, this fallback remains fully deterministic for a given seed even though it is exceptional — it is a fail-safe branch, not a source of randomness or nondeterminism in the ordinary case.
- Effectively unreachable at today's placeholder configuration values; handled defensively rather than assumed away or left to silently misbehave.

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

A frozen player's weapon does not rotate for the duration of the freeze (see Hit Freeze).

---

## Player Collision

Player ↔ Player

- Bounce.
- Never overlap.
- No damage.

A currently-frozen player acts as a static obstacle in this collision (see Hit Freeze): a still-moving player bounces off them normally; the frozen player never moves or changes velocity.

---

## Weapon Collision

Weapon ↔ Weapon

- Bounce players apart.
- Reverse both weapon rotation directions.
- Weapons never overlap.
- Weapons never tunnel.

A currently-frozen player is excluded from this collision entirely (see Hit Freeze).

---

## Weapon Hit

Weapon ↔ Player

- Deals damage.
- One hit per contact.

A weapon must completely leave a player before it can deal damage again.

Weapons may damage multiple players in one swing.

A player currently frozen cannot be involved in a weapon hit, as either attacker or victim (see Hit Freeze) — including later in the same tick the freeze was triggered.

---

## Damage

Default

- Damage = 1

Damage can only increase through Character Skills.

---

## Hit Freeze

A very short hit-stop effect (0.1 seconds), not a gameplay stun.

Trigger

- A successful weapon hit (see Weapon Hit).

On trigger, immediately

- Attacker freezes for 0.1 seconds.
- Victim freezes for 0.1 seconds.
- Both flash white (or another hit effect) for the freeze duration.
- Other players continue normally.

While frozen (either party)

- No movement.
- No weapon rotation.
- A frozen player still participates in collision detection as a static, unmovable obstacle: a still-moving player bounces off them normally on contact, but the frozen player's own velocity is never changed and they never move during the freeze. This is implemented by giving a frozen player's Circle an effectively infinite mass when calling Physics.ts's Bounce primitive (see Architecture.md, Physics) — Physics.ts itself has no concept of "frozen"; it only ever sees two circles with very different masses.
- Cannot be involved in any further hit, as attacker or victim, for the duration — including later in the same tick the freeze was triggered.

When freeze ends

- Movement, rotation, and collision resume using the exact velocity, direction, and weapon rotation state the player had before the freeze.
- Nothing is reset or recalculated. The simulation simply resumes.

Not yet implemented as of Phase 8 (see Roadmap.md — Hit Freeze is explicitly a Phase 9 "Weapon Physics Polish" item, not part of Phase 8's MVP scope). Phase 8's weapon-hit handling deals damage on contact, gated by the "must fully leave before hitting again" cooldown rule below, but does not yet pause/flash either party.

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

See Skills.md for the general skill contract.

Not yet implemented as of Phase 8 (see Roadmap.md, Phase 8 — "Ignore Character Skills"; Phase 10 is Weapon Clash's own Skills phase). The sections below describe the target design, same as Color Expansion's own Character Skills did before its Phase 7.

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

Repeat until one player remains. Every step below skips any player currently frozen (see Hit Freeze), except where noted.

1. Update Physics
   a. Advance freeze timers.
   b. Weapon rotation — non-frozen players only.
   c. Player movement and wall collision — non-frozen players only.
2. Resolve Player Collisions — between non-frozen players only.
3. Resolve Weapon Collisions — reverses both weapons' rotation direction; between non-frozen players only.
4. Normalize Movement Speed — every non-frozen, non-eliminated player's velocity is re-normalized back to the constant configured movement speed, preserving whatever direction Steps 1c/2/3 left it pointing (see Movement Speed, above). A core gameplay rule, not Phase 9 polish.
5. Resolve Weapon Hits — checked in a fixed player order; a player frozen earlier in this same pass is excluded from every later check in the pass, as either attacker or victim.
6. Update player statistics.
7. Remove eliminated players.
8. Check if the simulation has ended.

**Phase 8 scope** (see Roadmap.md, Phase 8 vs Phase 9 — "Weapon Physics Polish"): Phase 8 implements a simplified subset of this loop, matching exactly Phase 8's item list (Physics, Players, Weapons, HP, Damage, Arena collisions, Weapon rotation, Elimination, Win condition) and deliberately omitting every item Phase 9 names separately. Constant Movement Speed (Step 4 above) is implemented from Phase 8 onward regardless — it was added as a core gameplay rule after Phase 8's own review, not deferred alongside the genuine Phase 9 items below (see Progress.md, "Pre-Phase 9 — Constant Movement Speed"):

1. Update Physics: weapon rotation (constant speed, non-eliminated players) and player movement + wall Reflection (non-eliminated players). No freeze timers exist yet (Hit Freeze is Phase 9).
2. Resolve Player Collisions: circle×circle Collision + Bounce between all non-eliminated players.
3. Normalize Movement Speed: every non-eliminated player's velocity is re-normalized back to the exact configured constant movement speed, preserving the direction left by wall Reflection (Step 1) and player-collision Bounce (Step 2) this tick (see Movement Speed, above).
4. Resolve Weapon Hits: segment×circle Collision between each player's weapon and every other non-eliminated player; deals damage on new contact, gated by the "must fully leave before hitting again" rule. Checked in fixed player-slot order for determinism.
5. Update player statistics (HP, damage, rotation speed).
6. Remove eliminated players (HP ≤ 0).
7. Check if the simulation has ended (one or zero non-eliminated players remain).

Not yet implemented in Phase 8, deferred to Phase 9 per Roadmap.md: Weapon↔Weapon collision (step 3 in the full loop above, "reverse both weapon rotation directions"), Hit Freeze (attacker/victim pause + flash), continuous collision / Sweep Test (anti-tunnelling), and strict overlap correction beyond what a single discrete Bounce response already provides.

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

- Balance starting rotation speed. — Temporary placeholder implemented in Phase 8 (see `src/simulations/WeaponClash/Config.ts`, `rotationSpeedRadiansPerSecond`). Not playtested.
- Balance starting damage. — WeaponClash.md already specifies this literally ("Damage = 1"); implemented as-is, not a guessed placeholder.
- Decide initial weapon variants. — Still undecided which variant(s) are selectable; Phase 8 draws a single generic weapon (a rotating segment) with no variant-specific visual, since Weapon Variant selection is Menu-level UI wiring that hasn't been built (see SettingsPanel.tsx's still-unwired "Simulation Settings" section) and no documented mechanic depends on which variant is drawn. Flagged for review.
- Future Character Skills. — Phase 10 (see Roadmap.md).
- Weapon length, player radius, and movement speed — all temporary placeholders implemented in Phase 8 (see `Config.ts`, `movementSpeedPixelsPerSecond` — renamed from `spawnVelocityMagnitude` once it became the constant speed enforced every tick, not just a spawn-time value; see Movement Speed, above). Not playtested.
