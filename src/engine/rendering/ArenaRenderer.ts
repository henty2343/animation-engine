import type { Arena } from '../../types/Arena'
import type { ArenaOffset } from '../../shared/AspectRatio'

/**
 * Draws the universal square arena (see Engine.md, Arena; Architecture.md,
 * Rendering — "Engine renders. Simulation only supplies state.").
 *
 * `offset` positions the arena within a (possibly larger) canvas once an
 * aspect ratio other than 1:1 is in use (see shared/AspectRatio.ts and
 * Renderer.ts, which fills the surrounding letterbox before calling
 * this). Defaults to {0, 0} so a canvas exactly `arena.size` is
 * unaffected.
 *
 * Purely a drawing function: given a canvas context, the arena to draw,
 * and where to draw it, it paints the arena's background and border. It
 * holds no state of its own and knows nothing about simulations,
 * characters, or aspect ratio itself.
 *
 * Colors below are placeholder values — final visual design is out of
 * scope for Phase 2 (see Roadmap.md, Phase 2).
 */
export function drawArena(
  ctx: CanvasRenderingContext2D,
  arena: Arena,
  offset: ArenaOffset = { x: 0, y: 0 },
): void {
  const { size } = arena

  ctx.fillStyle = '#16171d'
  ctx.fillRect(offset.x, offset.y, size, size)

  ctx.strokeStyle = '#2e303a'
  ctx.lineWidth = 2
  ctx.strokeRect(offset.x, offset.y, size, size)
}
