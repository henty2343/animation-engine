import { Config } from '../../shared/Config'

/**
 * Weapon Clash's tuning values (see docs/WeaponClash.md and docs/Todo.md,
 * Balance — Weapon Clash).
 *
 * `startingHp`, `baseDamage`, and (as of Phase 9) `hitFreezeDurationMs`
 * are NOT unreviewed placeholders — they are literal values
 * WeaponClash.md itself states ("100 HP", "Damage = 1", "0.1 seconds"),
 * implemented exactly as specified rather than guessed (see
 * docs/CLAUDE.md, "If Requirements Are Missing" — there is nothing
 * missing for these).
 *
 * `playerRadius`, `rotationSpeedRadiansPerSecond`, `weaponLength`,
 * `movementSpeedPixelsPerSecond`, and `gravityPixelsPerSecondSquared`
 * ARE genuine, unreviewed placeholders.
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
   * Character Skill (or, as of Phase 9, Weapon Collision's rotation
   * reversal) modifies it (see WeaponClash.md, Weapon Rotation —
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
   * initial velocity magnitude at spawn and, every tick thereafter, as
   * the exact speed every living, non-frozen player's velocity is
   * re-normalized back to once that tick's physics has resolved (see
   * WeaponClash.ts's `enforceConstantMovementSpeed`). A genuine
   * placeholder — see Todo.md, Balance — "Movement speed".
   */
  movementSpeedPixelsPerSecond: number

  /**
   * Hit Freeze duration, in milliseconds (see WeaponClash.md, Hit Freeze
   * — "A very short hit-stop effect (0.1 seconds)"). Not a placeholder —
   * like `startingHp`/`baseDamage` above, this is a literal value the
   * docs themselves specify, implemented exactly as stated rather than
   * guessed. Implemented in Phase 9.
   */
  hitFreezeDurationMs: number

  /**
   * Downward gravitational acceleration, in pixels per second squared
   * (see WeaponClash.md, Gravity). A genuine, deliberately small
   * placeholder — no specific number is given anywhere in the docs,
   * only "very small... subtle." Applied to velocity direction only; it
   * never affects a player's overall speed, since Step 4 of the
   * Simulation Loop re-normalizes every non-frozen player's velocity
   * back to `movementSpeedPixelsPerSecond` every tick regardless (see
   * WeaponClash.ts's `applyGravity` and `enforceConstantMovementSpeed`).
   * Added in this session's post-Phase-9 playtesting follow-up (see
   * Progress.md).
   */
  gravityPixelsPerSecondSquared: number
}

const PLACEHOLDER_DEFAULTS: WeaponClashConfigShape = {
  startingHp: 100,
  baseDamage: 1,
  playerRadius: 18,
  rotationSpeedRadiansPerSecond: 6,
  weaponLength: 100,
  movementSpeedPixelsPerSecond: 180,
  hitFreezeDurationMs: 100,
  gravityPixelsPerSecondSquared: 25,
}

export const WEAPON_CLASH_CONFIG = new Config<WeaponClashConfigShape>(PLACEHOLDER_DEFAULTS)
