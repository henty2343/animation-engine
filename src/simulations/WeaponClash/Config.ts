import { Config } from '../../shared/Config'

/**
 * Weapon Clash's tuning values (see docs/WeaponClash.md and docs/Todo.md,
 * Balance — Weapon Clash).
 *
 * `startingHp` and `baseDamage` are NOT unreviewed placeholders — they
 * are literal values WeaponClash.md itself states ("100 HP", "Damage =
 * 1"), implemented exactly as specified rather than guessed (see
 * docs/CLAUDE.md, "If Requirements Are Missing" — there is nothing
 * missing for these two).
 *
 * `playerRadius`, `rotationSpeedRadiansPerSecond`, `weaponLength`, and
 * `movementSpeedPixelsPerSecond` ARE genuine, unreviewed placeholders —
 * the same status `gridSize`/`movementSpeedCellsPerSecond` carried for
 * Color Expansion since its own Phase 6 (see Todo.md, Balance, which
 * already listed "Base rotation speed" and "Weapon lengths" as undecided
 * before Phase 8). They exist only so the simulation has a complete,
 * runnable build instead of blocking on numbers nobody has chosen yet
 * (see Roadmap.md, Phase 6's own precedent: "Do not spend time trying to
 * perfectly balance the simulation before it exists"). All four are
 * expected to change once the project owner plays/watches a real run.
 *
 * Every file in this simulation reads these values through the exported
 * Config instance below, never as inline numbers (see shared/Config.ts,
 * and Architecture.md, Configuration: "The engine never defines
 * simulation settings").
 */
export interface WeaponClashConfigShape {
  /** Starting (and maximum) HP for every player. See WeaponClash.md, Players — "100 HP". Not a placeholder. */
  startingHp: number

  /** Damage dealt per weapon hit before any Character Skill modifies it. See WeaponClash.md, Damage — "Default: Damage = 1". Not a placeholder. */
  baseDamage: number

  /**
   * Radius of every player's circle, in pixels (see WeaponClash.md,
   * Players — "Same size for every player"). A genuine placeholder — no
   * specific number is given anywhere in the docs.
   */
  playerRadius: number

  /**
   * Default weapon rotation speed, in radians per second, before any
   * Character Skill modifies it (see WeaponClash.md, Weapon Rotation —
   * "Default: Same rotation speed for everyone"). A genuine placeholder
   * — see Todo.md, Balance — "Base rotation speed".
   */
  rotationSpeedRadiansPerSecond: number

  /**
   * Length of every player's weapon, in pixels, measured from the
   * player's edge outward (see WeaponClash.md, Weapons — "Attached to
   * player edge... Same length"). A genuine placeholder — see Todo.md,
   * Balance — "Weapon lengths".
   */
  weaponLength: number

  /**
   * Every player's constant movement speed, in pixels per second (see
   * WeaponClash.md, Movement Speed). Used both to draw each player's
   * initial velocity magnitude at spawn (see Spawn — "equal random
   * velocity"; direction alone is randomized) and, every tick
   * thereafter, as the exact speed every living player's velocity is
   * re-normalized back to once that tick's physics has resolved (see
   * WeaponClash.ts's `enforceConstantMovementSpeed`) — so speed can
   * never permanently drift up or down from collisions; only direction
   * changes.
   *
   * Renamed from `spawnVelocityMagnitude`: the value's role expanded
   * from "spawn-time-only initial magnitude" to "the constant speed
   * enforced for the whole run," so the old name no longer described
   * what it does (see docs/CLAUDE.md, Code Style — "Use descriptive
   * names"). No numeric value changed, only the name — and the new name
   * mirrors Color Expansion's own `movementSpeedCellsPerSecond` in
   * ColorExpansion/Config.ts, the same naming pattern for the same kind
   * of value. A genuine placeholder — see Todo.md, Balance — "Movement
   * speed".
   */
  movementSpeedPixelsPerSecond: number
}

const PLACEHOLDER_DEFAULTS: WeaponClashConfigShape = {
  startingHp: 100,
  baseDamage: 1,
  playerRadius: 18,
  rotationSpeedRadiansPerSecond: 6,
  weaponLength: 100,
  movementSpeedPixelsPerSecond: 180,
}

export const WEAPON_CLASH_CONFIG = new Config<WeaponClashConfigShape>(PLACEHOLDER_DEFAULTS)
