import { useEffect, useMemo, useRef } from 'react'
import { SimulationEngine } from '../../engine/core/SimulationEngine'
import { renderCircleFrame } from '../../engine/rendering/Renderer'
import { StatisticsStore } from '../../engine/statistics/StatisticsStore'
import { descendingBy } from '../../engine/statistics/Ranking'
import {
  createWeaponClashSimulation,
  computeWeaponClashStats,
  mapWeaponClashStateToRenderables,
  type WeaponClashState,
  type WeaponClashStats,
} from '../../simulations/WeaponClash/WeaponClash'
import { WEAPON_CLASH_CONFIG } from '../../simulations/WeaponClash/Config'
import type { Player } from '../../types/Player'
import type { Arena as ArenaType } from '../../types/Arena'
import { getCanvasDimensions, getArenaOffset } from '../../shared/AspectRatio'
import { UNIVERSAL_ARENA_SIZE, type AspectRatio } from '../../shared/Constants'
import type { PlayerStatDisplay } from '../UI/types'

/**
 * Weapon Clash's real arena, sized from the same shared constant every
 * simulation uses (see Engine.md, Arena — "Same dimensions for every
 * simulation"; shared/Constants.ts).
 */
const ARENA: ArenaType = { size: UNIVERSAL_ARENA_SIZE }

interface WeaponClashArenaProps {
  /** The fixed 2–4 player roster for this run (see Engine.md, Menu). */
  players: Player[]
  aspectRatio: AspectRatio
  /** A fresh seed for this run (see Engine.md, Determinism). */
  seed: number
  /** Called every tick with the live, ranked leaderboard (see WeaponClash.md, Statistics — "Sorted by Highest HP"). */
  onStatsUpdate: (entries: PlayerStatDisplay[]) => void
  /** Called once, on the tick the simulation reaches its win condition (see WeaponClash.md, Winner Screen). */
  onComplete: () => void
}

/**
 * Mounts the canvas and actually runs Weapon Clash via SimulationEngine
 * (see simulations/WeaponClash/WeaponClash.ts) — mirrors
 * ColorExpansionArena.tsx exactly, substituting the circle-based
 * renderCircleFrame pipeline for the grid-based renderGridFrame one,
 * since Weapon Clash's players are circles in continuous physics space
 * rather than squares on a grid (see docs/WeaponClash.md, Players).
 * Contains no drawing logic of its own (see Architecture.md, Components)
 * — every frame this component only asks WeaponClash.ts to map the
 * current state into generic renderable shapes and hands those to
 * engine/rendering/Renderer.ts's renderCircleFrame, which does the
 * actual canvas drawing.
 */
export function WeaponClashArena({
  players,
  aspectRatio,
  seed,
  onStatsUpdate,
  onComplete,
}: WeaponClashArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // Refs so the run's tick loop always calls the latest callback without
  // requiring onStatsUpdate/onComplete in the effect's dependency array
  // — see ColorExpansionArena.tsx's identical comment for why.
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

    const engine = new SimulationEngine<WeaponClashState>()
    const simulation = createWeaponClashSimulation(players)
    const statsStore = new StatisticsStore<WeaponClashStats>()

    engine.load(simulation)
    engine.start(seed, () => {
      const state = engine.getState()
      if (!state) return

      const { characters, weapons } = mapWeaponClashStateToRenderables(state)
      renderCircleFrame(
        ctx,
        canvasDimensions,
        ARENA,
        arenaOffset,
        characters,
        weapons,
        WEAPON_CLASH_CONFIG.get('playerRadius'),
      )

      const statsRecord = computeWeaponClashStats(state)
      for (const player of players) {
        const playerStats = statsRecord[player.id]
        if (!playerStats) continue
        if (statsStore.has(player.id)) {
          statsStore.update(player.id, playerStats)
        } else {
          statsStore.set(player.id, playerStats)
        }
      }

      // "Sorted by Highest HP" — see WeaponClash.md, Statistics.
      const ranked = statsStore.getRanked(descendingBy((stats) => stats.hp))
      const display: PlayerStatDisplay[] = ranked.map((entry, index) => ({
        playerId: entry.playerId,
        character: players.find((player) => player.id === entry.playerId)!.character,
        rank: index + 1,
        eliminated: entry.stats.eliminated,
        statLines: [`${Math.max(0, Math.round(entry.stats.hp))} HP`],
      }))
      onStatsUpdateRef.current(display)

      // SimulationEngine stops the tick loop the moment
      // Simulation.isComplete() reports true (see
      // ColorExpansionArena.tsx's identical comment) — checking
      // isRunning() here reliably fires onComplete exactly once.
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
