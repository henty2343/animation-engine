# Simulation - Color Expansion

## Objective

Capture more territory than every other character.

Expand into neutral cells. When no neutral cells remain, the winner is the player with the highest territory percentage.

---

## Determinism

The simulation must produce identical results when started with the same random seed.

---

## Definition of Done

Not complete until the same seed produces the same result on repeated runs.

Verify

- Same winner.
- Same final statistics.
- Same territory outcome for every player.

---

## Players

- 2–4 players.
- Represented by squares.
- Same size as one grid cell.
- Each player uses its Character color.

---

## Arena

- Perfect square grid.
- Same arena dimensions as every other simulation.
- Grid size: TODO.

Cells have two states:

- Neutral
- Claimed

Claimed cells permanently belong to one player.

---

## Spawn

- Players spawn equally spaced.
- 2 Players
  - Opposite corners.
- 3 Players
  - Three corners.
- 4 Players
  - One corner each.

Spawn cells are immediately claimed.

---

## Movement

Movement Rules

- One cell per move.
- No diagonal movement.
- Cannot leave the arena.
- Can move through own territory.
- Cannot move through enemy territory.
- Enemy territory acts as a wall.

Target Selection

- Always move toward the nearest reachable neutral cell.
- If multiple paths exist, Character Skills may influence path selection.

---

## Territory

Capturing

- Entering a neutral cell immediately claims it.
- Claimed cells change to the player's color.
- Claimed cells become permanent.
- Claimed cells can never change owner.

---

## Elimination

A player is eliminated when:

- No reachable neutral cell exists.

After elimination

- Player disappears.
- Owned territory remains.
- Territory never changes owner.

---

## Character Skills

Every Skill modifies movement.

No Skill changes the objective.

See Skills.md for the general skill contract.

---

## Skill Hooks

Color Expansion defines its own local hook interface (see Skills.md — hook names are local to each simulation; the engine never knows about them). Every hook below is optional on a character-by-character basis: a character only implements the hooks for the mechanics its skill actually modifies. Wherever Color Expansion calls a hook, a missing hook is treated as identity — the base value is used unmodified.

Color Expansion's hook interface:

- **`modifySpeed`** — modifies a player's movement speed (cells per second) for the current tick. Called once per player per tick, before movement is applied.
- **`modifyCapture`** — modifies which cell or cells a player captures on arrival, beyond the cell they moved into. Called when a player enters a cell.
- **`modifyPathChoice`** — modifies which neutral cell, or which step toward it, a player targets when more than one shortest path exists (see Movement, Target Selection). Called when a player needs to choose a new target. This hook may only influence the tie-break among equally-shortest paths — "always move toward the nearest reachable neutral cell" (see Movement) is a hard rule, not something a Skill can override, so this hook can never cause a player to choose a longer path over a shorter one.

Future hooks may be added to this interface as new Color-Expansion-specific mechanics are introduced. Adding one never requires touching a character that doesn't use it, since every hook is optional.

---

### Heavy

- Moves normally.
- Attempts to capture the next cell in its movement direction. The additional capture only succeeds if the target cell is unclaimed.

Hook: `modifyCapture`

Example

```
□ → ■ → ■
```

---

### Swift

- Increased movement speed.

Hook: `modifySpeed`

---

### Sleeper

Cycle

- Sleep: 1 second.
- Rush: 3 seconds.

Sleeping

- Does not move.

Rush

- Increased movement speed.

Repeat until eliminated.

Hook: `modifySpeed` — the sleep/rush cycle is expressed entirely through this one hook (sleeping drives speed to zero, rush drives it above base).

---

### Trickster

Rerolls a single active bonus on a fixed timer (reroll interval: see Todo.md, Balance — placeholder value). Only one bonus is active at a time. The chosen bonus remains active until the next reroll — Trickster's behaviour does not change every frame or every movement, so it stays easy to read at a glance. The very first bonus is rolled immediately at spawn, so Trickster is never without an active bonus. Every reroll draws from the simulation's seeded RNG, keeping the simulation fully deterministic.

Available bonuses (exactly one active at a time)

- **Speed** — increased movement speed for the duration of the current bonus window.
- **Path Preference** — biases which equally-shortest path is chosen when more than one exists (see Movement, Target Selection; and Skill Hooks, `modifyPathChoice` above). Never causes a longer path to be chosen over a shorter one.

Which bonus is drawn on each reroll, and the odds between them, is a placeholder value (see Todo.md, Balance) — not yet decided.

Hooks: `modifySpeed`, `modifyPathChoice` — exactly one is active at a time, depending on which bonus was most recently rolled.

---

## Simulation Loop

Repeat until no neutral cells remain:

1. Select the nearest reachable neutral cell.
2. Move one step.
3. Capture the cell if entered.
4. Update player statistics.
5. Check for eliminated players.
6. Check if the simulation has ended.

---

## Statistics

Displayed during the simulation.

For every player

- Rank
- Character
- Territory %
- Skill

Live stats remain sorted by current territory.

---

## Intro Screen

Displays

- Simulation Name
- Player count
- Characters
- Skill descriptions

Duration

- ~1–2 seconds.

---

## Winner Screen

Displays

- Final ranking.
- Territory %.
- Winning Character.
- Skills used.

Winner highlighted.

Remaining players faded.

---

## Visual Rules

- Smooth movement.
- Instant cell recolor.

---

## TODO

- Final grid size.
- Final movement speed.
- Future Character Skills.
