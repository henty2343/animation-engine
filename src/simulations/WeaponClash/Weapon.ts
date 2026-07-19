import type { Vector2 } from '../../types/Vector2'
import type { Segment } from '../../engine/core/Physics'
import { add, scale } from '../../shared/Vector2'

/**
 * Weapon geometry for Weapon Clash (see docs/WeaponClash.md, Weapons —
 * "Attached to player edge. Rotates around player. Player never
 * rotates."). This file only knows how to turn a player's position,
 * radius, weapon length, and current rotation angle into a `Segment`
 * (see engine/core/Physics.ts) — it holds no simulation state of its
 * own and never decides what a hit means, mirroring how
 * ColorExpansion/Grid.ts stays a pure geometry/pathfinding helper that
 * ColorExpansion.ts itself interprets.
 *
 * A weapon's own rotation *state* (current angle, rotation speed) lives
 * on `WeaponClashPlayerState` in WeaponClash.ts, not here — this file is
 * the pure "angle + player state → Segment" conversion only.
 */

/**
 * Returns the weapon's current Segment: starting at the player's edge in
 * the direction of `angleRadians`, and extending `weaponLength` further
 * outward from there (see WeaponClash.md, Weapons — "Attached to player
 * edge... rotates around player").
 */
export function getWeaponSegment(
  playerCenter: Vector2,
  playerRadius: number,
  weaponLength: number,
  angleRadians: number,
): Segment {
  const direction: Vector2 = { x: Math.cos(angleRadians), y: Math.sin(angleRadians) }

  const start = add(playerCenter, scale(direction, playerRadius))
  const end = add(playerCenter, scale(direction, playerRadius + weaponLength))

  return { start, end }
}

/**
 * Advances a weapon's rotation angle by one fixed timestep, at the given
 * angular speed (radians per second). Wrapping the angle into [0, 2π) is
 * not required for correctness (Math.cos/Math.sin handle any magnitude
 * identically), so this deliberately does not normalize it — keeping the
 * function a single, obvious line.
 */
export function advanceWeaponAngle(
  currentAngleRadians: number,
  rotationSpeedRadiansPerSecond: number,
  deltaTimeMs: number,
): number {
  return currentAngleRadians + (rotationSpeedRadiansPerSecond * deltaTimeMs) / 1000
}
