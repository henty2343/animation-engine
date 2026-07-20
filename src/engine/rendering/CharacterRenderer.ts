import type { Character } from '../../types/Character'

/**
 * Fill color used to draw a character mid Hit Freeze damage flash (see
 * WeaponClash.md, Hit Freeze — "Both flash white (or another hit
 * effect) for the freeze duration"). A rendering-only placeholder color,
 * like every other color constant in engine/rendering (see
 * ArenaRenderer.ts's own placeholder arena colors) — flagged in
 * docs/Todo.md as open for Phase 11 visual review. Introduced in Phase 9.
 */
const HIT_FLASH_COLOR = '#ffffff'

/**
 * Draws a single character at a given position (see Architecture.md,
 * Rendering — "Engine renders. Simulation only supplies state.").
 *
 * The circle-and-color representation here is a simulation-agnostic
 * placeholder used to prove the rendering pipeline in Phase 2 (see
 * Roadmap.md, Phase 2 — "no simulation logic"). It remains the shape
 * used by the Phase 2 demo Arena, and is Weapon Clash's real player
 * representation (see WeaponClash.md, Players — "Represented by
 * circles"). Color Expansion's real representation is squares — see
 * drawCharacterSquare below.
 *
 * `isFlashing` (Phase 9) draws the character in `HIT_FLASH_COLOR`
 * instead of its own color, for Weapon Clash's Hit Freeze damage flash
 * (see WeaponClash.md, Hit Freeze). This function has no idea what
 * "frozen" or "damage" mean — it only knows how to fill a circle with
 * one of two colors depending on a boolean the caller supplies (see
 * Renderer.ts's `RenderableCharacter.isFlashing` and
 * WeaponClash.ts's `mapWeaponClashStateToRenderables`), the same
 * simulation-agnostic split every other file in this folder follows.
 * Defaults to `false` so every existing call site (the Phase 2 demo,
 * Color Expansion's square characters do not use this function at all)
 * is unaffected.
 */
export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  character: Character,
  x: number,
  y: number,
  radius: number,
  isFlashing = false,
): void {
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fillStyle = isFlashing ? HIT_FLASH_COLOR : character.color
  ctx.fill()
}

/**
 * Draws a single character as a colored square, centered at (x, y) with
 * the given full side length (see ColorExpansion.md, Players —
 * "Represented by squares. Same size as one grid cell.").
 */
export function drawCharacterSquare(
  ctx: CanvasRenderingContext2D,
  character: Character,
  x: number,
  y: number,
  size: number,
): void {
  ctx.fillStyle = character.color
  ctx.fillRect(x - size / 2, y - size / 2, size, size)
}
