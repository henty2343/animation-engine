import { Config } from '../../shared/Config'

/**
 * Color Expansion's balance values (see docs/ColorExpansion.md, Arena —
 * "Grid size: TODO" — and docs/Todo.md, Balance — "Grid dimensions",
 * "Base movement speed").
 *
 * *** TEMPORARY PLACEHOLDER VALUES — NOT PLAYTESTED ***
 *
 * Neither value below has been chosen or tuned; they exist only so
 * Phase 6 has a complete, runnable MVP instead of blocking on numbers
 * nobody has decided yet (see Roadmap.md, Phase 6 — "Do not spend time
 * trying to perfectly balance the simulation before it exists"). Both
 * are expected to change once the project owner plays a real run. This
 * same open item is tracked in docs/Todo.md, which points back here.
 *
 * Every gameplay file in this simulation (Grid.ts, ColorExpansion.ts)
 * reads these two values through the exported Config instance below —
 * never as inline numbers — so retuning either one later never requires
 * touching gameplay logic (see shared/Config.ts, and Architecture.md,
 * Configuration: "The engine never defines simulation settings").
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
}

const PLACEHOLDER_DEFAULTS: ColorExpansionConfigShape = {
  gridSize: 20,
  movementSpeedCellsPerSecond: 4,
}

export const COLOR_EXPANSION_CONFIG = new Config<ColorExpansionConfigShape>(PLACEHOLDER_DEFAULTS)
