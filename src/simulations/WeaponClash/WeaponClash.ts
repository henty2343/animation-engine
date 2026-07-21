import type { Simulation } from '../../types/Simulation'
import type { Player } from '../../types/Player'
import type { Vector2 } from '../../types/Vector2'
import { Random } from '../../shared/Random'
import { add, subtract, scale, normalize, length } from '../../shared/Vector2'
import { UNIVERSAL_ARENA_SIZE } from '../../shared/Constants'
import {
  circleCircleCollision,
  bounceCircles,
  reflectOffWall,
  segmentCircleIntersect,
  sweepCircleCollision,
  correctCircleOverlap,
  segmentSegmentIntersect,
  type Circle,
} from '../../engine/core/Physics'
import { getWeaponSegment, advanceWeaponAngle } from './Weapon'
import { WEAPON_CLASH_CONFIG } from './Config'
import type { RenderableCharacter, RenderableWeapon } from '../../engine/rendering/Renderer'

/**
 * Weapon Clash (see docs/WeaponClash.md). Phase 8 implemented the MVP
 * subset of that document, plus a Pre-Phase 9 addition (Constant
 * Movement Speed). Phase 9 ("Weapon Physics Polish" — see Roadmap.md)
 * completed the full Simulation Loop: anti-tunnelling and overlap
 * correction for player↔player collision, weapon↔weapon collision
 * (bounce + reverse rotation), Hit Freeze, and the damage flash.
 *
 * This file was revised again in a **post-Phase-9 playtesting follow-up**
 * (see Progress.md for the full account), before Phase 9's final
 * approval, adding: (1) a small, subtle downward Gravity; (2) randomized
 * initial weapon rotation direction *and* starting angle per player; (3)
 * a fix for a genuine bug where 2-player matches structurally never saw
 * a weapon↔weapon collision; and (4) a "must fully leave" cooldown plus
 * sub-stepped anti-tunnelling for weapon↔weapon collision, addressing
 * "sticking" and residual tunnelling risk. Character Skills remain out
 * of scope (Roadmap.md, Phase 10).
 *
 * A Weapon Clash player is the shared Player type (id, slot, character —
 * see types/Player.ts) plus the physics/combat state only this
 * simulation needs (see Architecture.md's one-canonical-location rule).
 */
export interface WeaponClashPlayerState extends Player {
  position: Vector2
  velocity: Vector2

  hp: number
  /** Damage dealt per successful hit. Constant in Phase 8/9 (no Skills yet — see Characters.md, Heavy: "Damage +1" per hit, arriving in Phase 10). */
  damage: number
  /**
   * Radians per second. Positive = one rotation direction, negative =
   * the other — sign is randomized per player at spawn (see
   * `createInitialState` below) and flipped by Weapon Collision's
   * rotation reversal. Magnitude is otherwise constant until Skills
   * arrive in Phase 10 (see Characters.md, Swift).
   */
  rotationSpeed: number
  /** Current weapon rotation angle, in radians. See simulations/WeaponClash/Weapon.ts. */
  weaponAngle: number

  /** See WeaponClash.md, Elimination. An eliminated player disappears and no longer collides. */
  eliminated: boolean

  /**
   * Ids of every other player this player's weapon is *currently* in
   * contact with — i.e. already dealt damage for this contact, not yet
   * cleared (see WeaponClash.md, Weapon Hit — "A weapon must completely
   * leave a player before it can deal damage again"). Cleared for a
   * given victim id the first tick the weapon's Segment no longer
   * intersects that victim's Circle, allowing a fresh hit on the next
   * contact. Tracked per-attacker (not per-victim) since a single
   * weapon may be hitting several victims in the same swing at once
   * (see WeaponClash.md, Weapon Hit — "Weapons may damage multiple
   * players in one swing").
   */
  activeWeaponHitIds: Set<string>

  /**
   * Ids of every other player whose weapon this player's weapon is
   * *currently* locked in a weapon↔weapon collision with — i.e. already
   * bounced + reversed rotation for this contact episode, not yet
   * cleared. Mirrors `activeWeaponHitIds`'s "must fully leave" pattern,
   * applied to Weapon Collision instead of Weapon Hit (see
   * WeaponClash.md, Weapon Collision). Symmetric: a contact between `a`
   * and `b` is recorded in *both* players' sets. Added in the
   * post-Phase-9 playtesting follow-up to fix weapons "sticking"
   * (bouncing and reversing rotation on every single tick while still
   * overlapping — see Progress.md).
   */
  activeWeaponCollisionIds: Set<string>

  /**
   * Milliseconds remaining in this player's current Hit Freeze, or `0`
   * when not frozen (see WeaponClash.md, Hit Freeze). Counts down once
   * per tick, first thing every tick (see `update()`'s Step 1a below),
   * clamped at 0 — so a freeze that expires exactly this tick already
   * lets this player act again this same tick, matching "the simulation
   * simply resumes." Set to `hitFreezeDurationMs` (see Config.ts) on
   * both attacker and victim the instant a weapon hit lands (Step 5
   * below).
   */
  freezeRemainingMs: number
}

export interface WeaponClashState {
  players: WeaponClashPlayerState[]
  /** This run's seeded RNG (see shared/Random.ts) — spawn positions, initial velocity direction, initial weapon angle, and initial rotation direction are its consumers. */
  random: Random
}

/** Live per-player statistics (see WeaponClash.md, Statistics). */
export interface WeaponClashStats {
  hp: number
  damage: number
  rotationSpeed: number
  eliminated: boolean
}

/**
 * Effectively-infinite mass assigned to a frozen player's Circle when it
 * participates in a Physics.ts collision call as the "other" party (see
 * WeaponClash.md, Hit Freeze — "This is implemented by giving a frozen
 * player's Circle an effectively infinite mass when calling Physics.ts's
 * Bounce primitive"). Large enough that `bounceCircles`'/
 * `correctCircleOverlap`'s mass-weighted formulas leave the frozen
 * circle's own computed velocity/position change negligible — and this
 * file additionally guards every assignment back to a frozen player
 * with an explicit `isFrozen` check (see `update()` below), so the
 * frozen player is exactly, not just approximately, unaffected. A very
 * large *finite* number, not `Infinity`, keeps the arithmetic itself
 * well-behaved (no risk of `Infinity`/`NaN` propagating through the
 * mass-weighted formulas).
 */
const STATIC_OBSTACLE_MASS = 1_000_000

/**
 * Safeguard cap (see `applyGravity` below): the fraction of a player's
 * total (constant) speed that Gravity's downward pull is ever allowed to
 * claim as pure vertical motion. Not a gameplay/balance value — an
 * internal correctness guarantee, in the same spirit as
 * `enforceConstantMovementSpeed`'s existing zero-velocity fallback (see
 * that function's own "Safeguard, not gameplay" doc comment), ensuring
 * the documented requirement that a player must never end up resting at
 * the bottom of the arena holds *structurally*, not just probabilistically.
 */
const MAX_GRAVITY_VERTICAL_SPEED_FRACTION = 0.9

/**
 * Number of evenly-spaced sub-steps sampled across each tick's motion
 * when checking whether two players' weapons collided (see the Weapon
 * Collision section of `update()` below, and WeaponClash.md's Weapon
 * Collision — "Weapons never tunnel"). Not a gameplay/balance value —
 * an internal correctness/performance tradeoff constant, mirroring
 * `STATIC_OBSTACLE_MASS` and `MAX_GRAVITY_VERTICAL_SPEED_FRACTION` above.
 */
const WEAPON_COLLISION_SUBSTEPS = 4

/** Whether `player` is currently in a Hit Freeze (see WeaponClash.md, Hit Freeze). */
function isFrozen(player: WeaponClashPlayerState): boolean {
  return player.freezeRemainingMs > 0
}

/**
 * Converts a player into a Physics.ts Circle for a collision call,
 * giving a frozen player's Circle the effectively-infinite mass above
 * (see Hit Freeze) so a still-moving player bouncing off it gets a
 * full, static-obstacle-style reflection.
 */
function toCollisionCircle(player: WeaponClashPlayerState, radius: number): Circle {
  return {
    center: player.position,
    radius,
    mass: isFrozen(player) ? STATIC_OBSTACLE_MASS : 1,
  }
}

/**
 * Applies one tick's worth of downward gravitational acceleration to a
 * velocity vector (see WeaponClash.md, Gravity). Deliberately does
 * *not* touch overall speed on its own — Step 4 of the Simulation Loop
 * (`enforceConstantMovementSpeed`) always re-normalizes every non-frozen
 * player's velocity back to the exact constant `movementSpeedPixelsPerSecond`
 * afterward, discarding whatever magnitude gravity's raw addition
 * produced. This function's only lasting effect is on *direction* — it
 * subtly biases each tick's velocity toward straight down before that
 * direction gets used for this tick's movement and, later, gets
 * magnitude-normalized.
 *
 * Guards against the one failure mode the request explicitly called
 * out — "players... should never end up resting at the bottom of the
 * arena." A player's speed can never reach zero (see Movement Speed's
 * own "Never stop moving" guarantee, unaffected by this function), so
 * literal rest is already impossible; the real risk is a player's
 * *direction* drifting arbitrarily close to straight down/up over many
 * consecutive ticks with no other perturbation, leaving it bouncing in
 * an almost-purely-vertical line hugging one wall with negligible
 * horizontal drift. `MAX_GRAVITY_VERTICAL_SPEED_FRACTION` caps the
 * vertical component's share of the total speed, guaranteeing a
 * persistent, non-negligible horizontal component always remains —
 * structurally, not just because collisions usually intervene first in
 * practice.
 */
function applyGravity(
  velocity: Vector2,
  gravityPixelsPerSecondSquared: number,
  deltaTimeSeconds: number,
): Vector2 {
  const withGravity: Vector2 = {
    x: velocity.x,
    y: velocity.y + gravityPixelsPerSecondSquared * deltaTimeSeconds,
  }

  const speed = length(withGravity)
  if (speed === 0) return withGravity // defensive only — see Movement Speed's own "Never stop moving" guarantee

  const maxVerticalMagnitude = speed * MAX_GRAVITY_VERTICAL_SPEED_FRACTION
  if (Math.abs(withGravity.y) <= maxVerticalMagnitude) {
    return withGravity
  }

  const clampedY = Math.sign(withGravity.y) * maxVerticalMagnitude
  const remainingHorizontalMagnitude = Math.sqrt(Math.max(0, speed * speed - clampedY * clampedY))
  // A deterministic, fixed fallback direction (rightward) for the
  // vanishingly unlikely case `withGravity.x` is exactly 0 at the tick
  // this cap engages — mirrors this file's existing preference for
  // simple deterministic defaults over spending an RNG draw on a
  // near-unreachable edge case (see `weaponAngle: 0`'s own former
  // reasoning, before this session — see Progress.md).
  const horizontalSign = withGravity.x === 0 ? 1 : Math.sign(withGravity.x)

  return { x: horizontalSign * remainingHorizontalMagnitude, y: clampedY }
}

/**
 * Draws a random spawn position for one player: uniformly within the
 * arena, inset by `playerRadius` on every side so the player circle
 * never touches an arena wall (see WeaponClash.md, Spawn — "Never touch
 * arena walls"), then redrawn (via the same seeded RNG, so the outcome
 * stays deterministic for a given seed) if it would overlap any
 * already-placed player (see Spawn — "Never overlap"). Processed in
 * fixed player-slot order — the same determinism pattern
 * ColorExpansion.ts's own fixed processing order already established —
 * so a given seed and roster always draw the same sequence of positions.
 */
function drawSpawnPosition(
  random: Random,
  playerRadius: number,
  arenaSize: number,
  alreadyPlaced: readonly Circle[],
): Vector2 {
  // A generous but finite cap avoids an unbounded loop in a
  // (currently unreachable, given today's placeholder radius/arena
  // values) pathological case where the arena is too small for the
  // roster to fit without overlap — see Progress.md, Phase 8 judgment
  // calls, "Spawn rejection sampling."
  const MAX_ATTEMPTS = 500

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate: Vector2 = {
      x: random.nextFloat(playerRadius, arenaSize - playerRadius),
      y: random.nextFloat(playerRadius, arenaSize - playerRadius),
    }

    const overlapsExisting = alreadyPlaced.some(
      (other) => circleCircleCollision({ center: candidate, radius: playerRadius }, other).colliding,
    )

    if (!overlapsExisting) return candidate
  }

  // Falls through only in the pathological case above; still
  // deterministic for a given seed (the RNG has already been advanced
  // MAX_ATTEMPTS times), just not guaranteed overlap-free.
  return {
    x: random.nextFloat(playerRadius, arenaSize - playerRadius),
    y: random.nextFloat(playerRadius, arenaSize - playerRadius),
  }
}

/**
 * Re-normalizes every non-frozen, non-eliminated player's velocity back
 * to the simulation's constant movement speed, preserving whatever
 * direction this tick's physics (including Gravity — see `applyGravity`
 * above) left it pointing (see docs/WeaponClash.md, Movement Speed). A
 * frozen player is skipped entirely — its velocity must stay exactly
 * what it was the instant it froze, ready to resume unchanged once the
 * freeze ends (see Hit Freeze — "Nothing is reset or recalculated").
 *
 * Safeguard, not gameplay: under normal play this function only ever
 * rescales an existing, non-zero direction — a player's velocity should
 * never actually reach exactly {0, 0}. The `isZeroLength` branch below
 * exists purely as a defensive guard against an extremely rare
 * numerical/degenerate edge case and is not part of the intended
 * physics model. The fallback still draws from `state.random` — the
 * run's own seeded RNG — so even this exceptional path stays fully
 * deterministic for a given seed; it is a defensive branch, not a
 * source of nondeterminism.
 */
function enforceConstantMovementSpeed(state: WeaponClashState, movementSpeed: number): void {
  for (const player of state.players) {
    if (player.eliminated || isFrozen(player)) continue

    const direction = normalize(player.velocity)
    const isZeroLength = direction.x === 0 && direction.y === 0
    const resolvedDirection = isZeroLength ? randomUnitVector(state.random) : direction

    player.velocity = scale(resolvedDirection, movementSpeed)
  }
}

/**
 * A uniformly random unit vector, drawn from the given seeded RNG (see
 * shared/Random.ts). Only ever called from the defensive zero-velocity
 * branch in `enforceConstantMovementSpeed` above — not part of normal
 * per-tick movement, which always has a real direction to preserve.
 */
function randomUnitVector(random: Random): Vector2 {
  const angle = random.nextFloat(0, Math.PI * 2)
  return { x: Math.cos(angle), y: Math.sin(angle) }
}

/**
 * Linearly interpolates a Vector2 between `from` and `to` by `t` (see
 * the weapon-collision sub-stepping in `update()` below, which
 * interpolates each player's position across this tick's motion for
 * anti-tunnelling purposes). A small local helper rather than a new
 * `shared/Vector2.ts` export — this is the only call site, and
 * Architecture.md's own rule for `/src/shared` is to add a utility only
 * once at least two independent systems need it.
 */
function lerpVector2(from: Vector2, to: Vector2, t: number): Vector2 {
  return add(from, scale(subtract(to, from), t))
}

/**
 * Builds a Weapon Clash Simulation<WeaponClashState> for a fixed roster
 * of 2–4 players (see Engine.md, Menu).
 */
export function createWeaponClashSimulation(players: Player[]): Simulation<WeaponClashState> {
  return {
    createInitialState(seed: number): WeaponClashState {
      const random = new Random(seed)

      const playerRadius = WEAPON_CLASH_CONFIG.get('playerRadius')
      const movementSpeed = WEAPON_CLASH_CONFIG.get('movementSpeedPixelsPerSecond')
      const startingHp = WEAPON_CLASH_CONFIG.get('startingHp')
      const baseDamage = WEAPON_CLASH_CONFIG.get('baseDamage')
      const rotationSpeedMagnitude = WEAPON_CLASH_CONFIG.get('rotationSpeedRadiansPerSecond')

      const placedCircles: Circle[] = []

      const playerStates: WeaponClashPlayerState[] = players.map((player) => {
        const position = drawSpawnPosition(random, playerRadius, UNIVERSAL_ARENA_SIZE, placedCircles)
        placedCircles.push({ center: position, radius: playerRadius })

        // Equal magnitude, random direction (see WeaponClash.md, Spawn).
        // This is the same constant movement speed the player's velocity
        // gets re-normalized back to every tick thereafter (see
        // enforceConstantMovementSpeed below) — spawn just draws the
        // first direction, it isn't a special one-time magnitude.
        const velocityAngle = random.nextFloat(0, Math.PI * 2)
        const velocity = scale({ x: Math.cos(velocityAngle), y: Math.sin(velocityAngle) }, movementSpeed)

        // Initial weapon angle and rotation direction (post-Phase-9
        // playtesting follow-up — see Progress.md). Both are randomized,
        // in this fixed order, from the same seeded RNG:
        //
        // - `weaponAngle`: previously a fixed `0` for every player. That
        //   turned out to be a real bug, not just a cosmetic choice: with
        //   every player starting at the same angle and (previously)
        //   rotating at the same fixed positive speed, every pair of
        //   weapons stayed *permanently* parallel — and truly-parallel,
        //   non-collinear segments can never intersect, geometrically,
        //   no matter how the two players move. In a 2-player match this
        //   was a structural, 100%-reproducible bug (the only pair
        //   in the match always freezes *together* on any hit, since
        //   Hit Freeze applies to both attacker and victim, so nothing
        //   ever knocks their weapons out of sync) — confirmed directly
        //   by inspecting a run: after 600 ticks, both weapons were at
        //   the exact same angle, diff `0`. In 3-4 player matches the
        //   same trap existed initially but was usually broken quickly,
        //   since a hit between any *other* pair leaves a third player's
        //   weapon rotating on unaffected while the hit pair freezes
        //   together — introducing phase drift relative to that third
        //   player, even though it does nothing for two players who only
        //   ever freeze with each other. Randomizing the starting angle
        //   independently per player means any two players' weapons are
        //   only ever at the exact same relative angle at isolated
        //   instants (probability zero with a continuous RNG), not
        //   permanently — fixing the bug structurally, for every player
        //   count, rather than leaving it to chance.
        // - Rotation *direction* (clockwise/counter-clockwise): the
        //   explicitly requested change — a coin flip off the same RNG,
        //   applied as a sign on the config's rotation speed magnitude.
        //   On its own this would only reduce (not eliminate) the
        //   2-player bug above, since two players can still coincidentally
        //   draw the same direction — the angle randomization above is
        //   what makes the fix unconditional.
        const weaponAngle = random.nextFloat(0, Math.PI * 2)
        const rotationDirection = random.chance(0.5) ? 1 : -1
        const rotationSpeed = rotationDirection * rotationSpeedMagnitude

        return {
          ...player,
          position,
          velocity,
          hp: startingHp,
          damage: baseDamage,
          rotationSpeed,
          weaponAngle,
          eliminated: false,
          activeWeaponHitIds: new Set<string>(),
          activeWeaponCollisionIds: new Set<string>(),
          freezeRemainingMs: 0,
        }
      })

      return { players: playerStates, random }
    },

    update(state: WeaponClashState, deltaTimeMs: number): WeaponClashState {
      const playerRadius = WEAPON_CLASH_CONFIG.get('playerRadius')
      const weaponLength = WEAPON_CLASH_CONFIG.get('weaponLength')
      const movementSpeed = WEAPON_CLASH_CONFIG.get('movementSpeedPixelsPerSecond')
      const hitFreezeDurationMs = WEAPON_CLASH_CONFIG.get('hitFreezeDurationMs')
      const gravityPixelsPerSecondSquared = WEAPON_CLASH_CONFIG.get('gravityPixelsPerSecondSquared')
      const deltaTimeSeconds = deltaTimeMs / 1000

      // Step 1a: advance freeze timers (see WeaponClash.md, Hit Freeze).
      // Runs first so a freeze that expires exactly this tick already
      // lets that player move/rotate again in Steps 1b/1c below —
      // "when freeze ends... the simulation simply resumes," not on a
      // one-tick delay.
      for (const player of state.players) {
        if (player.eliminated || player.freezeRemainingMs <= 0) continue
        player.freezeRemainingMs = Math.max(0, player.freezeRemainingMs - deltaTimeMs)
      }

      // Captured before Step 1c moves/rotates anyone, so Step 2's sweep
      // test and Step 3's sub-stepped weapon-collision check below both
      // have a "before" and "after" sample to interpolate/check this
      // tick's travel against (see Physics.ts, sweepCircleCollision, and
      // Step 3's own comment below).
      const previousPositions = new Map(state.players.map((player) => [player.id, player.position]))
      const previousWeaponAngles = new Map(state.players.map((player) => [player.id, player.weaponAngle]))

      // Step 1b/1c: weapon rotation + movement/wall collision —
      // non-frozen, non-eliminated players only (see WeaponClash.md,
      // Simulation Loop). Gravity (see applyGravity above) is folded in
      // here, biasing this tick's movement direction before wall
      // reflection runs.
      for (const player of state.players) {
        if (player.eliminated || isFrozen(player)) continue

        player.weaponAngle = advanceWeaponAngle(player.weaponAngle, player.rotationSpeed, deltaTimeMs)

        const velocityWithGravity = applyGravity(player.velocity, gravityPixelsPerSecondSquared, deltaTimeSeconds)

        const movedPosition = add(player.position, scale(velocityWithGravity, deltaTimeSeconds))
        const reflected = reflectOffWall(movedPosition, velocityWithGravity, playerRadius, UNIVERSAL_ARENA_SIZE)
        player.position = reflected.position
        player.velocity = reflected.velocity
      }

      // Step 2: Resolve Player Collisions. Per WeaponClash.md's detailed
      // Player Collision and Hit Freeze sections (the authoritative
      // description — see docs/Progress.md's Phase 9 documentation
      // judgment call, resolving an inconsistency with an earlier, terser
      // summary elsewhere in that same document), a frozen player still
      // participates here, as an immovable obstacle a still-moving
      // player bounces off — it is only Weapon Collision (Step 3) and
      // Weapon Hits (Step 5) that exclude a frozen player entirely. Two
      // simultaneously-frozen players are skipped outright: neither can
      // move, so there is nothing to resolve.
      for (let i = 0; i < state.players.length; i++) {
        const a = state.players[i]
        if (a.eliminated) continue

        for (let j = i + 1; j < state.players.length; j++) {
          const b = state.players[j]
          if (b.eliminated) continue
          if (isFrozen(a) && isFrozen(b)) continue

          const circleA = toCollisionCircle(a, playerRadius)
          const circleB = toCollisionCircle(b, playerRadius)

          const discrete = circleCircleCollision(circleA, circleB)
          if (discrete.colliding) {
            const bounce = bounceCircles(circleA, a.velocity, circleB, b.velocity)
            if (!isFrozen(a)) a.velocity = bounce.velocityA
            if (!isFrozen(b)) b.velocity = bounce.velocityB

            // Overlap correction: a purely positional separation
            // alongside the velocity response above, so the two circles
            // don't keep visually interpenetrating (see WeaponClash.md,
            // Player Collision — "Overlap correction").
            const correction = correctCircleOverlap(circleA, circleB)
            if (!isFrozen(a)) a.position = add(a.position, correction.correctionA)
            if (!isFrozen(b)) b.position = add(b.position, correction.correctionB)
            continue
          }

          // Anti-tunnelling (see Physics.ts, sweepCircleCollision): the
          // discrete check above found no overlap at the *end* of this
          // tick's motion, but a fast-enough pair can still have crossed
          // paths somewhere *during* it. Check using each player's
          // pre-Step-1c position and this tick's velocity.
          const previousA = previousPositions.get(a.id)!
          const previousB = previousPositions.get(b.id)!
          const sweepCircleA: Circle = { ...circleA, center: previousA }
          const sweepCircleB: Circle = { ...circleB, center: previousB }

          const sweep = sweepCircleCollision(sweepCircleA, a.velocity, sweepCircleB, b.velocity, deltaTimeSeconds)
          if (!sweep.colliding) continue

          const velocityABeforeBounce = a.velocity
          const velocityBBeforeBounce = b.velocity
          const bounce = bounceCircles(sweepCircleA, velocityABeforeBounce, sweepCircleB, velocityBBeforeBounce)

          // Stop each non-frozen player at the moment of impact — along
          // the path it actually travelled this tick — rather than
          // leaving it at the already-advanced position that tunnelled
          // past the other circle; the remainder of this tick's travel
          // resumes next tick under the new, bounced velocity instead.
          if (!isFrozen(a)) {
            a.position = add(previousA, scale(velocityABeforeBounce, sweep.timeOfImpact))
            a.velocity = bounce.velocityA
          }
          if (!isFrozen(b)) {
            b.position = add(previousB, scale(velocityBBeforeBounce, sweep.timeOfImpact))
            b.velocity = bounce.velocityB
          }
        }
      }

      // Step 3: Resolve Weapon Collisions (weapon <-> weapon) — a
      // currently-frozen player is excluded from this collision entirely
      // (see WeaponClash.md, Weapon Collision), unlike Step 2's
      // player-body collision above.
      //
      // Detection is sub-stepped across this tick's motion (position AND
      // weapon angle, both interpolated between their pre-Step-1c and
      // current values) rather than checked only once at the end of the
      // tick — a plain single end-of-tick check can miss two fast-moving,
      // fast-rotating segments that crossed paths *between* ticks
      // ("tunnelling"; see WeaponClash.md, Weapon Collision — "Weapons
      // never tunnel"). This is an approximation, not a true continuous
      // (closed-form) solution — two independently rotating *and*
      // translating segments have no simple closed-form time-of-impact
      // the way two circles moving at constant velocity do (see Physics.ts,
      // sweepCircleCollision, which Step 2 above uses for exactly that
      // reason) — but sampling several sub-steps meaningfully reduces the
      // chance of a miss without that added complexity, matching
      // docs/CLAUDE.md's "never overengineer."
      //
      // A "must fully leave" cooldown (`activeWeaponCollisionIds`,
      // mirroring `activeWeaponHitIds`'s identical pattern for Weapon
      // Hit) prevents the bounce+reversal response from re-triggering on
      // every single tick two weapons remain in continuous contact —
      // without it, a pair whose overlap persists for several ticks would
      // otherwise flip `rotationSpeed`'s sign back and forth every tick
      // ("sticking").
      for (let i = 0; i < state.players.length; i++) {
        const a = state.players[i]
        if (a.eliminated || isFrozen(a)) continue

        for (let j = i + 1; j < state.players.length; j++) {
          const b = state.players[j]
          if (b.eliminated || isFrozen(b)) continue

          const previousPositionA = previousPositions.get(a.id)!
          const previousPositionB = previousPositions.get(b.id)!
          const previousAngleA = previousWeaponAngles.get(a.id)!
          const previousAngleB = previousWeaponAngles.get(b.id)!

          let intersecting = false
          for (let step = 0; step <= WEAPON_COLLISION_SUBSTEPS && !intersecting; step++) {
            const t = step / WEAPON_COLLISION_SUBSTEPS
            const sampledPositionA = lerpVector2(previousPositionA, a.position, t)
            const sampledPositionB = lerpVector2(previousPositionB, b.position, t)
            const sampledAngleA = previousAngleA + (a.weaponAngle - previousAngleA) * t
            const sampledAngleB = previousAngleB + (b.weaponAngle - previousAngleB) * t

            const sampledSegmentA = getWeaponSegment(sampledPositionA, playerRadius, weaponLength, sampledAngleA)
            const sampledSegmentB = getWeaponSegment(sampledPositionB, playerRadius, weaponLength, sampledAngleB)

            if (segmentSegmentIntersect(sampledSegmentA, sampledSegmentB).intersecting) {
              intersecting = true
            }
          }

          if (!intersecting) {
            a.activeWeaponCollisionIds.delete(b.id)
            b.activeWeaponCollisionIds.delete(a.id)
            continue
          }

          if (a.activeWeaponCollisionIds.has(b.id)) {
            continue // still in the same contact episode — cooldown, see comment above
          }

          a.activeWeaponCollisionIds.add(b.id)
          b.activeWeaponCollisionIds.add(a.id)

          // "Bounce players apart" — the same player<->player Bounce
          // response Step 2 uses, triggered by weapon overlap instead of
          // player-body overlap (see WeaponClash.md, Weapon Collision).
          // Neither player is frozen here (both checks above already
          // excluded that), so a plain mass-1 Circle is enough.
          const circleA: Circle = { center: a.position, radius: playerRadius }
          const circleB: Circle = { center: b.position, radius: playerRadius }
          const bounce = bounceCircles(circleA, a.velocity, circleB, b.velocity)
          a.velocity = bounce.velocityA
          b.velocity = bounce.velocityB

          // "Reverse both weapon rotation directions."
          a.rotationSpeed = -a.rotationSpeed
          b.rotationSpeed = -b.rotationSpeed
        }
      }

      // Step 4: re-normalize every non-frozen, non-eliminated player's
      // velocity back to the constant configured movement speed (see
      // docs/WeaponClash.md, Movement Speed and Simulation Loop).
      enforceConstantMovementSpeed(state, movementSpeed)

      // Step 5: Resolve Weapon Hits — fixed player order for
      // determinism. A frozen player (already frozen, or freshly frozen
      // by a hit earlier in this very pass) is excluded entirely, as
      // either attacker or victim (see WeaponClash.md, Weapon Hit and
      // Hit Freeze — "including later in the same tick the freeze was
      // triggered").
      for (const attacker of state.players) {
        if (attacker.eliminated || isFrozen(attacker)) continue

        const weaponSegment = getWeaponSegment(attacker.position, playerRadius, weaponLength, attacker.weaponAngle)

        for (const victim of state.players) {
          if (isFrozen(attacker)) break // attacker just froze from an earlier hit in this same pass
          if (victim.eliminated || victim.id === attacker.id) continue
          if (isFrozen(victim)) continue

          const victimCircle: Circle = { center: victim.position, radius: playerRadius }
          const isTouching = segmentCircleIntersect(weaponSegment, victimCircle)

          if (isTouching) {
            if (!attacker.activeWeaponHitIds.has(victim.id)) {
              victim.hp -= attacker.damage
              attacker.activeWeaponHitIds.add(victim.id)

              // Hit Freeze: both attacker and victim freeze immediately
              // (see WeaponClash.md, Hit Freeze). The damage flash
              // duration mirrors this exactly — see
              // mapWeaponClashStateToRenderables below, which derives
              // `isFlashing` directly from `freezeRemainingMs > 0`.
              attacker.freezeRemainingMs = hitFreezeDurationMs
              victim.freezeRemainingMs = hitFreezeDurationMs
            }
          } else {
            attacker.activeWeaponHitIds.delete(victim.id)
          }
        }
      }

      // Steps 6-7: elimination (see WeaponClash.md, Elimination — "Character disappears. No longer collides.").
      for (const player of state.players) {
        if (!player.eliminated && player.hp <= 0) {
          player.eliminated = true
        }
      }

      return state
    },

    isComplete(state: WeaponClashState): boolean {
      const remaining = state.players.filter((p) => !p.eliminated)
      return remaining.length <= 1
    },
  }
}

/**
 * Computes live per-player statistics (see WeaponClash.md, Statistics).
 * Ranking ("Sorted by Highest HP" in that same section) is a sort over
 * these stats, handled by engine/statistics/Ranking.ts's descendingBy()
 * — this function only supplies the numbers to rank, mirroring
 * ColorExpansion's own computeColorExpansionStats.
 */
export function computeWeaponClashStats(state: WeaponClashState): Record<string, WeaponClashStats> {
  const stats: Record<string, WeaponClashStats> = {}

  for (const player of state.players) {
    stats[player.id] = {
      hp: player.hp,
      damage: player.damage,
      rotationSpeed: player.rotationSpeed,
      eliminated: player.eliminated,
    }
  }

  return stats
}

/**
 * Maps a WeaponClashState into the generic renderable shapes
 * engine/rendering/Renderer.ts's renderCircleFrame draws (see
 * Architecture.md, Rendering — "Engine renders. Simulation only supplies
 * state."). Eliminated players are omitted entirely from both lists,
 * matching WeaponClash.md's Elimination section literally ("Character
 * disappears").
 *
 * `isFlashing` is set directly from `isFrozen(player)`, so a player's
 * Hit Freeze damage flash always starts and ends on exactly the same
 * tick as its freeze (see WeaponClash.md, Hit Freeze — "Both flash
 * white... for the freeze duration").
 */
export function mapWeaponClashStateToRenderables(state: WeaponClashState): {
  characters: RenderableCharacter[]
  weapons: RenderableWeapon[]
} {
  const playerRadius = WEAPON_CLASH_CONFIG.get('playerRadius')
  const weaponLength = WEAPON_CLASH_CONFIG.get('weaponLength')

  const active = state.players.filter((player) => !player.eliminated)

  const characters: RenderableCharacter[] = active.map((player) => ({
    character: player.character,
    x: player.position.x,
    y: player.position.y,
    isFlashing: isFrozen(player),
  }))

  const weapons: RenderableWeapon[] = active.map((player) => {
    const segment = getWeaponSegment(player.position, playerRadius, weaponLength, player.weaponAngle)
    return {
      color: player.character.color,
      start: segment.start,
      end: segment.end,
    }
  })

  return { characters, weapons }
}
