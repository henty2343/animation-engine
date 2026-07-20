import type { Vector2 } from '../../types/Vector2'
import { add, subtract, scale, length, dot, cross } from '../../shared/Vector2'
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
 * **Phase 9** (see Roadmap.md, Phase 9 — "Weapon Physics Polish";
 * Progress.md's "Phase 9 — Weapon Physics Polish" for the full account)
 * completed this file's primitive set: `sweepCircleCollision` (continuous
 * circle×circle collision, for anti-tunnelling), `correctCircleOverlap`
 * (positional overlap-separation response — a new category beyond the
 * original Pre-Phase 8 vocabulary, added because none of
 * Collision/Bounce/Reflection/Sweep Test computes a *positional*
 * response), and `segmentSegmentIntersect` (discrete segment×segment
 * collision, the weapon↔weapon hit test).
 */

/**
 * A circle: center + radius, with an optional mass (defaulting to 1).
 * WeaponClash.md only specifies every player is the same size, not
 * necessarily the same mass, but a correct elastic-collision Bounce
 * formula naturally takes mass as a parameter — a frozen player is given
 * an effectively infinite mass to represent it as a static, unmovable
 * obstacle (see WeaponClash.md, Hit Freeze, and WeaponClash.ts's
 * `STATIC_OBSTACLE_MASS`, implemented in Phase 9).
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
 * WeaponClash.md, Player Collision — "Bounce") and, as of Phase 9,
 * weapon↔weapon collision (see WeaponClash.md, Weapon Collision —
 * "Bounce players apart").
 *
 * Respects each Circle's `mass` (defaulting to 1). As of Phase 9, this
 * is exercised for real: a frozen player's Circle is given an
 * effectively infinite mass (see WeaponClash.ts's `STATIC_OBSTACLE_MASS`)
 * so that, as mass A grows very large relative to mass B, A's
 * post-collision velocity approaches its pre-collision velocity
 * (unchanged) and B's approaches a full reflection off a static object —
 * without this function needing to know anything about "frozen" at all.
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

/** Result of a continuous (swept) circle-circle collision test (see sweepCircleCollision below). */
export interface SweepCollisionResult {
  colliding: boolean
  /**
   * Time within `[0, deltaTime]` at which the two circles first touch,
   * assuming each moves at its given constant velocity for the whole
   * interval. Meaningless when `colliding` is false.
   */
  timeOfImpact: number
  /**
   * Unit vector from `a`'s center toward `b`'s center at the moment of
   * impact. Meaningless when `colliding` is false.
   */
  normal: Vector2
}

/**
 * Continuous collision detection between two moving circles over a time
 * interval `deltaTime` (see Architecture.md, Physics — "Sweep Test —
 * continuous collision detection, needed to prevent tunnelling at high
 * velocity"; Roadmap.md, Phase 9 — "No tunnelling"). Detection only, no
 * response computed — the same division of labor as
 * `circleCircleCollision` above (a caller runs `bounceCircles`
 * separately once it knows a collision occurred).
 *
 * `circleCircleCollision` only samples the two circles' positions at a
 * single instant; a fast-enough pair can pass through each other
 * entirely within one tick and never appear to overlap at either the
 * start or end of that tick's motion ("tunnelling"). This function
 * instead solves for the earliest time both circles' positions —
 * advanced along their given constant velocities — bring their centers
 * exactly `a.radius + b.radius` apart, by treating the problem in `b`'s
 * frame relative to `a` (relative position `p = b.center - a.center`,
 * relative velocity `v = velocityB - velocityA`) and solving the
 * resulting quadratic `|p + v*t|^2 = (a.radius + b.radius)^2` for the
 * smallest non-negative root.
 *
 * Callers are expected to only invoke this once `circleCircleCollision`
 * on the same pair's *current* positions has already reported no
 * overlap — this function does not itself special-case an
 * already-overlapping pair at `t = 0` (see WeaponClash.ts's own call
 * site, which runs the discrete check first and only falls through to
 * this one when it comes back clean).
 */
export function sweepCircleCollision(
  a: Circle,
  velocityA: Vector2,
  b: Circle,
  velocityB: Vector2,
  deltaTime: number,
): SweepCollisionResult {
  const noCollision: SweepCollisionResult = {
    colliding: false,
    timeOfImpact: 0,
    normal: { x: 1, y: 0 },
  }

  const relativePosition = subtract(b.center, a.center)
  const relativeVelocity = subtract(velocityB, velocityA)
  const combinedRadius = a.radius + b.radius

  const velocitySquared = dot(relativeVelocity, relativeVelocity)
  if (velocitySquared === 0) {
    return noCollision // no relative motion — never converges within any finite interval
  }

  // Solve |relativePosition + relativeVelocity * t|^2 = combinedRadius^2,
  // i.e. velocitySquared*t^2 + 2*(relativePosition . relativeVelocity)*t
  // + (|relativePosition|^2 - combinedRadius^2) = 0.
  const linearTerm = 2 * dot(relativePosition, relativeVelocity)
  const constantTerm = dot(relativePosition, relativePosition) - combinedRadius * combinedRadius
  const discriminant = linearTerm * linearTerm - 4 * velocitySquared * constantTerm

  if (discriminant < 0) {
    return noCollision // paths never come within combinedRadius of each other
  }

  const sqrtDiscriminant = Math.sqrt(discriminant)
  const earliestRoot = (-linearTerm - sqrtDiscriminant) / (2 * velocitySquared)
  const latestRoot = (-linearTerm + sqrtDiscriminant) / (2 * velocitySquared)

  // The smaller root is when the circles first touch (entering contact);
  // a negative value means that moment is already in the past relative
  // to this interval's start, which callers handle themselves (see this
  // function's own doc comment on when to call it).
  const timeOfImpact = Math.min(earliestRoot, latestRoot)

  if (timeOfImpact < 0 || timeOfImpact > deltaTime) {
    return noCollision
  }

  const positionAAtImpact = add(a.center, scale(velocityA, timeOfImpact))
  const positionBAtImpact = add(b.center, scale(velocityB, timeOfImpact))
  const deltaAtImpact = subtract(positionBAtImpact, positionAAtImpact)
  const distanceAtImpact = length(deltaAtImpact)
  const normal = distanceAtImpact === 0 ? { x: 1, y: 0 } : scale(deltaAtImpact, 1 / distanceAtImpact)

  return { colliding: true, timeOfImpact, normal }
}

/** Result of a circle-circle overlap correction (see correctCircleOverlap below). */
export interface OverlapCorrection {
  /** Position offset to add to `a`'s center to help resolve the overlap. */
  correctionA: Vector2
  /** Position offset to add to `b`'s center to help resolve the overlap. */
  correctionB: Vector2
}

/**
 * Computes the position offsets needed to separate two overlapping
 * circles along their contact normal (see Architecture.md, Physics, and
 * Roadmap.md's Phase 9 "No player overlap" / "No weapon overlap" items).
 * `bounceCircles` above only changes velocity — an ordinary discrete-time
 * collision response like that can still leave two circles visually
 * interpenetrating for a tick or two if they were already overlapping at
 * the moment the bounce was computed (see `circleCircleCollision`'s own
 * `overlap` field). This function computes a purely positional
 * correction to go alongside that velocity response.
 *
 * This is a new primitive category, added in Phase 9, beyond the
 * original Pre-Phase 8 vocabulary (Collision/Bounce/Reflection/Sweep
 * Test/Intersection) — see Progress.md's "Phase 9 — Weapon Physics
 * Polish" for why none of those five categories already covers a
 * positional response.
 *
 * The correction is split between the two circles in proportion to the
 * *other* circle's mass (mirroring `bounceCircles`' own mass-weighting),
 * so a much heavier — or, once Hit Freeze assigns a frozen player an
 * effectively infinite mass (see WeaponClash.ts), an immovable — circle
 * is corrected by a negligible amount while the lighter one absorbs
 * nearly all of the separation. Returns a zero offset for both circles
 * if they aren't actually overlapping.
 */
export function correctCircleOverlap(a: Circle, b: Circle): OverlapCorrection {
  const info = circleCircleCollision(a, b)

  if (!info.colliding) {
    return { correctionA: { x: 0, y: 0 }, correctionB: { x: 0, y: 0 } }
  }

  const massA = massOf(a)
  const massB = massOf(b)
  const totalMass = massA + massB

  const shareOfOverlapForA = massB / totalMass
  const shareOfOverlapForB = massA / totalMass

  return {
    correctionA: scale(info.normal, -info.overlap * shareOfOverlapForA),
    correctionB: scale(info.normal, info.overlap * shareOfOverlapForB),
  }
}

/** Result of a segment-segment intersection test (see segmentSegmentIntersect below). */
export interface SegmentIntersectionResult {
  intersecting: boolean
  /** Where the two segments cross. Meaningless when `intersecting` is false. */
  point: Vector2
}

/**
 * Detects whether two line segments intersect — detection only, no
 * response computed (see Architecture.md, Physics — "Collision —
 * detection only, no response: circle×circle, segment×circle,
 * segment×segment"). This is Weapon Clash's weapon↔weapon hit test (see
 * WeaponClash.md, Weapon Collision): each player's rotating weapon
 * Segment against every other player's.
 *
 * Standard parametric line-segment intersection: segment `a` is
 * `a.start + t*(a.end - a.start)` for `t` in [0,1], segment `b` is
 * `b.start + u*(b.end - b.start)` for `u` in [0,1]; solving for where
 * they coincide reduces to a system solved entirely with the 2D scalar
 * cross product (see shared/Vector2.ts's `cross`). Parallel segments
 * (including the collinear-overlap case) are reported as not
 * intersecting — two rotating, finite-length weapons happening to be
 * exactly parallel at the instant of a discrete per-tick check is a
 * measure-zero case not worth a dedicated collinear-overlap branch for
 * this project's needs (see Progress.md's Phase 9 judgment calls, and
 * WeaponClash.md's Weapon Collision section, for why no continuous/swept
 * version of this test was implemented either).
 */
export function segmentSegmentIntersect(a: Segment, b: Segment): SegmentIntersectionResult {
  const noIntersection: SegmentIntersectionResult = { intersecting: false, point: { x: 0, y: 0 } }

  const r = subtract(a.end, a.start)
  const s = subtract(b.end, b.start)
  const rCrossS = cross(r, s)

  if (rCrossS === 0) {
    return noIntersection // parallel (or collinear) — see doc comment above
  }

  const startDelta = subtract(b.start, a.start)
  const t = cross(startDelta, s) / rCrossS
  const u = cross(startDelta, r) / rCrossS

  if (t < 0 || t > 1 || u < 0 || u > 1) {
    return noIntersection
  }

  return { intersecting: true, point: add(a.start, scale(r, t)) }
}
