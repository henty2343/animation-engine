import { useEffect, useMemo, useRef } from 'react'
import { SimulationEngine } from '../../engine/core/SimulationEngine'
import { renderFrame, type RenderableCharacter } from '../../engine/rendering/Renderer'
import { listCharacters } from '../../characters/Characters'
import type { Arena as ArenaType } from '../../types/Arena'
import { getCanvasDimensions, getArenaOffset } from '../../shared/AspectRatio'
import type { AspectRatio } from '../../shared/Constants'

/**
 * Mounts the canvas the engine renders into. Contains no drawing logic of
 * its own — drawing happens in engine/rendering (see Architecture.md,
 * Components).
 *
 * Phase 2 placeholder demo characters/arena size are still in place here
 * (see Roadmap.md, Phase 2 — "Characters should be visible inside an
 * empty arena"): no real Simulation<TState> exists yet to load() and
 * start() (Color Expansion and Weapon Clash are still Phase 6/8 — see
 * Progress.md). Phase 5 only adds aspect-ratio-aware canvas sizing on top
 * of that same demo, so the on-screen preview already matches whichever
 * output format (16:9 / 9:16) was chosen in the Menu (see Engine.md, Menu
 * and Blueprint.md's output formats). Everything else about this demo is
 * unchanged and still awaits replacement once a real simulation exists.
 */
const DEMO_ARENA: ArenaType = { size: 480 }

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
