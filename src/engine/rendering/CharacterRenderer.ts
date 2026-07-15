import type { Character } from '../../types/Character'

/**
 * Draws a single character at a given position (see Architecture.md,
 * Rendering — "Engine renders. Simulation only supplies state.").
 *
 * The circle-and-color representation here is a simulation-agnostic
 * placeholder used to prove the rendering pipeline in Phase 2 (see
 * Roadmap.md, Phase 2 — "no simulation logic"). Each simulation's real
 * on-screen representation (squares for Color Expansion, circles for
 * Weapon Clash — see ColorExpansion.md and WeaponClash.md, Players)
 * arrives when that simulation is implemented; this function does not
 * yet know about either.
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
