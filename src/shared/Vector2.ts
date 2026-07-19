import type { Vector2 } from '../types/Vector2'

/**
 * Pure Vector2 math functions (see Architecture.md, /src/shared — "no
 * engine-specific dependency", mirroring Math.ts's existing scalar
 * functions: clamp, lerp, distance, angleBetween). Introduced in Phase 8
 * alongside the Vector2 type itself (see Progress.md, Pre-Phase 8 —
 * Physics Primitive Architecture) — first consumed by
 * engine/core/Physics.ts and by Weapon Clash's own player state.
 *
 * Every function here is pure: it takes Vector2 values in and returns a
 * new Vector2 (or scalar) out, never mutating an argument.
 */

export function add(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x + b.x, y: a.y + b.y }
}

export function subtract(a: Vector2, b: Vector2): Vector2 {
  return { x: a.x - b.x, y: a.y - b.y }
}

export function scale(v: Vector2, scalar: number): Vector2 {
  return { x: v.x * scalar, y: v.y * scalar }
}

/** Euclidean length (magnitude) of a vector. */
export function length(v: Vector2): number {
  return Math.hypot(v.x, v.y)
}

/**
 * Returns a unit-length vector in the same direction as `v`. Returns
 * `{ x: 0, y: 0 }` for a zero-length input rather than dividing by zero
 * — callers with a genuinely zero vector (which should not occur for a
 * moving player, see WeaponClash.md, Physics — "Never stop moving")
 * get a harmless zero back instead of `NaN`.
 */
export function normalize(v: Vector2): Vector2 {
  const len = length(v)
  return len === 0 ? { x: 0, y: 0 } : scale(v, 1 / len)
}

export function dot(a: Vector2, b: Vector2): number {
  return a.x * b.x + a.y * b.y
}

/** Rotates `v` by `angleRadians` (counter-clockwise, standard screen-space convention with a flipped y-axis notwithstanding — this is a pure math rotation, not screen-aware). */
export function rotate(v: Vector2, angleRadians: number): Vector2 {
  const cos = Math.cos(angleRadians)
  const sin = Math.sin(angleRadians)
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
  }
}

/** Vector from `a` to `b` (equivalent to `subtract(b, a)`, named for readability at call sites that read as "direction to"). */
export function directionTo(a: Vector2, b: Vector2): Vector2 {
  return subtract(b, a)
}

/** Euclidean distance between two points. */
export function distanceBetween(a: Vector2, b: Vector2): number {
  return length(subtract(b, a))
}
