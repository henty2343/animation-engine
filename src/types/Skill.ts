import type { Character } from './Character'

/**
 * The generic shape every Skill hook follows, per the contract in
 * Skills.md:
 *
 * - Reads the character and the current simulation state.
 * - Returns a modified value — it never mutates state directly.
 * - Never depends on another character's skill.
 * - Is passive only — no active abilities, no cooldowns, no player input.
 * - Modifies an existing mechanic; it never introduces a new one.
 *
 * `TState` is the simulation's own state type and `TValue` is whatever
 * existing mechanic the skill modifies (movement speed, damage, rotation
 * speed, path choice, etc.). Each simulation builds its own local hook
 * interface out of this generic shape (see Skills.md, Contract) — a
 * character implements zero, one, or several of that interface's optional
 * hooks, translated into that simulation's own mechanics (see Skills.md,
 * Per Simulation). This file intentionally knows nothing about any
 * specific hook name or mechanic; those live entirely in each
 * simulation's own Skills.ts.
 */
export type Skill<TState, TValue> = (
  character: Character,
  state: TState,
  baseValue: TValue,
) => TValue
