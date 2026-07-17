import { Config } from '../../shared/Config'

/**
 * Color Expansion's tuning values (see docs/ColorExpansion.md, Arena —
 * "Grid size: TODO" — and docs/Todo.md, Balance / Visual & Rendering).
 *
 * *** TEMPORARY PLACEHOLDER VALUES — NOT PLAYTESTED / NOT REVIEWED ***
 *
 * None of the values below have been chosen or tuned; they exist only so
 * Phase 6 has a complete, runnable MVP instead of blocking on numbers
 * nobody has decided yet (see Roadmap.md, Phase 6 — "Do not spend time
 * trying to perfectly balance the simulation before it exists"). All are
 * expected to change once the project owner plays/watches a real run.
 * This same open item is tracked in docs/Todo.md, which points back here.
 *
 * Every file in this simulation — gameplay (Grid.ts, ColorExpansion.ts)
 * and rendering (engine/rendering/Renderer.ts's renderGridFrame) alike —
 * reads these values through the exported Config instance below, never
 * as inline numbers, so retuning any one of them later never requires
 * touching gameplay or rendering code (see shared/Config.ts, and
 * Architecture.md, Configuration: "The engine never defines simulation
 * settings"). `playerSquareCellRatio` is not gameplay logic — it's a
 * rendering value — but it's still a Color-Expansion-specific tuning
 * parameter, so it lives here rather than as a hardcoded constant inside
 * engine/rendering: the engine stays generic, and every tuning value for
 * this simulation stays in one place.
 *
 * `gridSize` is the number of cells per side of Color Expansion's own
 * grid. This is a different concept from the shared universal Arena's
 * pixel `size` (src/types/Arena.ts, still separately undecided per
 * Engine.md's own TODO) — that's the on-screen square every simulation
 * renders inside; this is how many cells that square is divided into for
 * Color Expansion specifically.
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
   *
   * A player's current cell is always their own already-claimed
   * territory, drawn in the same color — a full-cell-sized square (a
   * ratio of 1) would be invisible against its own background, so a
   * smaller inset square is used instead. The exact fraction is an
   * unreviewed placeholder, not a considered visual design decision.
   */
  playerSquareCellRatio: number
}

const PLACEHOLDER_DEFAULTS: ColorExpansionConfigShape = {
  gridSize: 20,
  movementSpeedCellsPerSecond: 4,
  playerSquareCellRatio: 0.7,
}

export const COLOR_EXPANSION_CONFIG = new Config<ColorExpansionConfigShape>(PLACEHOLDER_DEFAULTS)
