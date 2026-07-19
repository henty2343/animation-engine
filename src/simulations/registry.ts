import type { SimulationDescriptor } from '../types/SimulationDescriptor'

/**
 * The simulation registry (see characters/Characters.ts for the
 * equivalent pattern on the Character side). Lists every simulation
 * available for selection in the Menu, by metadata only — see
 * SimulationDescriptor.ts for why no gameplay implementation is
 * referenced here.
 *
 * Both entries below are fully documented (see docs/ColorExpansion.md and
 * docs/WeaponClash.md). Color Expansion is fully implemented (Phase 6/7).
 * Weapon Clash's gameplay MVP is now implemented (Phase 8 — see
 * Roadmap.md); Character Skills for Weapon Clash remain out of scope
 * until Phase 10.
 */
export const COLOR_EXPANSION: SimulationDescriptor = {
  id: 'color-expansion',
  name: 'Color Expansion',
  description: 'Capture more territory than every other character.',
}

export const WEAPON_CLASH: SimulationDescriptor = {
  id: 'weapon-clash',
  name: 'Weapon Clash',
  description: 'Be the last surviving character.',
}

/** Every simulation available for selection, keyed by id. */
export const SIMULATION_REGISTRY: Readonly<Record<string, SimulationDescriptor>> = {
  [COLOR_EXPANSION.id]: COLOR_EXPANSION,
  [WEAPON_CLASH.id]: WEAPON_CLASH,
}

/** Looks up a simulation by id. Returns undefined if no such simulation exists. */
export function getSimulationById(id: string): SimulationDescriptor | undefined {
  return SIMULATION_REGISTRY[id]
}

/** Every simulation available for selection, as a list. */
export function listSimulations(): SimulationDescriptor[] {
  return Object.values(SIMULATION_REGISTRY)
}
