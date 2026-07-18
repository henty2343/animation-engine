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
 * Fixed neighbor step order used throughout this file: up, right, down,
 * left. No diagonals (see ColorExpansion.md, Movement — "No diagonal
 * movement").
 *
 * This order is also the deterministic tie-break rule when more than one
 * neutral cell is equally near, or more than one shortest path reaches
 * the same neutral cell: distance computations always explore neighbors
 * in this same direction order, so a given grid state always produces
 * the same default choice. This fixed order is exactly the default
 * ColorExpansion.md's Movement section anticipates — "If multiple paths
 * exist, Character Skills may influence path selection" — and is what
 * `findPathChoiceTowardNearestNeutralCell` below now also exposes as a
 * full tie set for Phase 7's `modifyPathChoice` hook (see Skills.ts,
 * ColorExpansion.md's Skill Hooks) to choose among, instead of only ever
 * returning the fixed-order winner.
 */
const NEIGHBOR_STEPS: ReadonlyArray<readonly [dx: number, dy: number]> = [
  [0, -1], // up
  [1, 0], // right
  [0, 1], // down
  [-1, 0], // left
]

/**
 * Computes, for every cell reachable from some neutral cell without
 * crossing enemy territory, the shortest distance (in steps) to the
 * nearest neutral cell — via a single multi-source BFS seeded from every
 * neutral cell on the grid at once (neutral cells start at distance 0).
 * Cells owned by `playerId` are passable; cells owned by anyone else are
 * an impassable wall (see Movement — "Enemy territory acts as a wall");
 * unreached cells stay `-1`.
 *
 * This one pass is the shared foundation both
 * `findPathChoiceTowardNearestNeutralCell` (below) and, through it,
 * `findNextStepTowardNearestNeutralCell` are built on. Seeding from every
 * neutral cell simultaneously — rather than a single-source search
 * outward from the player — is what makes it possible to later ask, for
 * any given neighbor of the player, "is this exactly one step closer to
 * the nearest neutral cell?" in constant time, which is exactly what
 * detecting a *tie* between equally-shortest first steps requires (see
 * that function's own doc comment for why this reproduces the original
 * Phase 6 tie-break exactly).
 */
function computeDistanceToNearestNeutral(grid: GridState, playerId: string): number[][] {
  const { size } = grid
  const distance: number[][] = Array.from({ length: size }, () => Array(size).fill(-1))
  const queue: Array<readonly [number, number]> = []

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (grid.cells[y][x] === null) {
        distance[y][x] = 0
        queue.push([x, y])
      }
    }
  }

  let head = 0
  while (head < queue.length) {
    const [cx, cy] = queue[head]
    head++

    for (const [dx, dy] of NEIGHBOR_STEPS) {
      const nx = cx + dx
      const ny = cy + dy
      if (!isInsideGrid(grid, nx, ny)) continue
      if (distance[ny][nx] !== -1) continue

      const owner = getCellOwner(grid, nx, ny)
      if (owner !== null && owner !== playerId) continue // enemy territory — wall

      distance[ny][nx] = distance[cy][cx] + 1
      queue.push([nx, ny])
    }
  }

  return distance
}

/** A single grid cell coordinate. */
export interface CellCoordinate {
  x: number
  y: number
}

/**
 * The result of choosing a player's next step toward the nearest neutral
 * cell, including every tie (see Skills.ts, `ModifyPathChoiceContext`;
 * ColorExpansion.md, Skill Hooks — `modifyPathChoice`).
 */
export interface PathChoice {
  /**
   * The first step chosen by the fixed up/right/down/left tie-break
   * order — bit-for-bit what `findNextStepTowardNearestNeutralCell`
   * returns, and what every character without a `modifyPathChoice` hook
   * actually moves toward.
   */
  defaultStep: CellCoordinate

  /**
   * Every first step, in the same fixed order, that lies on some
   * shortest path to the nearest reachable neutral cell. Always contains
   * `defaultStep` as its first entry. A single-entry array means there
   * is no tie to break this tick (see ColorExpansion.md, Movement — "If
   * multiple paths exist, Character Skills may influence path
   * selection").
   */
  candidates: ReadonlyArray<CellCoordinate>
}

/**
 * Finds every equally-shortest first step from (startX, startY) toward
 * the nearest reachable neutral cell, plus which one the fixed tie-break
 * order picks by default (see Movement, Target Selection). Returns
 * `null` if no neutral cell is reachable at all — the trigger for
 * elimination (see ColorExpansion.md, Elimination).
 *
 * `defaultStep` here is guaranteed identical, tick for tick, to what
 * Phase 6's `findNextStepTowardNearestNeutralCell` computed on its own
 * single-source BFS: that function started a simultaneous BFS branch
 * from each of the start cell's passable neighbors (in NEIGHBOR_STEPS
 * order), processed in FIFO order, and returned whichever branch's
 * traced-back first step reached a neutral cell first — which, in an
 * unweighted grid, is exactly "the first candidate (in NEIGHBOR_STEPS
 * order) lying on a shortest overall path," precisely what `candidates[0]`
 * below identifies. Reusing `computeDistanceToNearestNeutral`'s
 * multi-source distances just makes that same fact checkable per
 * neighbor directly, instead of re-deriving it via a fresh BFS.
 */
export function findPathChoiceTowardNearestNeutralCell(
  grid: GridState,
  playerId: string,
  startX: number,
  startY: number,
): PathChoice | null {
  const distance = computeDistanceToNearestNeutral(grid, playerId)
  const distanceFromStart = distance[startY][startX]

  if (distanceFromStart === -1) return null // no reachable neutral cell

  const candidates: CellCoordinate[] = []
  for (const [dx, dy] of NEIGHBOR_STEPS) {
    const nx = startX + dx
    const ny = startY + dy
    if (!isInsideGrid(grid, nx, ny)) continue

    const owner = getCellOwner(grid, nx, ny)
    if (owner !== null && owner !== playerId) continue // enemy territory — wall

    if (distance[ny][nx] === distanceFromStart - 1) {
      candidates.push({ x: nx, y: ny })
    }
  }

  // distanceFromStart !== -1 guarantees at least one neighbor sits
  // exactly one step closer, so candidates is never empty here.
  return { defaultStep: candidates[0], candidates }
}

/**
 * Original Phase 6 single-step lookup. Now implemented directly on top
 * of `findPathChoiceTowardNearestNeutralCell` (see that function's doc
 * comment for why `defaultStep` is unchanged from Phase 6's own BFS) so
 * there is exactly one place this distance logic lives, per
 * docs/CLAUDE.md's "Never duplicate logic." Kept as its own export for
 * any caller — and any character with no `modifyPathChoice` hook — that
 * only needs the single chosen step, not the full tie set.
 */
export function findNextStepTowardNearestNeutralCell(
  grid: GridState,
  playerId: string,
  startX: number,
  startY: number,
): CellCoordinate | null {
  return findPathChoiceTowardNearestNeutralCell(grid, playerId, startX, startY)?.defaultStep ?? null
}
