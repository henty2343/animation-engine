import type { Simulation } from '../../types/Simulation'
import type { Player } from '../../types/Player'
import { lerp } from '../../shared/Math'
import type { RenderableGrid, RenderableSquareCharacter } from '../../engine/rendering/Renderer'
import {
  createGrid,
  getCellOwner,
  claimCell,
  hasAnyNeutralCell,
  findNextStepTowardNearestNeutralCell,
  type GridState,
} from './Grid'
import { COLOR_EXPANSION_CONFIG } from './Config'

/**
 * Color Expansion (see docs/ColorExpansion.md). Phase 6 implements
 * exactly what that document describes for Grid, Players, Movement,
 * Territory capture, Elimination, and the Win condition — Character
 * Skills are explicitly out of scope here (see Skills.ts, still an empty
 * placeholder, and Characters.md's Color Expansion column, which arrives
 * in Phase 7).
 *
 * A Color Expansion player is the shared Player type (id, slot,
 * character — see types/Player.ts) plus the movement/territory state
 * that only this simulation needs (see Architecture.md's
 * one-canonical-location rule: a type used by exactly one simulation
 * belongs inside that simulation's own folder).
 */
export interface ColorExpansionPlayerState extends Player {
  /** Current cell, always inside the grid and always owned by this player. */
  x: number
  y: number

  /**
   * The adjacent cell this player is currently walking into, or `null`
   * if a new target needs to be chosen (see advancePlayer below).
   */
  targetX: number | null
  targetY: number | null

  /** Fraction (0–1) of the way from (x, y) to (targetX, targetY). */
  moveProgress: number

  /** See ColorExpansion.md, Elimination. Eliminated players keep their territory but stop moving. */
  eliminated: boolean
}

export interface ColorExpansionState {
  grid: GridState
  players: ColorExpansionPlayerState[]
}

/** Live per-player territory statistics (see ColorExpansion.md, Statistics). */
export interface ColorExpansionStats {
  territoryCellCount: number
  territoryPercent: number
  eliminated: boolean
}

/**
 * Spawn corner for a given player slot (see ColorExpansion.md, Spawn: "2
 * Players: Opposite corners", "3 Players: Three corners", "4 Players: One
 * corner each"). Corners are assigned in a single fixed winding order —
 * top-left, top-right, bottom-right, bottom-left — and a run with N
 * players simply uses the first N of them. This one rule satisfies all
 * three documented cases at once: slots 0 and 1 (2-player games) land on
 * top-left/bottom-right, which are diagonally opposite; slots 0–2
 * (3-player games) land on three distinct corners; slots 0–3 (4-player
 * games) use all four. Which specific corner is omitted for 3 players
 * (bottom-left, here) is not specified in ColorExpansion.md — this is a
 * judgment call, flagged in Progress.md.
 */
function getSpawnCorner(slot: number, size: number): { x: number; y: number } {
  switch (slot) {
    case 0:
      return { x: 0, y: 0 } // top-left
    case 1:
      return { x: size - 1, y: 0 } // top-right
    case 2:
      return { x: size - 1, y: size - 1 } // bottom-right
    case 3:
      return { x: 0, y: size - 1 } // bottom-left
    default:
      throw new Error(
        `Color Expansion supports at most 4 players (see Engine.md, Menu), got slot ${slot}.`,
      )
  }
}

/**
 * Builds a Color Expansion Simulation<ColorExpansionState> for a fixed
 * roster of 2–4 players (see Engine.md, Menu — player count and
 * character-per-slot selection happens before a run starts, in the Menu,
 * not here).
 *
 * The returned object conforms to Simulation<TState> so SimulationEngine
 * can run it exactly like any other simulation (see types/Simulation.ts,
 * engine/core/SimulationEngine.ts).
 */
export function createColorExpansionSimulation(
  players: Player[],
): Simulation<ColorExpansionState> {
  return {
    createInitialState(seed: number): ColorExpansionState {
      // `seed` is accepted per the Simulation<TState> contract but not
      // consumed: every rule implemented this phase (spawn corners, BFS
      // pathfinding) is fully deterministic without randomness. Trickster's
      // random movement bonuses (see Characters.md) arrive with this
      // simulation's Skills.ts in Phase 7 and are expected to be the first
      // consumer of a seeded Random instance here.
      void seed

      const size = COLOR_EXPANSION_CONFIG.get('gridSize')
      const grid = createGrid(size)

      const playerStates: ColorExpansionPlayerState[] = players.map((player) => {
        const corner = getSpawnCorner(player.slot, size)
        claimCell(grid, corner.x, corner.y, player.id) // spawn cells are immediately claimed
        return {
          ...player,
          x: corner.x,
          y: corner.y,
          targetX: null,
          targetY: null,
          moveProgress: 0,
          eliminated: false,
        }
      })

      return { grid, players: playerStates }
    },

    update(state: ColorExpansionState, deltaTimeMs: number): ColorExpansionState {
      const speed = COLOR_EXPANSION_CONFIG.get('movementSpeedCellsPerSecond')

      // Fixed processing order (player slot order, as given in `players`)
      // so that if two players' independently-computed targets are ever
      // the same neutral cell, whichever player is processed first in a
      // given tick claims it first — the same seed/roster always resolves
      // that race the same way. This mirrors Grid.ts's fixed neighbor
      // order for the same reason (see findNextStepTowardNearestNeutralCell).
      for (const player of state.players) {
        if (player.eliminated) continue
        advancePlayer(state.grid, player, speed, deltaTimeMs)
      }

      return state
    },

    isComplete(state: ColorExpansionState): boolean {
      // A player is only ever marked eliminated when no neutral cell is
      // reachable from them (see advancePlayer below), so "every player
      // eliminated" already implies no neutral cell is reachable by
      // anyone — this also covers the edge case where neutral cells
      // remain but are permanently walled off from every player.
      if (state.players.every((p) => p.eliminated)) return true
      return !hasAnyNeutralCell(state.grid)
    },
  }
}

/**
 * Advances one player by one fixed timestep: moves them toward their
 * current target cell, arriving (and capturing, if neutral) as many
 * times as `deltaTimeMs` worth of movement speed allows, and picking a
 * fresh target whenever they don't have a valid one. Implements the
 * per-player portion of ColorExpansion.md's Simulation Loop (steps 1–3;
 * elimination is step 5, handled inline here as soon as no next step
 * exists).
 *
 * Uses a while loop rather than a single "did we cross the finish line"
 * check so that behavior stays correct however `movementSpeedCellsPerSecond`
 * ends up being tuned later (see Config.ts) — a fast enough speed could
 * legitimately cross more than one cell in a single fixed timestep.
 */
function advancePlayer(
  grid: GridState,
  player: ColorExpansionPlayerState,
  speedCellsPerSecond: number,
  deltaTimeMs: number,
): void {
  let remainingMovement = (speedCellsPerSecond * deltaTimeMs) / 1000

  while (remainingMovement > 0) {
    if (!hasValidTarget(grid, player)) {
      const step = findNextStepTowardNearestNeutralCell(grid, player.id, player.x, player.y)
      if (step === null) {
        player.eliminated = true // see ColorExpansion.md, Elimination
        return
      }
      player.targetX = step.x
      player.targetY = step.y
      player.moveProgress = 0
    }

    const progressNeeded = 1 - player.moveProgress
    if (remainingMovement >= progressNeeded) {
      remainingMovement -= progressNeeded

      // Arrive. `targetX`/`targetY` are guaranteed non-null here because
      // hasValidTarget()/the assignment above always set them together.
      player.x = player.targetX as number
      player.y = player.targetY as number

      if (getCellOwner(grid, player.x, player.y) === null) {
        claimCell(grid, player.x, player.y, player.id) // see ColorExpansion.md, Territory
      }

      player.targetX = null
      player.targetY = null
      player.moveProgress = 0
    } else {
      player.moveProgress += remainingMovement
      remainingMovement = 0
    }
  }
}

/**
 * Whether a player's current target cell is still a legal destination:
 * still neutral, or still their own territory (an intermediate step on
 * the way to a farther neutral cell — see Grid.ts's BFS doc comment).
 * Re-checked every tick because another player can claim a
 * previously-neutral target cell out from under this one while it's
 * mid-transit; if that happens the target becomes enemy territory (a
 * wall — see ColorExpansion.md, Movement), so this player must discard
 * it and pick a fresh path instead of trying to enter it. Discarding
 * mid-transit resets moveProgress along with the target: a move that
 * never completed never displaced the player, so there's no partial
 * position to preserve.
 */
function hasValidTarget(grid: GridState, player: ColorExpansionPlayerState): boolean {
  if (player.targetX === null || player.targetY === null) return false
  const owner = getCellOwner(grid, player.targetX, player.targetY)
  return owner === null || owner === player.id
}

/**
 * Computes live territory statistics for every player (see
 * ColorExpansion.md, Statistics — Territory %). Ranking ("Rank" in that
 * same section) is deliberately not computed here: it's a sort over
 * these stats, which is exactly what engine/statistics/Ranking.ts's
 * descendingBy() is for — this function only supplies the numbers to
 * rank. "Skill" is likewise omitted: Character Skills don't exist yet
 * (Phase 7).
 */
export function computeColorExpansionStats(
  state: ColorExpansionState,
): Record<string, ColorExpansionStats> {
  const totalCells = state.grid.size * state.grid.size
  const cellCounts = new Map<string, number>()
  for (const player of state.players) cellCounts.set(player.id, 0)

  for (let y = 0; y < state.grid.size; y++) {
    for (let x = 0; x < state.grid.size; x++) {
      const owner = state.grid.cells[y][x]
      if (owner !== null && cellCounts.has(owner)) {
        cellCounts.set(owner, (cellCounts.get(owner) ?? 0) + 1)
      }
    }
  }

  const stats: Record<string, ColorExpansionStats> = {}
  for (const player of state.players) {
    const cellCount = cellCounts.get(player.id) ?? 0
    stats[player.id] = {
      territoryCellCount: cellCount,
      territoryPercent: (cellCount / totalCells) * 100,
      eliminated: player.eliminated,
    }
  }
  return stats
}

/**
 * Maps a ColorExpansionState into the generic renderable shapes that
 * engine/rendering/Renderer.ts's renderGridFrame draws (see
 * Architecture.md, Rendering — "Engine renders. Simulation only supplies
 * state."). This function supplies that state in a render-ready shape;
 * it mirrors computeColorExpansionStats above, which supplies the same
 * state in a StatisticsStore-ready shape. Neither function does any
 * actual drawing — no canvas calls happen outside engine/rendering, and
 * this file never imports a rendering context.
 *
 * Square positions are given in grid-cell units, not pixels — only the
 * engine's renderGridFrame knows the arena's actual pixel size, so the
 * pixel conversion happens there, not here. A moving player's position
 * is linearly interpolated between their current cell and their
 * in-progress target using moveProgress, matching ColorExpansion.md's
 * Visual Rules — "Smooth movement" — while territory cells recolor
 * instantly the moment they're claimed ("Instant cell recolor"), which
 * is why the grid mapping below does no interpolation of its own: an
 * owner is simply present or not, never partial.
 */
export function mapColorExpansionStateToRenderables(state: ColorExpansionState): {
  grid: RenderableGrid
  squareCharacters: RenderableSquareCharacter[]
} {
  const colorByPlayerId = new Map(state.players.map((player) => [player.id, player.character.color]))

  const grid: RenderableGrid = {
    size: state.grid.size,
    cells: state.grid.cells.map((row) =>
      row.map((ownerId) => (ownerId === null ? null : (colorByPlayerId.get(ownerId) ?? null))),
    ),
  }

  const squareCharacters: RenderableSquareCharacter[] = state.players.map((player) => ({
    character: player.character,
    x: lerp(player.x, player.targetX ?? player.x, player.moveProgress),
    y: lerp(player.y, player.targetY ?? player.y, player.moveProgress),
  }))

  return { grid, squareCharacters }
}
