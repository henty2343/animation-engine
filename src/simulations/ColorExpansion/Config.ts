import { Config } from '../../shared/Config'

/**
 * Color Expansion's tuning values (see docs/ColorExpansion.md, Arena —
 * "Grid size: TODO" — and docs/Todo.md, Balance / Visual & Rendering).
 *
 * *** TEMPORARY PLACEHOLDER VALUES — NOT PLAYTESTED / NOT REVIEWED ***
 *
 * None of the values below have been chosen or tuned; they exist only so
 * each phase has a complete, runnable build instead of blocking on
 * numbers nobody has decided yet (see Roadmap.md, Phase 6 — "Do not
 * spend time trying to perfectly balance the simulation before it
 * exists"). All are expected to change once the project owner
 * plays/watches a real run. This same open item is tracked in
 * docs/Todo.md, which points back here.
 *
 * Every file in this simulation — gameplay (Grid.ts, ColorExpansion.ts,
 * Skills.ts) and rendering (engine/rendering/Renderer.ts's
 * renderGridFrame) alike — reads these values through the exported
 * Config instance below, never as inline numbers, so retuning any one of
 * them later never requires touching gameplay or rendering code (see
 * shared/Config.ts, and Architecture.md, Configuration: "The engine
 * never defines simulation settings").
 *
 * `gridSize` is the number of cells per side of Color Expansion's own
 * grid. This is a different concept from the shared universal Arena's
 * pixel `size` (src/types/Arena.ts, still separately undecided per
 * Engine.md's own TODO) — that's the on-screen square every simulation
 * renders inside; this is how many cells that square is divided into for
 * Color Expansion specifically.
 *
 * Phase 7 adds the six Character Skill balance values below
 * (`swiftMovementMultiplier` through `tricksterSpeedBonusMultiplier`).
 * Each one mirrors a "Not yet decided" entry already tracked in
 * Todo.md's Balance section under Color Expansion — Swift's movement
 * multiplier; Sleeper's sleep duration, rush duration, and rush
 * multiplier; Trickster's reroll interval and Speed-bonus multiplier —
 * plus the design-intent values that same section already names for
 * Sleeper (1s sleep / 3s rush) and Trickster (~5s reroll). Todo.md is
 * updated alongside this file to say so explicitly, following exactly
 * the same placeholder-now/decide-later pattern `gridSize` and
 * `movementSpeedCellsPerSecond` already established in Phase 6.
 */
export interface ColorExpansionConfigShape {
  /** Width and height of the grid, in cells. */
  gridSize: number

  /** How many grid cells a player crosses per second of simulated time. */
  movementSpeedCellsPerSecond: number

  /**
   * Player square size, as a fraction of one full grid cell (see
   * ColorExpansion.md, Players — "Represented by squares. Same size as
   * one grid cell."). Read by engine/rendering/Renderer.ts's
   * renderGridFrame, supplied by the caller (see
   * components/Arena/ColorExpansionArena.tsx) rather than hardcoded in
   * the engine.
   */
  playerSquareCellRatio: number

  /**
   * Swift's movement speed multiplier (see ColorExpansion.md, Swift —
   * "Increased movement speed"; Skills.ts's `modifySpeed` hook). Applied
   * on top of `movementSpeedCellsPerSecond`. See Todo.md, Balance —
   * "Swift movement multiplier": still undecided as a reviewed value.
   */
  swiftMovementMultiplier: number

  /**
   * Sleeper's sleep-phase duration, in milliseconds (see
   * ColorExpansion.md, Sleeper — "Sleep: 1 second"). See Todo.md,
   * Balance — "Sleeper sleep duration": design intent only, unreviewed.
   */
  sleeperSleepDurationMs: number

  /**
   * Sleeper's rush-phase duration, in milliseconds (see
   * ColorExpansion.md, Sleeper — "Rush: 3 seconds"). See Todo.md,
   * Balance — "Sleeper rush duration": design intent only, unreviewed.
   */
  sleeperRushDurationMs: number

  /**
   * Sleeper's movement speed multiplier while rushing (see
   * ColorExpansion.md, Sleeper — "Rush: Increased movement speed"). See
   * Todo.md, Balance — "Sleeper rush multiplier": not yet decided even
   * as a design intent: this file's default is this session's own
   * placeholder, flagged in Progress.md.
   */
  sleeperRushMultiplier: number

  /**
   * How often, in milliseconds, Trickster rerolls its single active
   * bonus (see ColorExpansion.md, Trickster). See Todo.md, Balance —
   * "Trickster reroll interval": design intent only ("roughly 5
   * seconds"), unreviewed.
   */
  tricksterRerollIntervalMs: number

  /**
   * Trickster's movement speed multiplier while its Speed bonus is the
   * currently active bonus (see ColorExpansion.md, Trickster). See
   * Todo.md, Balance — "Trickster speed bonus multiplier": not yet
   * decided; this file's default is this session's own placeholder,
   * flagged in Progress.md.
   */
  tricksterSpeedBonusMultiplier: number
}

const PLACEHOLDER_DEFAULTS: ColorExpansionConfigShape = {
  gridSize: 20,
  movementSpeedCellsPerSecond: 4,
  playerSquareCellRatio: 0.7,
  swiftMovementMultiplier: 1.5,
  sleeperSleepDurationMs: 1000,
  sleeperRushDurationMs: 3000,
  sleeperRushMultiplier: 2.5,
  tricksterRerollIntervalMs: 5000,
  tricksterSpeedBonusMultiplier: 1.5,
}

export const COLOR_EXPANSION_CONFIG = new Config<ColorExpansionConfigShape>(PLACEHOLDER_DEFAULTS)
