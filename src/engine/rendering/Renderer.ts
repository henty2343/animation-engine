import type { Arena } from '../../types/Arena'
import type { Character } from '../../types/Character'
import { drawArena } from './ArenaRenderer'
import { drawCharacter } from './CharacterRenderer'
import type { CanvasDimensions, ArenaOffset } from '../../shared/AspectRatio'

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

/** Radius used to draw every character (see CharacterRenderer — Phase 2 placeholder shape). */
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
