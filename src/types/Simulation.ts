/**
 * The generic contract every simulation implements, so the engine can run
 * any of them the same way (see Architecture.md, Simulation; Engine.md,
 * Main Loop).
 *
 * Rendering is deliberately not part of this contract. Architecture.md's
 * Rendering section and Components section are both explicit that the
 * engine renders and a simulation only supplies state — so there is no
 * render() here. `SimulationEngine` and `engine/rendering` read a
 * simulation's `TState` and draw it; a simulation never draws itself.
 *
 * `TState` is the simulation's own state shape, defined in that
 * simulation's own folder — never here.
 */
export interface Simulation<TState> {
  /**
   * Builds the initial state for a new run from the given random seed.
   * The same seed must always produce the same initial state (see
   * Engine.md, Determinism).
   */
  createInitialState(seed: number): TState

  /**
   * Advances the simulation by one fixed timestep. Must be deterministic —
   * the same state and deltaTimeMs must always produce the same result,
   * regardless of rendering FPS or machine performance (see Engine.md,
   * Determinism).
   */
  update(state: TState, deltaTimeMs: number): TState

  /** Whether the simulation has reached its win condition. */
  isComplete(state: TState): boolean
}
