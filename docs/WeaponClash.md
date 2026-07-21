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

**Anti-tunnelling (Phase 9).** "No tunnelling" above is enforced for player↔player collision via continuous collision detection: alongside the ordinary end-of-tick overlap check, each pair of players is also checked with a swept circle×circle test (see `engine/core/Physics.ts`, `sweepCircleCollision`) using each player's pre-movement position and this tick's velocity. This catches a fast-enough pair that would otherwise pass through each other within a single tick without ever appearing to overlap at either the tick's start or end. See `src/simulations/WeaponClash/WeaponClash.ts`'s Step 2 for the exact mechanism, and Progress.md's "Phase 9 — Weapon Physics Polish" for the full account. Wall collision (`reflectOffWall`) does not need an equivalent continuous check: its per-axis clamp-and-reflect already corrects a post-move position regardless of how far past the wall a single tick's motion carried it, provided that motion doesn't also cross the opposite wall in the same tick — unreachable at this simulation's documented speeds and arena size.

---

## Movement Speed

Every player moves at exactly the same constant speed for the entire simulation (see `movementSpeedPixelsPerSecond` in `src/simulations/WeaponClash/Config.ts`).

Rule

- Physics still decides *direction* every tick — wall reflections and player↔player (and, as of Phase 9, weapon↔weapon) bounces still change which way a player is moving, exactly as before.
- Physics never permanently changes a player's *speed*. Once all of a tick's physics has resolved, every non-frozen, non-eliminated player's velocity is normalized back to the exact configured movement speed, in whatever direction that tick's physics left it pointing. A frozen player's velocity is left untouched instead (see Hit Freeze) — it isn't moving regardless, and must resume with its exact pre-freeze velocity once the freeze ends.
- This prevents speed from drifting up or down over the course of a run, no matter how many collisions a player is involved in — an ordinary elastic Bounce can otherwise change a circle's total speed, not just its direction (see `engine/core/Physics.ts`, `bounceCircles`).
- This is a core gameplay rule, in effect from Phase 8 onward — not a Phase 9 polish item.

Safeguard, not gameplay

- Under normal play, a player's velocity should never actually reach exactly zero — this is not part of the intended physics model. The theoretical possibility (an exact head-on collision with zero tangential component, which would otherwise cancel a player's velocity to precisely zero and leave nothing for the normalization above to preserve a direction from) is guarded against purely as a defensive safeguard against an extremely rare numerical/degenerate edge case, not as an expected or designed-for gameplay situation.
- If it were ever triggered, a fresh direction is drawn from the run's own seeded RNG rather than leaving the player stationary, which would violate "Never stop moving" (see Physics, above). Because that draw still comes from the simulation's seeded RNG, this fallback remains fully deterministic for a given seed even though it is exceptional — it is a fail-safe branch, not a source of randomness or nondeterminism in the ordinary case.
- Effectively unreachable at today's placeholder configuration values; handled defensively rather than assumed away or left to silently misbehave.

---

## Gravity

A very small, constant downward acceleration (see `gravityPixelsPerSecondSquared` in `src/simulations/WeaponClash/Config.ts`), applied every tick to subtly curve movement.

Rules

- Applied to velocity *direction* only, before that tick's movement and wall reflection (Simulation Loop, Step 1c). It never changes a player's overall speed: Step 4 (Normalize Movement Speed) still re-normalizes every non-frozen player's velocity back to the exact constant `movementSpeedPixelsPerSecond` every tick, discarding whatever magnitude gravity's own raw addition produced. Gravity's only lasting effect is to bend trajectories, not to speed players up or slow them down.
- Skipped for a frozen player, exactly like weapon rotation and movement (see Hit Freeze — "No movement").
- A player must never end up resting at the bottom of the arena. Since a player's speed can never reach zero (see Movement Speed — "Never stop moving"), literal rest is already impossible; the real risk gravity introduces is a player's *direction* drifting arbitrarily close to straight down/up over many consecutive ticks with no other perturbation. This is guarded against structurally, not just probabilistically: gravity's contribution to the vertical component of velocity is capped at a fixed fraction of the player's total speed (an internal implementation safeguard, not a tunable balance value — see `MAX_GRAVITY_VERTICAL_SPEED_FRACTION` in `WeaponClash.ts`), guaranteeing a persistent, non-negligible horizontal component always remains.

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

- Same rotation speed (magnitude) for everyone.
- Initial rotation *direction* (clockwise/counter-clockwise) is randomized independently per player at spawn, drawn from the run's seeded RNG — kept fully deterministic for a given seed, while giving matches more starting variety.
- Initial weapon *angle* is likewise randomized independently per player at spawn, rather than a fixed starting angle for everyone. This is not just cosmetic variety — see Weapon Collision's own note below for why a fixed shared starting angle was a genuine bug, not merely a simplification.

Rotation is only modified by Character Skills, and, as of Phase 9, by Weapon Collision (see below), which reverses it.

A frozen player's weapon does not rotate for the duration of the freeze (see Hit Freeze).

---

## Player Collision

Player ↔ Player

- Bounce.
- Never overlap.
- No damage.

A currently-frozen player acts as a static obstacle in this collision (see Hit Freeze): a still-moving player bounces off them normally; the frozen player never moves or changes velocity. This is the authoritative rule for Player Collision — see the Simulation Loop section's own note about resolving an inconsistency in how this step was previously summarized there.

**Overlap correction (Phase 9).** Bounce alone only changes velocity; two circles already touching (or slightly interpenetrating) when a collision is detected can still visually overlap for a tick or two afterward. Player Collision additionally applies a positional correction (see `engine/core/Physics.ts`, `correctCircleOverlap`) splitting the separation between the two players in proportion to the *other* player's mass — so a frozen (effectively infinite-mass) player is corrected by a negligible amount while the still-moving player absorbs nearly all of it, consistent with "the frozen player never moves."

---

## Weapon Collision

Weapon ↔ Weapon

- Bounce players apart.
- Reverse both weapon rotation directions.
- Weapons never overlap.
- Weapons never tunnel.

A currently-frozen player is excluded from this collision entirely (see Hit Freeze).

**Implementation note (Phase 9, revised in a post-Phase-9 playtesting follow-up).** Weapon↔weapon overlap is detected with a segment×segment intersection test (see `engine/core/Physics.ts`, `segmentSegmentIntersect`). No true continuous (closed-form) sweep test is implemented for rotating weapon segments — two independently rotating *and* translating segments have no simple closed-form time-of-impact solution the way two circles moving at constant velocity do (see Physics, above, and `sweepCircleCollision`, which player↔player collision uses for exactly that reason). Instead, detection is **sub-stepped**: each tick, both players' positions and weapon angles are linearly interpolated across several sample points between their pre-tick and post-tick values, and the segment test is run at each sample. This meaningfully reduces (without fully eliminating) the chance of missing a brief crossing within a single tick, at a small, bounded extra cost — a deliberate "good enough, not overengineered" mitigation rather than a rigorous guarantee (see `WEAPON_COLLISION_SUBSTEPS` in `WeaponClash.ts`).

A "must fully leave" cooldown (`activeWeaponCollisionIds`, mirroring Weapon Hit's own identical rule below) prevents the bounce+reversal response from re-triggering on every single tick two weapons remain in continuous contact. Without it, a pair whose overlap persisted for several consecutive ticks would bounce and reverse rotation *every* one of those ticks — visibly "sticking," and, confirmed during this follow-up's own verification, capable of producing a rapidly oscillating rotation-direction jitter that could stall a match's progress for a very long time.

**A genuine bug, found and fixed in the same follow-up: weapon↔weapon collisions could never occur at all in a 2-player match.** Before this fix, every player spawned with the same fixed weapon angle (`0`) and the same fixed positive rotation speed — meaning every pair of weapons started, and then stayed, *permanently parallel* (identical angle, forever, since both rotate at the exact same rate). Truly parallel, non-collinear segments can never intersect, as a matter of geometry, regardless of how the two players move — this was not a flaw in `segmentSegmentIntersect`'s handling of the parallel case, which is mathematically correct, but a spawn-configuration bug that made the parallel case permanent rather than a fleeting, incidental one. In a 2-player match this was 100% reproducible: the only pair in the match always freezes *together* on any Weapon Hit (Hit Freeze applies to both attacker and victim), so nothing ever knocked their weapons out of sync. In 3–4 player matches the same trap existed at spawn but was usually broken quickly, since a hit between any *other* pair leaves a third player's weapon rotating unaffected, introducing phase drift relative to that third player — though it did nothing for two players who only ever happened to freeze with each other. The fix (see Weapon Rotation, above): both initial weapon angle and initial rotation direction are now randomized independently per player, so any two players' weapons are only ever at the exact same relative angle at isolated, fleeting instants — never permanently — for every player count, not just probabilistically for some of them.

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

**Implemented in Phase 9** (see Roadmap.md — Hit Freeze was explicitly deferred from Phase 8's MVP scope to Phase 9's "Weapon Physics Polish"; see Progress.md's "Phase 9 — Weapon Physics Polish" for the full account). Duration is `hitFreezeDurationMs` in `src/simulations/WeaponClash/Config.ts` (100ms — a literal spec value, not a placeholder, exactly like `startingHp`/`baseDamage`). Tracked per player as a plain countdown (`freezeRemainingMs`), decremented once per tick before anything else that tick runs (see Simulation Loop, Step 1a) so a freeze that expires exactly this tick already allows that player to act again this same tick, matching "the simulation simply resumes" above.

**Damage flash.** "Both flash white... for the freeze duration" is implemented by mapping each frozen player's state to a generic `isFlashing` flag on its renderable shape (see `engine/rendering/Renderer.ts`'s `RenderableCharacter`), drawn in a flash color (`HIT_FLASH_COLOR` in `engine/rendering/CharacterRenderer.ts`) instead of the character's own color for exactly as long as `freezeRemainingMs > 0` — so the flash and the freeze always start and end on the same tick, by construction.

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

Not yet implemented (see Roadmap.md, Phase 10 — Weapon Clash's own Skills phase). The sections below describe the target design, same as Color Expansion's own Character Skills did before its Phase 7.

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
   c. Player movement and wall collision — non-frozen players only. Gravity (see Gravity, above) is applied to velocity direction here, immediately before movement and wall reflection.
2. Resolve Player Collisions — a frozen player participates as a static, infinite-mass obstacle rather than being excluded (see Player Collision, and Hit Freeze — this corrects an earlier, imprecise summary of this step as "between non-frozen players only"; the detailed Player Collision and Hit Freeze sections have always been the authoritative description, and are unchanged).
3. Resolve Weapon Collisions — sub-stepped detection across this tick's motion, reverses both weapons' rotation direction, gated by a "must fully leave" cooldown; a frozen player is excluded from this step entirely (see Weapon Collision).
4. Normalize Movement Speed — every non-frozen, non-eliminated player's velocity is re-normalized back to the constant configured movement speed, preserving whatever direction Steps 1c/2/3 left it pointing (see Movement Speed, above). A core gameplay rule, not Phase 9 polish.
5. Resolve Weapon Hits — checked in a fixed player order; a player frozen earlier in this same pass is excluded from every later check in the pass, as either attacker or victim.
6. Update player statistics.
7. Remove eliminated players.
8. Check if the simulation has ended.

**Implemented in full as of Phase 9** (see Progress.md's "Phase 9 — Weapon Physics Polish" for the complete account). Phase 8 implemented a reduced subset of this loop (physics, player collision, weapon hits, elimination, win condition — omitting weapon collision, movement-speed normalization was added just after Phase 8 by a dedicated Pre-Phase 9 session, and hit freeze); Phase 9 completed it with weapon↔weapon collision (Step 3), Hit Freeze (the freeze-timer bookkeeping in Step 1a and the frozen-exclusions throughout), and the anti-tunnelling/overlap-correction primitives described under Physics and Player Collision above.

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
- Hit Freeze damage flash (see Hit Freeze, above) — Phase 9.

---

## TODO

- Balance starting rotation speed. — Temporary placeholder implemented in Phase 8 (see `src/simulations/WeaponClash/Config.ts`, `rotationSpeedRadiansPerSecond`). Not playtested.
- Balance starting damage. — WeaponClash.md already specifies this literally ("Damage = 1"); implemented as-is, not a guessed placeholder.
- Decide initial weapon variants. — Still undecided which variant(s) are selectable; Phase 8 draws a single generic weapon (a rotating segment) with no variant-specific visual, since Weapon Variant selection is Menu-level UI wiring that hasn't been built (see SettingsPanel.tsx's still-unwired "Simulation Settings" section) and no documented mechanic depends on which variant is drawn. Flagged for review.
- Future Character Skills. — Phase 10 (see Roadmap.md).
- Weapon length, player radius, and movement speed — all temporary placeholders implemented in Phase 8 (see `Config.ts`, `movementSpeedPixelsPerSecond` — renamed from `spawnVelocityMagnitude` once it became the constant speed enforced every tick, not just a spawn-time value; see Movement Speed, above). Not playtested.
- ~~Weapon↔weapon collision has no "must fully leave" cooldown, unlike Weapon Hit.~~ — **Fixed** in a post-Phase-9 playtesting follow-up: see Weapon Collision's own implementation note above (`activeWeaponCollisionIds`).
- Continuous (swept), closed-form collision for rotating weapon segments is still not implemented (only player↔player collision has a true Sweep Test) — but detection is now sub-stepped across each tick's motion as a practical mitigation. See Weapon Collision's own implementation note above. A true continuous solution remains unimplemented; flagged here in case it's ever worth the added complexity.
- Gravity's placeholder value (`gravityPixelsPerSecondSquared: 25`) is unplaytested — see Todo.md, Balance.
- Hit Freeze damage flash color/style (currently solid white) — see Todo.md, Visual/Rendering.
