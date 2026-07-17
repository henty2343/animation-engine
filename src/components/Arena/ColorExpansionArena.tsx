import { useEffect, useMemo, useRef } from 'react'
import { SimulationEngine } from '../../engine/core/SimulationEngine'
import { renderGridFrame } from '../../engine/rendering/Renderer'
import { StatisticsStore } from '../../engine/statistics/StatisticsStore'
import { descendingBy } from '../../engine/statistics/Ranking'
import {
  createColorExpansionSimulation,
  computeColorExpansionStats,
  mapColorExpansionStateToRenderables,
  type ColorExpansionState,
  type ColorExpansionStats,
} from '../../simulations/ColorExpansion/ColorExpansion'
import { COLOR_EXPANSION_CONFIG } from '../../simulations/ColorExpansion/Config'
import type { Player } from '../../types/Player'
import type { Arena as ArenaType } from '../../types/Arena'
import { getCanvasDimensions, getArenaOffset } from '../../shared/AspectRatio'
import { UNIVERSAL_ARENA_SIZE, type AspectRatio } from '../../shared/Constants'
import type { PlayerStatDisplay } from '../UI/types'

/**
 * Color Expansion's real arena, sized from the same shared constant the
 * Phase 2 demo Arena.tsx uses (see shared/Constants.ts) — "Universal
 * square arena. Same dimensions as every simulation" (Engine.md, Arena).
 */
const ARENA: ArenaType = { size: UNIVERSAL_ARENA_SIZE }

interface ColorExpansionArenaProps {
  /** The fixed 2–4 player roster for this run (see Engine.md, Menu). */
  players: Player[]
  aspectRatio: AspectRatio
  /**
   * A fresh seed for this run (see Engine.md, Determinism — the same
   * seed must always reproduce the same result; a new run gets a new
   * seed, chosen by whoever starts the run — see App.tsx).
   */
  seed: number
  /** Called every tick with the live, ranked leaderboard (see ColorExpansion.md, Statistics). */
  onStatsUpdate: (entries: PlayerStatDisplay[]) => void
  /** Called once, on the tick the simulation reaches its win condition (see ColorExpansion.md, Winner Screen). */
  onComplete: () => void
}

/**
 * Mounts the canvas and actually runs Color Expansion via
 * SimulationEngine — the real simulation (see
 * simulations/ColorExpansion/ColorExpansion.ts), not the Phase 2 demo
 * components/Arena/Arena.tsx still falls back to for simulations with no
 * real implementation yet (Weapon Clash — Phase 8). Contains no drawing
 * logic of its own (see Architecture.md, Components: "It contains no
 * drawing logic; drawing happens in engine/rendering.") — every frame,
 * this component only asks ColorExpansion.ts to map the current state
 * into generic renderable shapes and hands those to
 * engine/rendering/Renderer.ts's renderGridFrame, which does the actual
 * canvas drawing.
 *
 * Also drives the engine/statistics/StatisticsStore + Ranking.ts
 * infrastructure built in Phase 4 — the first real caller of either,
 * per Progress.md's own note that neither had a consumer yet — turning
 * ColorExpansion.ts's per-tick stats into the ranked PlayerStatDisplay[]
 * shape StatsPanel/WinnerScreen already know how to render.
 */
export function ColorExpansionArena({
  players,
  aspectRatio,
  seed,
  onStatsUpdate,
  onComplete,
}: ColorExpansionArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Refs so the run's tick loop always calls the latest callback without
  // requiring `onStatsUpdate`/`onComplete` in the effect's dependency
  // array below — both are typically a new function identity on every
  // parent render (StatsPanel updates every tick), and including them
  // would restart the whole run every frame instead of once per run.
  const onStatsUpdateRef = useRef(onStatsUpdate)
  onStatsUpdateRef.current = onStatsUpdate
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const canvasDimensions = useMemo(
    () => getCanvasDimensions(aspectRatio, ARENA.size),
    [aspectRatio],
  )
  const arenaOffset = useMemo(
    () => getArenaOffset(canvasDimensions, ARENA.size),
    [canvasDimensions],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const engine = new SimulationEngine<ColorExpansionState>()
    const simulation = createColorExpansionSimulation(players)
    const statsStore = new StatisticsStore<ColorExpansionStats>()

    engine.load(simulation)
    engine.start(seed, () => {
      const state = engine.getState()
      if (!state) return

      const { grid, squareCharacters } = mapColorExpansionStateToRenderables(state)
      renderGridFrame(
        ctx,
        canvasDimensions,
        ARENA,
        arenaOffset,
        grid,
        squareCharacters,
        COLOR_EXPANSION_CONFIG.get('playerSquareCellRatio'),
      )

      const statsRecord = computeColorExpansionStats(state)
      for (const player of players) {
        const playerStats = statsRecord[player.id]
        if (!playerStats) continue
        if (statsStore.has(player.id)) {
          statsStore.update(player.id, playerStats)
        } else {
          statsStore.set(player.id, playerStats)
        }
      }

      const ranked = statsStore.getRanked(descendingBy((stats) => stats.territoryPercent))
      const display: PlayerStatDisplay[] = ranked.map((entry, index) => ({
        playerId: entry.playerId,
        character: players.find((player) => player.id === entry.playerId)!.character,
        rank: index + 1,
        eliminated: entry.stats.eliminated,
        statLines: [`${Math.round(entry.stats.territoryPercent)}% territory`],
      }))
      onStatsUpdateRef.current(display)

      // SimulationEngine.advanceSimulationStep() stops the tick loop the
      // moment Simulation.isComplete() reports true, before this render
      // callback fires for that same, final tick (see
      // SimulationEngine.ts's tick()) — so checking isRunning() here
      // reliably fires onComplete exactly once, on the frame the
      // simulation actually finishes ("Simulation freezes immediately",
      // ColorExpansion.md, Winner Screen).
      if (!engine.isRunning()) {
        onCompleteRef.current()
      }
    })

    return () => engine.stop()
  }, [players, seed, canvasDimensions, arenaOffset])

  return (
    <canvas
      ref={canvasRef}
      width={canvasDimensions.width}
      height={canvasDimensions.height}
    />
  )
}
