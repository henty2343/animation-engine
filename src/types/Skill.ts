import type { Character } from './Character'

/**
 * The generic shape every Skill hook follows, per the contract in
 * Skills.md:
 *
 * - Reads the character and the current hook context.
 * - Returns a modified value — it never mutates state directly.
 * - Never depends on another character's skill.
 * - Is passive only — no active abilities, no cooldowns, no player input.
 * - Modifies an existing mechanic; it never introduces a new one.
 *
 * `TContext` is whatever a given hook needs to do its job, and `TValue` is
 * whatever existing mechanic the skill modifies (movement speed, damage,
 * rotation speed, path choice, etc.). Each simulation builds its own local
 * hook interface out of this generic shape (see Skills.md, Contract) — a
 * character implements zero, one, or several of that interface's optional
 * hooks, translated into that simulation's own mechanics (see Skills.md,
 * Per Simulation).
 *
 * `TContext` is deliberately not required to be the simulation's entire
 * state. A simulation is free to define a small, hook-specific context
 * (e.g. the acting player plus whatever that one mechanic needs) rather
 * than handing every hook the full state — see docs/ColorExpansion.md's
 * Skill Hooks section and src/simulations/ColorExpansion/Skills.ts for an
 * example of exactly that. Narrowing `TContext` this way is what actually
 * enforces "never depends on another character's skill" above: a hook
 * that structurally never receives another player's state cannot depend
 * on it. This file intentionally knows nothing about any specific hook
 * name, mechanic, or context shape; those live entirely in each
 * simulation's own Skills.ts.
 *
 * (Renamed from `TState` to `TContext` after Phase 7 — see Progress.md,
 * Pre-Phase 8. The old name suggested every hook received the whole
 * simulation state, which was never true and was never the intent; this
 * is a naming clarification only, with no change in behavior.)
 */
export type Skill<TContext, TValue> = (
  character: Character,
  context: TContext,
  baseValue: TValue,
) => TValue
