/**
 * The Color Expansion grid (see docs/ColorExpansion.md, Arena): a square
 * grid of cells, each either neutral (`null`) or permanently owned by one
 * player (that player's id). This file owns the grid's data shape and
 * every read/write/pathfinding operation on it — nothing outside this
 * simulation's own folder needs to know how cells are stored (see
 * Architecture.md, /src/simulations: "any types used by that simulation
 * alone").
 *
 * `GridState` is deliberately not in `/src/types`: it is used by exactly
 * one simulation, which is the stated criterion in Architecture.md for
 * keeping a type local instead of shared.
 */
export interface GridState {
  /** Number of cells per side. See Config.ts for where this value comes from. */
  size: number

  /**
   * `cells[y][x]` holds the id of the player who owns that cell, or
   * `null` if the cell is still neutral (see ColorExpansion.md,
   * Arena — "Cells have two states: Neutral, Claimed").
   *
   * Mutated in place by claimCell() rather than copied on every write.
   * ColorExpansion.ts clones a GridState once per simulation run (at
   * createInitialState) and then mutates that single instance tick after
   * tick — cloning a few-hundred-cell 2D array 60 times a second purely
   * for immutability would be wasted work with no correctness benefit,
   * since nothing outside this simulation's own update() ever reads a
   * "previous" grid snapshot.
   */
  cells: (string | null)[][]
}

/** Creates a fresh `size` x `size` grid with every cell neutral. */
export function createGrid(size: number): GridState {
  return {
    size,
    cells: Array.from({ length: size }, () => Array<string | null>(size).fill(null)),
  }
}

/** Whether (x, y) lies inside the grid (see ColorExpansion.md, Movement — "Cannot leave the arena"). */
export function isInsideGrid(grid: GridState, x: number, y: number): boolean {
  return x >= 0 && x < grid.size && y >= 0 && y < grid.size
}

/** The id of the cell's owner, or `null` if the cell is neutral. */
export function getCellOwner(grid: GridState, x: number, y: number): string | null {
  return grid.cells[y][x]
}

/**
 * Assigns a cell to a player. Callers are expected to only ever call this
 * on a neutral cell (spawn, or capturing on arrival) — claimed cells
 * never change owner (see ColorExpansion.md, Territory: "Claimed cells
 * can never change owner"), and this function does not itself guard
 * against overwriting an existing owner.
 */
export function claimCell(grid: GridState, x: number, y: number, playerId: string): void {
  grid.cells[y][x] = playerId
}

/** Whether any neutral cell remains anywhere in the grid (see isComplete() in ColorExpansion.ts). */
export function hasAnyNeutralCell(grid: GridState): boolean {
  for (let y = 0; y < grid.size; y++) {
    for (let x = 0; x < grid.size; x++) {
      if (grid.cells[y][x] === null) return true
    }
  }
  return false
}

/**
 * Fixed neighbor step order used by findNextStepTowardNearestNeutralCell
 * below: up, right, down, left. No diagonals (see ColorExpansion.md,
 * Movement — "No diagonal movement").
 *
 * This order is also the deterministic tie-break rule when more than one
 * neutral cell is equally near, or more than one shortest path reaches
 * the same neutral cell: the search always explores in this same
 * direction order, so a given grid state always produces the same chosen
 * step. ColorExpansion.md's Movement section names this exact situation
 * — "If multiple paths exist, Character Skills may influence path
 * selection" — implying a well-defined default exists before any Skill
 * touches it. This fixed order is that default; Skills.ts (Phase 7) is
 * expected to bias or override it, not replace the underlying search.
 */
const NEIGHBOR_STEPS: ReadonlyArray<readonly [dx: number, dy: number]> = [
  [0, -1], // up
  [1, 0], // right
  [0, 1], // down
  [-1, 0], // left
]

/**
 * Breadth-first search for the nearest neutral cell reachable from
 * (startX, startY) by moving only through cells owned by `playerId` (own
 * territory) — enemy-owned cells are impassable walls, matching
 * ColorExpansion.md's Movement section exactly:
 *
 * - "Can move through own territory."
 * - "Cannot move through enemy territory."
 * - "Enemy territory acts as a wall."
 * - "Always move toward the nearest reachable neutral cell."
 *
 * Returns the adjacent cell that is the first step of that shortest
 * path, or `null` if no neutral cell is reachable at all — the trigger
 * for elimination (see ColorExpansion.md, Elimination).
 *
 * A neutral cell is a goal, not a passable intermediate step: entering
 * any neutral cell immediately claims it (see Territory), so a path can
 * never walk "through" an uncaptured neutral cell on the way to a
 * farther one. Only the player's own already-claimed cells are treated
 * as passable-but-not-the-destination.
 */
export function findNextStepTowardNearestNeutralCell(
  grid: GridState,
  playerId: string,
  startX: number,
  startY: number,
): { x: number; y: number } | null {
  const visited = new Set<string>()
  const cellKey = (x: number, y: number): string => `${x},${y}`
  visited.add(cellKey(startX, startY))

  interface QueueEntry {
    x: number
    y: number
    /** The adjacent cell stepped into first from (startX, startY) to reach this node. */
    firstStepX: number
    firstStepY: number
  }

  const queue: QueueEntry[] = []

  for (const [dx, dy] of NEIGHBOR_STEPS) {
    const nx = startX + dx
    const ny = startY + dy
    if (!isInsideGrid(grid, nx, ny)) continue

    const owner = getCellOwner(grid, nx, ny)
    if (owner !== null && owner !== playerId) continue // enemy territory — wall

    if (owner === null) {
      return { x: nx, y: ny } // adjacent neutral cell — nearest possible
    }

    const key = cellKey(nx, ny)
    if (!visited.has(key)) {
      visited.add(key)
      queue.push({ x: nx, y: ny, firstStepX: nx, firstStepY: ny })
    }
  }

  let head = 0
  while (head < queue.length) {
    const current = queue[head]
    head++

    for (const [dx, dy] of NEIGHBOR_STEPS) {
      const nx = current.x + dx
      const ny = current.y + dy
      if (!isInsideGrid(grid, nx, ny)) continue

      const key = cellKey(nx, ny)
      if (visited.has(key)) continue

      const owner = getCellOwner(grid, nx, ny)
      if (owner !== null && owner !== playerId) continue // enemy territory — wall

      if (owner === null) {
        return { x: current.firstStepX, y: current.firstStepY }
      }

      visited.add(key)
      queue.push({ x: nx, y: ny, firstStepX: current.firstStepX, firstStepY: current.firstStepY })
    }
  }

  return null // no reachable neutral cell
}
