import type { Simulation } from '../../types/Simulation'

/**
 * Owns the simulation lifecycle and drives the engine's single tick loop
 * (see Architecture.md, Engine — "There is no separate SimulationManager
 * class"; Engine.md, Main Loop).
 *
 * This is intentionally just the foundation for Phase 1 ("no gameplay" —
 * see Roadmap.md). It does not yet:
 * - Run the requestAnimationFrame tick loop (Phase 2).
 * - Implement start/stop/restart/reset or the fixed-timestep update step
 *   (Phase 3).
 *
 * Those are added in their respective phases, on this same class — never
 * a separate one.
 */
export class SimulationEngine<TState> {
  private simulation: Simulation<TState> | null = null
  private state: TState | null = null

  /** Loads a simulation, ready to be started in a later phase. */
  load(simulation: Simulation<TState>): void {
    this.simulation = simulation
    this.state = null
  }

  /** The currently loaded simulation, if any. */
  getSimulation(): Simulation<TState> | null {
    return this.simulation
  }

  /** The current simulation state, if a run has been created. */
  getState(): TState | null {
    return this.state
  }
}
