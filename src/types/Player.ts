import type { Character } from './Character'

/**
 * A Player is a Character assigned to one of the simulation's 2–4 slots
 * (see Engine.md, Menu).
 *
 * This type only holds what every simulation shares. Simulation-specific
 * state (HP, territory, damage, rotation speed, etc.) belongs in that
 * simulation's own folder instead — see Architecture.md.
 */
export interface Player {
  /** Stable identifier for this player within a single simulation run. */
  id: string

  /** Which of the 2–4 slots this player occupies. */
  slot: number

  /** The character this player is using for the run. */
  character: Character
}
