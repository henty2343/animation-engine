# Skills

Skills are the only place character behaviour is implemented. Characters themselves never contain behaviour — see Characters.md.

## Contract

Every simulation defines its own local hook interface, inside that simulation's own `Skills.ts`, built from the shared `Skill<TContext, TValue>` function shape (see `/src/types/Skill.ts`).

`Skill<TContext, TValue>` defines only the generic shape of a single hook. It must never know anything about a specific mechanic — movement, capture, pathfinding, damage, weapons, grids, or any other simulation-specific concept. That knowledge lives entirely inside each simulation's own hook interface. `TContext` is deliberately not required to be the simulation's entire state — a simulation may (and Color Expansion does) define a small, hook-specific context per hook instead, containing only what that one mechanic needs (see `/src/types/Skill.ts` and ColorExpansion.md's Skill Hooks section for the established pattern).

Hook interfaces, and every hook name within them, are local to the simulation that defines them:

- Hook names belong only to the simulation that defines them. Color Expansion's hooks (see ColorExpansion.md, Skill Hooks) are not shared with, inherited by, or expected to match any other simulation's hooks. Weapon Clash will define its own hook interface, with its own names, once it is designed.
- No simulation inherits or reuses another simulation's hook names.
- The engine never depends on, references, or knows about any simulation-specific hook name. This document intentionally lists none — see each simulation's own document for its hook interface.
- Each simulation calls its own hooks, at whatever point in its own update loop is appropriate for that mechanic. The engine never calls a hook on a simulation's behalf.

Every hook on a character's hook interface is optional. A character only implements the hooks for the mechanics its skill actually modifies — a character with no reason to touch a given mechanic simply omits that hook, rather than supplying a pass-through implementation of it. Wherever a simulation calls a hook, a missing hook is treated as identity: the base value is used unmodified. This keeps a character's hook interface a direct expression of what its skill actually does, and means adding a new hook to a simulation's interface never requires editing every character that doesn't use it.

Every hook, regardless of which simulation or mechanic it belongs to, follows the same underlying rules:

- A hook reads the character and its current context.
- A hook returns a modified value. It never mutates simulation state directly.
- A hook never depends on another character's hook.
- A hook is passive only — no active abilities, no cooldowns, no player-triggered input.
- A hook modifies an existing mechanic. It never introduces an entirely new mechanic.

### Randomness

A hook may need randomness — for example, breaking a tie between otherwise-equal choices (see ColorExpansion.md, Trickster's Path Preference bonus, and `src/simulations/ColorExpansion/Skills.ts`'s `modifyPathChoice`). The rules for this:

- A hook may consume randomness from the simulation's own seeded RNG (see `/src/shared/Random.ts`) when the mechanic it modifies genuinely requires it.
- A hook must never create or seed its own RNG. A run has exactly one seeded RNG instance (see Engine.md, Determinism); every draw, inside or outside a hook, must come from that same instance, or the simulation stops being deterministic for a given seed.
- A hook must never mutate simulation state directly. Consuming a value from the shared RNG is a read, not a mutation — but any bookkeeping that depends on *when* something happens (a reroll timer, for instance) stays outside the hook, in the simulation's own plain per-tick logic, not inside the hook itself. See `src/simulations/ColorExpansion/Skills.ts`'s `advanceSkillState` for the established pattern: the hook only ever reads whichever value has already been decided; deciding it happens elsewhere.

## Per Simulation

The same four characters (Heavy, Swift, Sleeper, Trickster) are reimplemented per simulation, translated into that simulation's own mechanics via that simulation's own hook interface. The character stays recognizable; the mechanical effect does not have to be identical, and a character may implement one hook or several, depending on how many mechanics its skill touches. See Characters.md for what each skill does in each simulation.

## Adding a Skill to a New Simulation

- Use the same characters unless Todo.md specifies a new one.
- A simulation should define the smallest hook interface necessary. Introduce a new hook only when an existing hook cannot express the intended behavior.
- Document the simulation's own hook interface — and each character's implementation of it — in that simulation's own document, in its own "Skill Hooks" section, before implementing it.
- Update Characters.md with the new simulation's column.
