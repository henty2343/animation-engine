import type { Arena } from '../../types/Arena'
import type { Character } from '../../types/Character'
import { drawArena } from './ArenaRenderer'
import { drawCharacter } from './CharacterRenderer'

/**
 * A character positioned for drawing (see renderFrame below).
 *
 * This is an engine/rendering-only concept, not a simulation state type —
 * each simulation's own state shape (grid cell, physics position, etc.)
 * stays in that simulation's own folder (see Architecture.md, Folder
 * Structure). A simulation maps its own state into this shape before
 * rendering; that mapping is introduced when each simulation is built
 * (Phase 6+), not here.
 */
export interface RenderableCharacter {
  character: Character
  x: number
  y: number
}

/** Radius used to draw every character (see CharacterRenderer — Phase 2 placeholder shape). */
const CHARACTER_RADIUS = 12

/**
 * The shared rendering pipeline (see Roadmap.md, Phase 2 — "Shared
 * rendering pipeline"). Clears the canvas, draws the arena, then draws
 * every character on top of it.
 *
 * This is the only place drawing order is decided — the engine tick and
 * simulations never draw directly (see Architecture.md, Rendering).
 */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  arena: Arena,
  characters: readonly RenderableCharacter[],
): void {
  ctx.clearRect(0, 0, arena.size, arena.size)

  drawArena(ctx, arena)

  for (const { character, x, y } of characters) {
    drawCharacter(ctx, character, x, y, CHARACTER_RADIUS)
  }
}
