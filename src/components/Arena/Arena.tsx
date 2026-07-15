import { useEffect, useRef } from 'react'
import { SimulationEngine } from '../../engine/core/SimulationEngine'
import { renderFrame, type RenderableCharacter } from '../../engine/rendering/Renderer'
import { listCharacters } from '../../characters/Characters'
import type { Arena as ArenaType } from '../../types/Arena'

/**
 * Mounts the canvas the engine renders into. Contains no drawing logic of
 * its own — drawing happens in engine/rendering (see Architecture.md,
 * Components).
 *
 * Phase 2 placeholder: the arena size and character positions below are
 * demo values used only to prove the rendering pipeline (see Roadmap.md,
 * Phase 2 — "Characters should be visible inside an empty arena"). Real
 * arena sizing (Todo.md, Balance) and character placement (each
 * simulation's own Spawn section) arrive with the Menu (Phase 5) and each
 * simulation (Phase 6+) — nothing here is simulation logic.
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

export function Arena() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const engine = new SimulationEngine()
    const demoCharacters = getDemoCharacters()

    engine.startLoop(() => {
      renderFrame(ctx, DEMO_ARENA, demoCharacters)
    })

    return () => engine.stopLoop()
  }, [])

  return <canvas ref={canvasRef} width={DEMO_ARENA.size} height={DEMO_ARENA.size} />
}
