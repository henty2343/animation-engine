import type { Character } from '../../types/Character'

/**
 * Draws a single character at a given position (see Architecture.md,
 * Rendering — "Engine renders. Simulation only supplies state.").
 *
 * The circle-and-color representation here is a simulation-agnostic
 * placeholder used to prove the rendering pipeline in Phase 2 (see
 * Roadmap.md, Phase 2 — "no simulation logic"). It remains the shape
 * used by the Phase 2 demo Arena, and is expected to become Weapon
 * Clash's real player representation (see WeaponClash.md, Players —
 * "Represented by circles") once that simulation is implemented
 * (Phase 8). Color Expansion's real representation is squares — see
 * drawCharacterSquare below.
 */
export function drawCharacter(
  ctx: CanvasRenderingContext2D,
  character: Character,
  x: number,
  y: number,
  radius: number,
): void {
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.fillStyle = character.color
  ctx.fill()
}

/**
 * Draws a single character as a colored square, centered at (x, y) with
 * the given full side length (see ColorExpansion.md, Players —
 * "Represented by squares. Same size as one grid cell.").
 *
 * Callers drawing a grid-based simulation's players (see
 * Renderer.ts's renderGridFrame) are expected to pass a size somewhat
 * smaller than a full grid cell rather than the full cell size itself:
 * a player's current cell is always their own already-claimed territory
 * (see ColorExpansion.md, Territory), which is drawn in the same color,
 * so a full-cell-sized square would be invisible against its own
 * background. A smaller square sitting inside that cell stays visible
 * as a distinct marker without introducing any new color or effect.
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
