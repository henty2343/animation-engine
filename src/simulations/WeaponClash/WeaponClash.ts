import type { Simulation } from '../../types/Simulation'
import type { Player } from '../../types/Player'
import type { Vector2 } from '../../types/Vector2'
import { Random } from '../../shared/Random'
import { add, scale, normalize } from '../../shared/Vector2'
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
 * subset of that document (Physics, Players, Weapons, HP, Damage, Arena
 * collisions, Weapon rotation, Elimination, Win condition), plus a
 * Pre-Phase 9 addition (Constant Movement Speed). Phase 9 ("Weapon
 * Physics Polish" — see Roadmap.md) completes the full Simulation Loop
 * documented in WeaponClash.md: anti-tunnelling and overlap correction
 * for player↔player collision, weapon↔weapon collision (bounce + reverse
 * rotation), Hit Freeze, and the damage flash. Character Skills remain
 * out of scope (Roadmap.md, Phase 10).
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
  /** Radians per second. Modified only by Weapon Collision's rotation reversal (Phase 9) until Skills arrive in Phase 10 (see Characters.md, Swift). */
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
   * Milliseconds remaining in this player's current Hit Freeze, or `0`
   * when not frozen (see WeaponClash.md, Hit Freeze). Counts down once
   * per tick, first thing every tick (see `update()`'s Step 1a below),
   * clamped at 0 — so a freeze that expires exactly this tick already
   * lets this player act again this same tick, matching "the simulation
   * simply resumes." Set to `hitFreezeDurationMs` (see Config.ts) on
   * both attacker and victim the instant a weapon hit lands (Step 5
   * below). Introduced in Phase 9.
   */
  freezeRemainingMs: number
}

export interface WeaponClashState {
  players: WeaponClashPlayerState[]
  /** This run's seeded RNG (see shared/Random.ts) — spawn positions and initial velocity direction are its first consumers. */
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
 * direction this tick's physics left it pointing (see
 * docs/WeaponClash.md, Movement Speed). A frozen player is skipped
 * entirely (Phase 9) — its velocity must stay exactly what it was the
 * instant it froze, ready to resume unchanged once the freeze ends (see
 * Hit Freeze — "Nothing is reset or recalculated").
 *
 * Safeguard, not gameplay: under normal play this function only ever
 * rescales an existing, non-zero direction — a player's velocity should
 * never actually reach exactly {0, 0}. The `isZeroLength` branch below
 * exists purely as a defensive guard against an extremely rare
 * numerical/degenerate edge case (in principle, an exact head-on Bounce
 * with zero tangential component, which `normalize` would otherwise
 * report as a direction-less zero-length vector — see shared/Vector2.ts)
 * and is not part of the intended physics model. The fallback still
 * draws from `state.random` — the run's own seeded RNG — so even this
 * exceptional path stays fully deterministic for a given seed; it is a
 * defensive branch, not a source of nondeterminism.
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
      const rotationSpeed = WEAPON_CLASH_CONFIG.get('rotationSpeedRadiansPerSecond')

      const placedCircles: Circle[] = []

      const playerStates: WeaponClashPlayerState[] = players.map((player) => {
        const position = drawSpawnPosition(random, playerRadius, UNIVERSAL_ARENA_SIZE, placedCircles)
        placedCircles.push({ center: position, radius: playerRadius })

        // Equal magnitude, random direction (see WeaponClash.md, Spawn).
        // This is the same constant movement speed the player's velocity
        // gets re-normalized back to every tick thereafter (see
        // enforceConstantMovementSpeed below) — spawn just draws the
        // first direction, it isn't a special one-time magnitude.
        const angle = random.nextFloat(0, Math.PI * 2)
        const velocity = scale({ x: Math.cos(angle), y: Math.sin(angle) }, movementSpeed)

        return {
          ...player,
          position,
          velocity,
          hp: startingHp,
          damage: baseDamage,
          rotationSpeed,
          // WeaponClash.md doesn't specify a starting weapon angle, and
          // it has no documented gameplay effect (rotation begins
          // immediately regardless) — 0 is the simplest deterministic
          // choice. See Progress.md, Phase 8 judgment calls.
          weaponAngle: 0,
          eliminated: false,
          activeWeaponHitIds: new Set<string>(),
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

      // Captured before Step 1c moves anyone, so Step 2's sweep test
      // below has both a "before" and "after" position to check this
      // tick's travel against (see Physics.ts, sweepCircleCollision).
      const previousPositions = new Map(state.players.map((player) => [player.id, player.position]))

      // Step 1b/1c: weapon rotation + movement/wall collision —
      // non-frozen, non-eliminated players only (see WeaponClash.md,
      // Simulation Loop).
      for (const player of state.players) {
        if (player.eliminated || isFrozen(player)) continue

        player.weaponAngle = advanceWeaponAngle(player.weaponAngle, player.rotationSpeed, deltaTimeMs)

        const movedPosition = add(player.position, scale(player.velocity, deltaTimeSeconds))
        const reflected = reflectOffWall(movedPosition, player.velocity, playerRadius, UNIVERSAL_ARENA_SIZE)
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

            // Overlap correction (Phase 9): a purely positional
            // separation alongside the velocity response above, so the
            // two circles don't keep visually interpenetrating (see
            // WeaponClash.md, Player Collision — "Overlap correction").
            const correction = correctCircleOverlap(circleA, circleB)
            if (!isFrozen(a)) a.position = add(a.position, correction.correctionA)
            if (!isFrozen(b)) b.position = add(b.position, correction.correctionB)
            continue
          }

          // Anti-tunnelling (Phase 9; see Physics.ts,
          // sweepCircleCollision): the discrete check above found no
          // overlap at the *end* of this tick's motion, but a
          // fast-enough pair can still have crossed paths somewhere
          // *during* it. Check using each player's pre-Step-1c position
          // and this tick's velocity.
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
      for (let i = 0; i < state.players.length; i++) {
        const a = state.players[i]
        if (a.eliminated || isFrozen(a)) continue

        for (let j = i + 1; j < state.players.length; j++) {
          const b = state.players[j]
          if (b.eliminated || isFrozen(b)) continue

          const segmentA = getWeaponSegment(a.position, playerRadius, weaponLength, a.weaponAngle)
          const segmentB = getWeaponSegment(b.position, playerRadius, weaponLength, b.weaponAngle)

          if (!segmentSegmentIntersect(segmentA, segmentB).intersecting) continue

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
 * `isFlashing` (Phase 9) is set directly from `isFrozen(player)`, so a
 * player's Hit Freeze damage flash always starts and ends on exactly the
 * same tick as its freeze (see WeaponClash.md, Hit Freeze — "Both flash
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
