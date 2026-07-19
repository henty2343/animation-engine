import type { Simulation } from '../../types/Simulation'
import type { Player } from '../../types/Player'
import type { Vector2 } from '../../types/Vector2'
import { Random } from '../../shared/Random'
import { add, scale } from '../../shared/Vector2'
import { UNIVERSAL_ARENA_SIZE } from '../../shared/Constants'
import {
  circleCircleCollision,
  bounceCircles,
  reflectOffWall,
  segmentCircleIntersect,
  type Circle,
} from '../../engine/core/Physics'
import { getWeaponSegment, advanceWeaponAngle } from './Weapon'
import { WEAPON_CLASH_CONFIG } from './Config'
import type { RenderableCharacter, RenderableWeapon } from '../../engine/rendering/Renderer'

/**
 * Weapon Clash (see docs/WeaponClash.md). Phase 8 implements the MVP
 * subset of that document exactly matching Roadmap.md's own Phase 8 item
 * list: Physics, Players, Weapons, HP, Damage, Arena collisions, Weapon
 * rotation, Elimination, Win condition. Character Skills are explicitly
 * out of scope (Roadmap.md, Phase 8 — "Ignore Character Skills"), as are
 * every item Roadmap.md names under Phase 9 ("Weapon Physics Polish"):
 * weapon↔weapon collision/rotation-reversal, Hit Freeze, Sweep-Test
 * anti-tunnelling, and damage flash. See docs/WeaponClash.md's own
 * "Phase 8 scope" note (Simulation Loop section) and docs/Progress.md,
 * "Phase 8 — Weapon Clash MVP" for the full account of this scope line.
 *
 * A Weapon Clash player is the shared Player type (id, slot, character —
 * see types/Player.ts) plus the physics/combat state only this
 * simulation needs (see Architecture.md's one-canonical-location rule).
 */
export interface WeaponClashPlayerState extends Player {
  position: Vector2
  velocity: Vector2

  hp: number
  /** Damage dealt per successful hit. Constant in Phase 8 (no Skills yet — see Characters.md, Heavy: "Damage +1" per hit, arriving in Phase 10). */
  damage: number
  /** Radians per second. Constant in Phase 8 (no Skills yet — see Characters.md, Swift). */
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
 * Builds a Weapon Clash Simulation<WeaponClashState> for a fixed roster
 * of 2–4 players (see Engine.md, Menu).
 */
export function createWeaponClashSimulation(players: Player[]): Simulation<WeaponClashState> {
  return {
    createInitialState(seed: number): WeaponClashState {
      const random = new Random(seed)

      const playerRadius = WEAPON_CLASH_CONFIG.get('playerRadius')
      const spawnVelocityMagnitude = WEAPON_CLASH_CONFIG.get('spawnVelocityMagnitude')
      const startingHp = WEAPON_CLASH_CONFIG.get('startingHp')
      const baseDamage = WEAPON_CLASH_CONFIG.get('baseDamage')
      const rotationSpeed = WEAPON_CLASH_CONFIG.get('rotationSpeedRadiansPerSecond')

      const placedCircles: Circle[] = []

      const playerStates: WeaponClashPlayerState[] = players.map((player) => {
        const position = drawSpawnPosition(random, playerRadius, UNIVERSAL_ARENA_SIZE, placedCircles)
        placedCircles.push({ center: position, radius: playerRadius })

        // Equal magnitude, random direction (see WeaponClash.md, Spawn).
        const angle = random.nextFloat(0, Math.PI * 2)
        const velocity = scale({ x: Math.cos(angle), y: Math.sin(angle) }, spawnVelocityMagnitude)

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
        }
      })

      return { players: playerStates, random }
    },

    update(state: WeaponClashState, deltaTimeMs: number): WeaponClashState {
      const playerRadius = WEAPON_CLASH_CONFIG.get('playerRadius')
      const weaponLength = WEAPON_CLASH_CONFIG.get('weaponLength')

      // Step 1: weapon rotation + movement/wall collision (non-eliminated players only).
      for (const player of state.players) {
        if (player.eliminated) continue

        player.weaponAngle = advanceWeaponAngle(player.weaponAngle, player.rotationSpeed, deltaTimeMs)

        const movedPosition = add(player.position, scale(player.velocity, deltaTimeMs / 1000))
        const reflected = reflectOffWall(movedPosition, player.velocity, playerRadius, UNIVERSAL_ARENA_SIZE)
        player.position = reflected.position
        player.velocity = reflected.velocity
      }

      // Step 2: player <-> player collision (fixed pair order for determinism —
      // see ColorExpansion.ts's own fixed-slot-order precedent).
      for (let i = 0; i < state.players.length; i++) {
        const a = state.players[i]
        if (a.eliminated) continue

        for (let j = i + 1; j < state.players.length; j++) {
          const b = state.players[j]
          if (b.eliminated) continue

          const circleA: Circle = { center: a.position, radius: playerRadius }
          const circleB: Circle = { center: b.position, radius: playerRadius }

          if (circleCircleCollision(circleA, circleB).colliding) {
            const bounce = bounceCircles(circleA, a.velocity, circleB, b.velocity)
            a.velocity = bounce.velocityA
            b.velocity = bounce.velocityB
          }
        }
      }

      // Step 3: weapon hits (fixed attacker/victim order for determinism).
      // Weapon <-> Weapon collision and Hit Freeze are Phase 9 — see this
      // file's own doc comment above.
      for (const attacker of state.players) {
        if (attacker.eliminated) continue

        const weaponSegment = getWeaponSegment(attacker.position, playerRadius, weaponLength, attacker.weaponAngle)

        for (const victim of state.players) {
          if (victim.eliminated || victim.id === attacker.id) continue

          const victimCircle: Circle = { center: victim.position, radius: playerRadius }
          const isTouching = segmentCircleIntersect(weaponSegment, victimCircle)

          if (isTouching) {
            if (!attacker.activeWeaponHitIds.has(victim.id)) {
              victim.hp -= attacker.damage
              attacker.activeWeaponHitIds.add(victim.id)
            }
          } else {
            attacker.activeWeaponHitIds.delete(victim.id)
          }
        }
      }

      // Steps 5-6: elimination (see WeaponClash.md, Elimination — "Character disappears. No longer collides.").
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
 * disappears") — unlike Color Expansion, where a player's claimed
 * territory must remain visible after elimination, Weapon Clash has no
 * owned-territory concept to preserve.
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
