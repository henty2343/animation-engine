/**
 * A 2D vector (see Architecture.md, /src/types — "used by the engine and,
 * once Weapon Clash exists, by that simulation's own state too"). This
 * type carries no methods or logic, per this folder's own rule ("No
 * runtime logic ever lives here") — see /src/shared/Vector2.ts for the
 * pure math functions that operate on it, and engine/core/Physics.ts's
 * `Circle`/`Segment` for the shapes built from it.
 *
 * Introduced in Phase 8 (see Progress.md, Pre-Phase 8 — Physics Primitive
 * Architecture), first consumed by Weapon Clash's own player state
 * (position, velocity) and by Physics.ts's Circle/Segment primitives.
 */
export interface Vector2 {
  x: number
  y: number
}
