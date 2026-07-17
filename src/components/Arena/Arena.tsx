import { useEffect, useMemo, useRef } from 'react'
import { SimulationEngine } from '../../engine/core/SimulationEngine'
import { renderFrame, type RenderableCharacter } from '../../engine/rendering/Renderer'
import { listCharacters } from '../../characters/Characters'
import type { Arena as ArenaType } from '../../types/Arena'
import { getCanvasDimensions, getArenaOffset } from '../../shared/AspectRatio'
import { UNIVERSAL_ARENA_SIZE, type AspectRatio } from '../../shared/Constants'

/**
 * Mounts the canvas the engine renders into. Contains no drawing logic of
 * its own — drawing happens in engine/rendering (see Architecture.md,
 * Components).
 *
 * This remains the Phase 2 demo (see Roadmap.md, Phase 2 — "Characters
 * should be visible inside an empty arena"): no real Simulation<TState>
 * is loaded here. It is still used as the "running" view's fallback for
 * any simulation that has no real implementation yet (Weapon Clash —
 * Phase 8). Color Expansion now has a real implementation and uses
 * ColorExpansionArena.tsx instead (see App.tsx) — this file is otherwise
 * unchanged from Phase 5 except reading the arena size from the shared
 * `UNIVERSAL_ARENA_SIZE` constant rather than a locally hardcoded value,
 * so the demo and Color Expansion's real arena can never drift apart
 * (see shared/Constants.ts).
 */
const DEMO_ARENA: ArenaType = { size: UNIVERSAL_ARENA_SIZE }

function getDemoCharacters(): RenderableCharacter[] {
  const characters = listCharacters()
  const margin = 80
  const centerX = DEMO_ARENA.size / 2
  const centerY = DEMO_ARENA.size / 2
  const spawnRadius = DEMO_ARENA.size / 2 - margin

  return characters.map((character, index) => {
    const angle = (index / characters.length) * Math.PI * 2

    return {
      character,
      x: centerX + Math.cos(angle) * spawnRadius,
      y: centerY + Math.sin(angle) * spawnRadius,
    }
  })
}

interface ArenaProps {
  aspectRatio: AspectRatio
}

export function Arena({ aspectRatio }: ArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const canvasDimensions = useMemo(
    () => getCanvasDimensions(aspectRatio, DEMO_ARENA.size),
    [aspectRatio],
  )
  const arenaOffset = useMemo(
    () => getArenaOffset(canvasDimensions, DEMO_ARENA.size),
    [canvasDimensions],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const engine = new SimulationEngine()
    const demoCharacters = getDemoCharacters()

    engine.startLoop(() => {
      renderFrame(ctx, canvasDimensions, DEMO_ARENA, arenaOffset, demoCharacters)
    })

    return () => engine.stopLoop()
  }, [canvasDimensions, arenaOffset])

  return (
    <canvas
      ref={canvasRef}
      width={canvasDimensions.width}
      height={canvasDimensions.height}
    />
  )
}
