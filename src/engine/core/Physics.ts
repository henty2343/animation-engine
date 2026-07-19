import type { Vector2 } from '../../types/Vector2'
import { add, subtract, scale, length, dot } from '../../shared/Vector2'
import { clamp } from '../../shared/Math'

/**
 * Genuinely simulation-agnostic geometry and collision primitives (see
 * Architecture.md, Physics; Progress.md, "Pre-Phase 8 — Physics Primitive
 * Architecture"). This file must never know what a Player, Weapon, Enemy,
 * or Projectile is — not even indirectly, by importing a type from
 * `/src/types` beyond `Vector2` itself, or from any simulation's own
 * folder. Every function here is pure: it takes primitives in and
 * returns primitives out. A simulation (Weapon Clash, as of Phase 8)
 * converts its own state into `Circle`/`Segment` values, calls a
 * function below, reads the result, and decides what it means (damage,
 * elimination, etc.) — this file never makes any of those decisions.
 *
 * **Phase 8 scope** (see Roadmap.md, Phase 8 vs Phase 9 — "Weapon
 * Physics Polish"): this file implements exactly what Phase 8's item
 * list needs — Circle, Segment, circle×circle Collision, segment×circle
 * Collision, Bounce, and Reflection. Two primitives from the originally
 * agreed vocabulary are deliberately NOT yet implemented, because they
 * belong to Phase 9 by Roadmap.md's own item list, not Phase 8:
 *
 * - `segment×segment` Collision (weapon↔weapon detection) — Phase 9
 *   names this directly as "Weapon bounce".
 * - Sweep Test (continuous collision detection) — Phase 9 names this
 *   directly as "No tunnelling".
 *
 * See docs/Progress.md, "Phase 8 — Weapon Clash MVP" for the full
 * account of this scope decision.
 */

/**
 * A circle: center + radius, with an optional mass (defaulting to 1).
 * WeaponClash.md only specifies every player is the same size, not
 * necessarily the same mass, but a correct elastic-collision Bounce
 * formula naturally takes mass as a parameter — a future, effectively
 * infinite mass is expected to represent a frozen player once Hit Freeze
 * is implemented in Phase 9 (see WeaponClash.md, Hit Freeze), so the
 * parameter is included now rather than bolted on later.
 */
export interface Circle {
  center: Vector2
  radius: number
  /** Defaults to 1 if omitted — see functions below. */
  mass?: number
}

/** A line segment between two endpoints — used for Weapon Clash's rotating weapon (see WeaponClash.md, Weapons). */
export interface Segment {
  start: Vector2
  end: Vector2
}

function massOf(circle: Circle): number {
  return circle.mass ?? 1
}

/** Result of a circle×circle collision test (see circleCircleCollision below). */
export interface CircleCollisionInfo {
  colliding: boolean
  /** Unit vector pointing from `a`'s center toward `b`'s center. Arbitrary (but well-defined) if the two centers exactly coincide. */
  normal: Vector2
  /** How far the two circles overlap along `normal`. Zero or negative when not colliding. */
  overlap: number
}

/**
 * Detects whether two circles overlap — detection only, no response
 * computed (see Architecture.md, Physics — "Collision — detection only,
 * no response"). Used for Weapon Clash's player↔player collision check
 * (see WeaponClash.md, Player Collision), ahead of a separate call to
 * `bounceCircles` to compute the response.
 */
export function circleCircleCollision(a: Circle, b: Circle): CircleCollisionInfo {
  const delta = subtract(b.center, a.center)
  const dist = length(delta)
  const combinedRadius = a.radius + b.radius
  const overlap = combinedRadius - dist
  const normal = dist === 0 ? { x: 1, y: 0 } : scale(delta, 1 / dist)

  return { colliding: overlap > 0, normal, overlap }
}

/**
 * Detects whether a segment intersects a circle — detection only (see
 * Architecture.md, Physics). This is Weapon Clash's actual weapon-hit
 * test (see WeaponClash.md, Weapon Hit): the weapon's Segment against a
 * potential victim's Circle. Finds the closest point on the segment to
 * the circle's center and checks whether that point lies within the
 * circle's radius.
 */
export function segmentCircleIntersect(segment: Segment, circle: Circle): boolean {
  const segmentVector = subtract(segment.end, segment.start)
  const segmentLengthSquared = dot(segmentVector, segmentVector)

  const t =
    segmentLengthSquared === 0
      ? 0
      : clamp(dot(subtract(circle.center, segment.start), segmentVector) / segmentLengthSquared, 0, 1)

  const closestPoint = add(segment.start, scale(segmentVector, t))
  return length(subtract(circle.center, closestPoint)) <= circle.radius
}

/** The result of a wall Reflection (see reflectOffWall below). */
export interface WallReflectionResult {
  position: Vector2
  velocity: Vector2
}

/**
 * Dynamic-static collision response: reflects a moving circle off the
 * inside of a square arena of side `arenaSize` (spanning (0,0) to
 * (arenaSize, arenaSize) — see Engine.md, Arena; WeaponClash.md, Arena —
 * "Solid boundaries. Players cannot leave the arena"). Corrects the
 * circle's position back inside the boundary and reverses whichever
 * velocity component(s) would otherwise carry it further outside. Each
 * axis is handled independently, which is exact for an axis-aligned
 * square arena (no special-casing needed for corners beyond both axes
 * resolving on the same call).
 */
export function reflectOffWall(
  position: Vector2,
  velocity: Vector2,
  radius: number,
  arenaSize: number,
): WallReflectionResult {
  let x = position.x
  let y = position.y
  let vx = velocity.x
  let vy = velocity.y

  if (x - radius < 0) {
    x = radius
    vx = Math.abs(vx)
  } else if (x + radius > arenaSize) {
    x = arenaSize - radius
    vx = -Math.abs(vx)
  }

  if (y - radius < 0) {
    y = radius
    vy = Math.abs(vy)
  } else if (y + radius > arenaSize) {
    y = arenaSize - radius
    vy = -Math.abs(vy)
  }

  return { position: { x, y }, velocity: { x: vx, y: vy } }
}

/** The result of a Bounce (see bounceCircles below). */
export interface BounceResult {
  velocityA: Vector2
  velocityB: Vector2
}

/**
 * Dynamic-dynamic collision response: exchanges velocity between two
 * colliding circles as a standard mass-weighted elastic collision,
 * resolved along the line connecting their centers (the tangential
 * velocity component, perpendicular to that line, is left unchanged for
 * each circle). Used for Weapon Clash's player↔player collision (see
 * WeaponClash.md, Player Collision — "Bounce").
 *
 * Respects each Circle's `mass` (defaulting to 1). This is what will let
 * Phase 9's Hit Freeze give a frozen player an effectively infinite mass
 * and get a correct "static obstacle" result for free — as mass A grows
 * very large relative to mass B, A's post-collision velocity approaches
 * its pre-collision velocity (unchanged) and B's approaches a full
 * reflection off a static object — without this function needing to
 * know anything about "frozen" at all.
 */
export function bounceCircles(
  a: Circle,
  velocityA: Vector2,
  b: Circle,
  velocityB: Vector2,
): BounceResult {
  const massA = massOf(a)
  const massB = massOf(b)
  const totalMass = massA + massB

  const delta = subtract(b.center, a.center)
  const dist = length(delta)
  const normal = dist === 0 ? { x: 1, y: 0 } : scale(delta, 1 / dist)

  const aNormalSpeed = dot(velocityA, normal)
  const bNormalSpeed = dot(velocityB, normal)

  const aTangentVelocity = subtract(velocityA, scale(normal, aNormalSpeed))
  const bTangentVelocity = subtract(velocityB, scale(normal, bNormalSpeed))

  const aNormalSpeedAfter = ((massA - massB) * aNormalSpeed + 2 * massB * bNormalSpeed) / totalMass
  const bNormalSpeedAfter = ((massB - massA) * bNormalSpeed + 2 * massA * aNormalSpeed) / totalMass

  return {
    velocityA: add(aTangentVelocity, scale(normal, aNormalSpeedAfter)),
    velocityB: add(bTangentVelocity, scale(normal, bNormalSpeedAfter)),
  }
}
