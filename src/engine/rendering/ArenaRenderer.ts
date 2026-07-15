import type { Arena } from '../../types/Arena'

/**
 * Draws the universal square arena (see Engine.md, Arena; Architecture.md,
 * Rendering — "Engine renders. Simulation only supplies state.").
 *
 * Purely a drawing function: given a canvas context and the arena to
 * draw, it paints the arena's background and border starting at the
 * context's origin. It holds no state of its own and knows nothing about
 * simulations or characters.
 *
 * Colors below are placeholder values — final visual design is out of
 * scope for Phase 2 (see Roadmap.md, Phase 2).
 */
export function drawArena(ctx: CanvasRenderingContext2D, arena: Arena): void {
  const { size } = arena

  ctx.fillStyle = '#16171d'
  ctx.fillRect(0, 0, size, size)

  ctx.strokeStyle = '#2e303a'
  ctx.lineWidth = 2
  ctx.strokeRect(0, 0, size, size)
}
