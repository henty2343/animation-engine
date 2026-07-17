import type { ArenaOffset } from '../../shared/AspectRatio'

/**
 * A simulation-agnostic grid of colored cells (see Architecture.md,
 * Rendering — "Engine renders. Simulation only supplies state."). Any
 * grid-based simulation (currently Color Expansion — see
 * ColorExpansion.md, Arena: "Cells have two states: Neutral, Claimed")
 * maps its own ownership data into this shape before the engine draws
 * it; this file has no idea what a "player" or "territory" is, only
 * that some cells have a color and some don't — mirroring how
 * RenderableCharacter in Renderer.ts is a drawing-only concept, not a
 * simulation state type.
 */
export interface RenderableGrid {
  /** Cells per side. */
  size: number
  /** cells[y][x] = a hex color, or null for an unclaimed/neutral cell. */
  cells: (string | null)[][]
}

/** Fill color for a neutral (unclaimed) cell — a placeholder value, like ArenaRenderer.ts's own colors (see that file's doc comment). */
const NEUTRAL_CELL_COLOR = '#2e303a'

/**
 * Draws every cell of `grid`, each occupying a `cellPixelSize`-square
 * footprint, offset by `offset` (see shared/AspectRatio.ts — the same
 * offset ArenaRenderer.ts uses to center the arena within a
 * possibly-letterboxed canvas). Purely a drawing function: holds no
 * state itself, and — like ArenaRenderer.ts and CharacterRenderer.ts —
 * knows nothing about players, ownership, or any specific simulation.
 */
export function drawGrid(
  ctx: CanvasRenderingContext2D,
  grid: RenderableGrid,
  cellPixelSize: number,
  offset: ArenaOffset,
): void {
  for (let y = 0; y < grid.size; y++) {
    for (let x = 0; x < grid.size; x++) {
      ctx.fillStyle = grid.cells[y][x] ?? NEUTRAL_CELL_COLOR
      ctx.fillRect(
        offset.x + x * cellPixelSize,
        offset.y + y * cellPixelSize,
        cellPixelSize,
        cellPixelSize,
      )
    }
  }
}
