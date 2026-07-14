# Skills

Skills are the only place character behaviour is implemented. Characters themselves never contain behaviour — see Characters.md.

## Contract

Every simulation's Skills.ts implements exactly one skill per character, following the same shape:

- A skill reads the character and the current simulation state.
- A skill returns a modified value. It never mutates simulation state directly.
- A skill never depends on another character's skill.
- A skill is passive only — no active abilities, no cooldowns, no player-triggered input.
- A skill modifies an existing mechanic. It never introduces an entirely new mechanic.

## Per Simulation

The same four characters (Heavy, Swift, Sleeper, Trickster) are reimplemented per simulation, translated into that simulation's own mechanics. The character stays recognizable; the mechanical effect does not have to be identical. See Characters.md for what each skill does in each simulation.

## Adding a Skill to a New Simulation

- Use the same characters unless Todo.md specifies a new one.
- Document the skill in the new simulation's own document before implementing it.
- Update Characters.md with the new simulation's column.
