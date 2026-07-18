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
 *
 * Mutation: `update()`'s signature — taking a `TState` and returning a
 * `TState` — reads as though it must be a pure function that always
 * builds a new object, but that is not required. A simulation is free to
 * mutate the `state` object it's given in place and return that same
 * reference. This is what Color Expansion's own `update()` already does
 * (see ColorExpansion.ts and GridState's own doc comment for why:
 * cloning a few-hundred-field state object on every one of 60 ticks a
 * second, purely for immutability's sake, would be wasted work with no
 * correctness benefit, since nothing outside a simulation's own
 * `update()` ever needs a "previous" state snapshot). Callers of this
 * interface — `SimulationEngine` included — must never assume the
 * reference returned by `update()` is a new object, and must never hold
 * onto a previously-returned `TState` expecting it to still reflect an
 * earlier tick once `update()` has been called again.
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
   *
   * Implementations may mutate `state` in place and return the same
   * reference, or build and return a new object instead — both are valid
   * (see this file's own doc comment, Mutation, above). Immutable updates
   * are not required.
   */
  update(state: TState, deltaTimeMs: number): TState

  /** Whether the simulation has reached its win condition. */
  isComplete(state: TState): boolean
}
