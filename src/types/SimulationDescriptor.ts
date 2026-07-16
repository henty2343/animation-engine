/**
 * Minimal metadata describing a simulation for the Menu's Simulation
 * selector (see Engine.md, Menu — "Select Simulation") and the Intro
 * Screen (see each simulation doc's Intro Screen section, which displays
 * the simulation name).
 *
 * Deliberately does not include a Simulation<TState> implementation,
 * Config, or any gameplay detail — those stay in that simulation's own
 * folder (see Architecture.md, /src/simulations) and arrive once that
 * simulation is actually built (Color Expansion: Phase 6, Weapon Clash:
 * Phase 8 — see Roadmap.md). This type only exists so the Menu has
 * something to list and select before either simulation is playable.
 */
export interface SimulationDescriptor {
  /** Stable identifier used for registry lookup. Never changes. */
  id: string

  /** Display name shown in the Menu and Intro Screen. */
  name: string

  /** One-line description shown in the Menu (see each simulation's own Objective section). */
  description: string
}
