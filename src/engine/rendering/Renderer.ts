import type { Arena } from '../../types/Arena'
import type { Character } from '../../types/Character'
import { drawArena } from './ArenaRenderer'
import { drawCharacter, drawCharacterSquare } from './CharacterRenderer'
import { drawGrid, type RenderableGrid } from './GridRenderer'
import type { CanvasDimensions, ArenaOffset } from '../../shared/AspectRatio'

export type { RenderableGrid }

/**
 * A character positioned for drawing (see renderFrame below).
 *
 * This is an engine/rendering-only concept, not a simulation state type —
 * each simulation's own state shape (grid cell, physics position, etc.)
 * stays in that simulation's own folder (see Architecture.md, Folder
 * Structure). A simulation maps its own state into this shape before
 * rendering; that mapping is introduced when each simulation is built
 * (Phase 6+), not here. Positions here are always arena-local — see
 * renderFrame's `arenaOffset` param for how that maps onto the canvas.
 */
export interface RenderableCharacter {
  character: Character
  x: number
  y: number
}

/**
 * A square-shaped character positioned in grid-cell units, not pixels
 * (see renderGridFrame below, which converts). Distinct from
 * RenderableCharacter above, which is already in pixel space for
 * circle-based/physics-driven simulations: grid-based simulations like
 * Color Expansion track position in cells, including fractional values
 * while mid-transit between cells (see
 * ColorExpansionPlayerState.moveProgress in
 * simulations/ColorExpansion/ColorExpansion.ts), so a player can be
 * smoothly drawn partway between two cells (see ColorExpansion.md,
 * Visual Rules — "Smooth movement").
 */
export interface RenderableSquareCharacter {
  character: Character
  /** Cell-space x. Fractional while moving between cells. */
  x: number
  /** Cell-space y. Fractional while moving between cells. */
  y: number
}

/** Radius used to draw every character in renderFrame (see CharacterRenderer — Phase 2 placeholder shape). */
const CHARACTER_RADIUS = 12

/** Fill color for the letterboxed space surrounding the arena when the canvas isn't square (see shared/AspectRatio.ts). */
const LETTERBOX_COLOR = '#08060d'

/**
 * The shared rendering pipeline (see Roadmap.md, Phase 2 — "Shared
 * rendering pipeline"). Clears the full canvas — which may be larger
 * than the square arena once an aspect ratio other than 1:1 is selected
 * (see Engine.md, Menu: Aspect Ratio, and shared/AspectRatio.ts) — fills
 * the letterboxed background, draws the arena at `arenaOffset`, then
 * draws every character on top, translated by that same offset so
 * simulation code only ever deals in arena-local coordinates (see
 * Architecture.md, Rendering — engine renders, simulation only supplies
 * state).
 *
 * This is the only place drawing order is decided — the engine tick and
 * simulations never draw directly (see Architecture.md, Rendering).
 */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  canvas: CanvasDimensions,
  arena: Arena,
  arenaOffset: ArenaOffset,
  characters: readonly RenderableCharacter[],
): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = LETTERBOX_COLOR
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  drawArena(ctx, arena, arenaOffset)

  for (const { character, x, y } of characters) {
    drawCharacter(ctx, character, x + arenaOffset.x, y + arenaOffset.y, CHARACTER_RADIUS)
  }
}

/**
 * The rendering pipeline for grid-based simulations (see
 * ColorExpansion.md). Mirrors renderFrame's responsibilities exactly —
 * clear, letterbox, draw the arena — but fills the arena's interior with
 * a colored grid instead of leaving it empty, and draws players as
 * squares instead of fixed-radius circles, per that simulation's own
 * Players/Arena sections. Still the only place drawing order is decided
 * (see Architecture.md, Rendering) — Color Expansion itself never draws.
 *
 * `grid` and `squareCharacters` are expected to come from that
 * simulation's own state-to-renderable mapping function (see
 * simulations/ColorExpansion/ColorExpansion.ts,
 * mapColorExpansionStateToRenderables) — this function only knows how
 * to draw generic colored cells and squares, never what a "player" or
 * "territory" means for any particular simulation.
 *
 * `squareSizeRatio` (a player square's side length, as a fraction of one
 * full grid cell) is likewise supplied by the caller rather than a
 * constant living in this file: it's a Color-Expansion-specific tuning
 * value, not an engine-level default, so it's read from that
 * simulation's own Config (see
 * simulations/ColorExpansion/Config.ts's `playerSquareCellRatio`, and
 * Architecture.md, Configuration — "The engine never defines simulation
 * settings"). Keeping it here as a hardcoded number would mean touching
 * rendering code every time this value needed retuning.
 */
export function renderGridFrame(
  ctx: CanvasRenderingContext2D,
  canvas: CanvasDimensions,
  arena: Arena,
  arenaOffset: ArenaOffset,
  grid: RenderableGrid,
  squareCharacters: readonly RenderableSquareCharacter[],
  squareSizeRatio: number,
): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = LETTERBOX_COLOR
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  drawArena(ctx, arena, arenaOffset)

  const cellPixelSize = arena.size / grid.size
  drawGrid(ctx, grid, cellPixelSize, arenaOffset)

  const squareSize = cellPixelSize * squareSizeRatio
  for (const { character, x, y } of squareCharacters) {
    const pixelX = arenaOffset.x + x * cellPixelSize + cellPixelSize / 2
    const pixelY = arenaOffset.y + y * cellPixelSize + cellPixelSize / 2
    drawCharacterSquare(ctx, character, pixelX, pixelY, squareSize)
  }
}
