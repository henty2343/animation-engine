import type { Simulation } from '../../types/Simulation'
import type { Player } from '../../types/Player'
import { lerp } from '../../shared/Math'
import { Random } from '../../shared/Random'
import type { RenderableGrid, RenderableSquareCharacter } from '../../engine/rendering/Renderer'
import {
  createGrid,
  getCellOwner,
  claimCell,
  hasAnyNeutralCell,
  isInsideGrid,
  findPathChoiceTowardNearestNeutralCell,
  type GridState,
} from './Grid'
import { COLOR_EXPANSION_CONFIG } from './Config'
import { getSkillHooks, advanceSkillState, getInitialTricksterBonus, type TricksterBonus } from './Skills'

/**
 * Color Expansion (see docs/ColorExpansion.md). Phase 6 implemented
 * Grid, Players, Movement, Territory capture, Elimination, and the Win
 * condition. Phase 7 adds Character Skills exactly as documented in
 * ColorExpansion.md's own Skill Hooks section and Skills.ts, on top of
 * that same gameplay — no mechanic introduced here is new, only modified
 * by whichever hooks a given player's character implements (see
 * Skills.md, Contract — "modifies an existing mechanic; never introduces
 * a new one").
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

  /**
   * Total simulated time (ms) this player has been active — i.e. not
   * eliminated. Never decremented, and frozen the instant a player is
   * eliminated (see advanceSkillState in Skills.ts). Pure bookkeeping for
   * skills whose effect depends on elapsed time — Sleeper's sleep/rush
   * cycle and Trickster's reroll timer (see Skills.ts) — updated
   * centrally by this file's update(), never by a Skill hook itself,
   * since hooks may read state but never mutate it (see Skills.md,
   * Contract).
   */
  activeTimeMs: number

  /**
   * Trickster's currently active bonus (see ColorExpansion.md,
   * Trickster), or `null` for every other character. Rolled once at
   * spawn and rerolled on a timer by Skills.ts's `advanceSkillState` —
   * never chosen by the `modifySpeed`/`modifyPathChoice` hooks
   * themselves, which only ever read whichever bonus is already active.
   */
  tricksterActiveBonus: TricksterBonus | null
}

export interface ColorExpansionState {
  grid: GridState
  players: ColorExpansionPlayerState[]

  /**
   * This run's seeded RNG (see shared/Random.ts). Unused before Phase 7
   * — `createInitialState` previously ignored its `seed` parameter
   * entirely, since every Phase 6 rule (spawn corners, BFS pathfinding)
   * was fully deterministic without randomness. Trickster's bonus rolls
   * (initial and rerolled) and Path Preference's tie-break draw are the
   * first consumers (see Skills.ts) — constructed once per run, from
   * that run's own seed, per Random.ts's own doc comment ("Each run
   * should construct its own instance from that run's seed").
   */
  random: Random
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
 * players simply uses the first N of them.
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
 */
export function createColorExpansionSimulation(
  players: Player[],
): Simulation<ColorExpansionState> {
  return {
    createInitialState(seed: number): ColorExpansionState {
      const random = new Random(seed)

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
          activeTimeMs: 0,
          // Rolled here, in fixed player-slot order, so a given seed +
          // roster always draws Trickster's first bonus identically.
          tricksterActiveBonus: getInitialTricksterBonus(player.character, random),
        }
      })

      return { grid, players: playerStates, random }
    },

    update(state: ColorExpansionState, deltaTimeMs: number): ColorExpansionState {
      // Skill bookkeeping (activeTimeMs, Trickster's reroll) advances
      // first, so anything a player's movement this same tick reads
      // (Sleeper's phase, Trickster's active bonus) already reflects
      // this tick — see advanceSkillState's own doc comment.
      advanceSkillState(state.players, deltaTimeMs, state.random)

      // Fixed processing order (player slot order, as given in `players`)
      // so that if two players' independently-computed targets are ever
      // the same neutral cell, whichever player is processed first in a
      // given tick claims it first — the same seed/roster always resolves
      // that race the same way. This mirrors Grid.ts's fixed neighbor
      // order for the same reason, and is also what keeps Trickster's
      // Path Preference draws from `state.random` deterministic (see
      // Skills.ts).
      for (const player of state.players) {
        if (player.eliminated) continue
        advancePlayer(state, player, deltaTimeMs)
      }

      return state
    },

    isComplete(state: ColorExpansionState): boolean {
      if (state.players.every((p) => p.eliminated)) return true
      return !hasAnyNeutralCell(state.grid)
    },
  }
}

/**
 * Advances one player by one fixed timestep: applies that character's
 * `modifySpeed` hook (if any) to get this tick's actual movement speed,
 * moves them toward their current target cell — capturing it, and any
 * cells their `modifyCapture` hook proposes, on arrival — and picks a
 * fresh target (via their `modifyPathChoice` hook, if any) whenever they
 * don't have a valid one. A missing hook is identity throughout: with no
 * skill hooks at all, this is exactly Phase 6's advancePlayer.
 */
function advancePlayer(
  state: ColorExpansionState,
  player: ColorExpansionPlayerState,
  deltaTimeMs: number,
): void {
  const hooks = getSkillHooks(player.character)

  const baseSpeed = COLOR_EXPANSION_CONFIG.get('movementSpeedCellsPerSecond')
  const speedCellsPerSecond = hooks?.modifySpeed
    ? hooks.modifySpeed(player.character, { player }, baseSpeed)
    : baseSpeed

  let remainingMovement = (speedCellsPerSecond * deltaTimeMs) / 1000

  while (remainingMovement > 0) {
    if (!hasValidTarget(state.grid, player)) {
      const choice = findPathChoiceTowardNearestNeutralCell(state.grid, player.id, player.x, player.y)
      if (choice === null) {
        player.eliminated = true // see ColorExpansion.md, Elimination
        return
      }

      const step = hooks?.modifyPathChoice
        ? hooks.modifyPathChoice(
            player.character,
            { player, candidates: choice.candidates, random: state.random },
            choice.defaultStep,
          )
        : choice.defaultStep

      player.targetX = step.x
      player.targetY = step.y
      player.moveProgress = 0
    }

    const progressNeeded = 1 - player.moveProgress
    if (remainingMovement >= progressNeeded) {
      remainingMovement -= progressNeeded

      const previousX = player.x
      const previousY = player.y

      // Arrive. `targetX`/`targetY` are guaranteed non-null here because
      // hasValidTarget()/the assignment above always set them together.
      player.x = player.targetX as number
      player.y = player.targetY as number

      if (getCellOwner(state.grid, player.x, player.y) === null) {
        claimCell(state.grid, player.x, player.y, player.id) // see ColorExpansion.md, Territory
      }

      if (hooks?.modifyCapture) {
        const directionX = player.x - previousX
        const directionY = player.y - previousY
        const extraCells = hooks.modifyCapture(
          player.character,
          { player, enteredX: player.x, enteredY: player.y, directionX, directionY },
          [],
        )

        for (const cell of extraCells) {
          // The hook only proposes candidates — validating that a
          // candidate is actually inside the grid and still neutral
          // happens here, never inside the hook itself (see Skills.md,
          // Contract: a hook returns a modified value, it never mutates
          // state directly). Heavy's own out-of-grid case is exactly
          // this check failing (see Progress.md, Pre-Phase 7 session).
          if (
            isInsideGrid(state.grid, cell.x, cell.y) &&
            getCellOwner(state.grid, cell.x, cell.y) === null
          ) {
            claimCell(state.grid, cell.x, cell.y, player.id)
          }
        }
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
 * it and pick a fresh path instead of trying to enter it.
 */
function hasValidTarget(grid: GridState, player: ColorExpansionPlayerState): boolean {
  if (player.targetX === null || player.targetY === null) return false
  const owner = getCellOwner(grid, player.targetX, player.targetY)
  return owner === null || owner === player.id
}

/**
 * Computes live territory statistics for every player (see
 * ColorExpansion.md, Statistics — Territory %). Ranking ("Rank" in that
 * same section) is a sort over these stats, handled by
 * engine/statistics/Ranking.ts's descendingBy() — this function only
 * supplies the numbers to rank.
 *
 * ColorExpansion.md's Statistics section also lists "Skill" as a
 * per-player field. This is deliberately not added as a stat line here:
 * with each Character mapped to exactly one Color Expansion skill (see
 * Characters.md), "Skill" and "Character" are the same value today, and
 * that Character's name is already shown directly by StatsPanel /
 * WinnerScreen next to its color swatch — a redundant "Skill: Heavy"
 * text line next to "Heavy" would just repeat it. Flagged in
 * Progress.md for review rather than guessed at silently.
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
 * state."). Unchanged in Phase 7: no skill modifies rendering itself
 * (see Skills.md, Contract — a hook "modifies an existing mechanic," and
 * movement/capture/path-choice are the only mechanics any Color
 * Expansion skill touches — see ColorExpansion.md, Character Skills:
 * "Every Skill modifies movement").
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
