# Simulation - Color Expansion

## Objective

Capture more territory than every other character.

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

## Objective

Expand into neutral cells.

When no neutral cells remain:

Winner = player with the highest territory percentage.

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

---

### Heavy

- Moves normally.
- Captures two cells in its movement direction.

Example

```
□ → ■ → ■
```

---

### Swift

- Increased movement speed.

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

---

### Trickster

Continuously receives random movement bonuses.

Possible effects

- Faster movement.
- Temporary burst.
- Random path preference.

Effects are chosen randomly throughout the simulation.

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
- No particles.
- No screen shake.
- No camera movement.
- No recapturing.

---

## TODO

- Final grid size.
- Final movement speed.
- Future Character Skills.
