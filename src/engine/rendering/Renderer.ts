import type { Arena } from '../../types/Arena'
import type { Character } from '../../types/Character'
import type { Vector2 } from '../../types/Vector2'
import { drawArena } from './ArenaRenderer'
import { drawCharacter, drawCharacterSquare } from './CharacterRenderer'
import { drawGrid, type RenderableGrid } from './GridRenderer'
import { drawWeapon } from './WeaponRenderer'
import type { CanvasDimensions, ArenaOffset } from '../../shared/AspectRatio'

export type { RenderableGrid }

/**
 * A character positioned for drawing (see renderFrame below). Positions
 * here are always arena-local — see renderFrame's `arenaOffset` param.
 */
export interface RenderableCharacter {
  character: Character
  x: number
  y: number
}

/**
 * A square-shaped character positioned in grid-cell units, not pixels
 * (see renderGridFrame below, which converts).
 */
export interface RenderableSquareCharacter {
  character: Character
  x: number
  y: number
}

/**
 * A weapon positioned for drawing, in the same arena-local pixel space
 * as `RenderableCharacter` (see renderCircleFrame below). Introduced in
 * Phase 8 for Weapon Clash (see docs/WeaponClash.md, Weapons) — an
 * engine/rendering-only concept, not a simulation state type, mirroring
 * `RenderableCharacter`/`RenderableSquareCharacter` above.
 */
export interface RenderableWeapon {
  color: string
  start: Vector2
  end: Vector2
}

/** Radius used to draw every character in renderFrame (Phase 2 placeholder shape). */
const CHARACTER_RADIUS = 12

/** Fill color for the letterboxed space surrounding the arena when the canvas isn't square. */
const LETTERBOX_COLOR = '#08060d'

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

/**
 * The rendering pipeline for physics-driven, circle-based simulations —
 * introduced in Phase 8 for Weapon Clash (see docs/WeaponClash.md,
 * Players — "Represented by circles"). Mirrors renderFrame's and
 * renderGridFrame's responsibilities exactly — clear, letterbox, draw
 * the arena — then draws every weapon (as a line, underneath), then
 * every player (as a circle, on top, via the existing drawCharacter).
 * Weapons are drawn before characters so a weapon's rotating line is
 * always visible rather than potentially hidden beneath a player's
 * circle at the moment it's pointing back over its own wielder.
 *
 * `characterRadius` is a caller-supplied parameter rather than the
 * demo's hardcoded CHARACTER_RADIUS constant, since Weapon Clash's own
 * circle size comes from its own Config (see
 * simulations/WeaponClash/Config.ts's `playerRadius`) — mirroring
 * renderGridFrame's own `squareSizeRatio` parameter for the identical
 * reason (Architecture.md, Configuration: "The engine never defines
 * simulation settings").
 */
export function renderCircleFrame(
  ctx: CanvasRenderingContext2D,
  canvas: CanvasDimensions,
  arena: Arena,
  arenaOffset: ArenaOffset,
  characters: readonly RenderableCharacter[],
  weapons: readonly RenderableWeapon[],
  characterRadius: number,
): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = LETTERBOX_COLOR
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  drawArena(ctx, arena, arenaOffset)

  for (const weapon of weapons) {
    drawWeapon(ctx, {
      color: weapon.color,
      start: { x: weapon.start.x + arenaOffset.x, y: weapon.start.y + arenaOffset.y },
      end: { x: weapon.end.x + arenaOffset.x, y: weapon.end.y + arenaOffset.y },
    })
  }

  for (const { character, x, y } of characters) {
    drawCharacter(ctx, character, x + arenaOffset.x, y + arenaOffset.y, characterRadius)
  }
}
