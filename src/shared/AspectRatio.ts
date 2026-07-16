import { ASPECT_RATIOS, type AspectRatio } from './Constants'

/**
 * The output canvas's pixel dimensions for a chosen aspect ratio (see
 * Engine.md, Menu — Aspect Ratio, and Blueprint.md's supported output
 * formats: 16:9 and 9:16).
 */
export interface CanvasDimensions {
  width: number
  height: number
}

/** Where the square arena sits within its (possibly larger) canvas. */
export interface ArenaOffset {
  x: number
  y: number
}

/**
 * Computes the canvas dimensions for `aspectRatio`, sized so the
 * universal square arena (see Engine.md, Arena) fits entirely inside it
 * without cropping. The arena's own size never changes with aspect ratio
 * — only how much letterboxed space surrounds it (see
 * engine/rendering/Renderer.ts, which paints that surrounding space).
 */
export function getCanvasDimensions(
  aspectRatio: AspectRatio,
  arenaSize: number,
): CanvasDimensions {
  const longSide = arenaSize * (16 / 9)

  switch (aspectRatio) {
    case ASPECT_RATIOS.WIDESCREEN:
      return { width: longSide, height: arenaSize }
    case ASPECT_RATIOS.VERTICAL:
      return { width: arenaSize, height: longSide }
    default:
      return { width: arenaSize, height: arenaSize }
  }
}

/** The offset needed to center the square arena within `canvas`. */
export function getArenaOffset(canvas: CanvasDimensions, arenaSize: number): ArenaOffset {
  return {
    x: (canvas.width - arenaSize) / 2,
    y: (canvas.height - arenaSize) / 2,
  }
}
