import type { Character } from '../../types/Character'

/**
 * Generic per-player display row shared by StatsPanel and WinnerScreen
 * (see Simulations.md template's Statistics / Winner Screen sections).
 * Each simulation maps its own TStats shape into this before rendering —
 * neither this type nor the components that use it know anything about
 * HP, damage, territory %, or any other simulation-specific field (see
 * engine/statistics/StatisticsStore.ts, which is generic for the same
 * reason).
 *
 * This lives alongside the components that use it rather than in
 * /src/types, mirroring RenderableCharacter in
 * engine/rendering/Renderer.ts: a display-only shape, not a simulation
 * state type.
 */
export interface PlayerStatDisplay {
  playerId: string
  character: Character
  rank: number
  eliminated: boolean
  /** Already-formatted lines, e.g. "HP: 42" or "Territory: 31%" — the simulation decides the wording. */
  statLines: string[]
}
