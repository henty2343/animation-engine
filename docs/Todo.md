# Project TODO

Items here are undecided or unsequenced. Once an item is decided and given a phase, move it into Roadmap.md and remove it from here.

## Characters

- Design Character #5.

---

## Simulations

Planned

- Color Expansion
- Weapon Clash

Future

- Simulation #3
- Simulation #4
- Simulation #5

---

## Weapons

Planned Variants

- Sword
- Axe
- Bow
- Spear

Future

- Additional procedural weapon types.

---

## Balance

Color Expansion

- Grid dimensions. — Temporary placeholder: 20×20 cells (see `src/simulations/ColorExpansion/Config.ts`, `gridSize`). Not playtested; expected to change once the project owner plays a real run.
- Base movement speed. — Temporary placeholder: 4 cells/second (see `src/simulations/ColorExpansion/Config.ts`, `movementSpeedCellsPerSecond`). Not playtested; expected to change.
- Swift movement multiplier. — Temporary placeholder: 1.5× (see `ColorExpansion/Config.ts`, `swiftMovementMultiplier`). Implemented in Phase 7; not playtested.
- Sleeper sleep duration. — Temporary placeholder: 1000ms (see `ColorExpansion/Config.ts`, `sleeperSleepDurationMs`), matching the design intent already noted here (1 second). Implemented in Phase 7; not playtested.
- Sleeper rush duration. — Temporary placeholder: 3000ms (see `ColorExpansion/Config.ts`, `sleeperRushDurationMs`), matching the design intent already noted here (3 seconds). Implemented in Phase 7; not playtested.
- Sleeper rush multiplier. — Temporary placeholder: 2.5× (see `ColorExpansion/Config.ts`, `sleeperRushMultiplier`). No prior design intent existed for this one — this is Phase 7's own unreviewed placeholder.
- Trickster reroll interval. — Temporary placeholder: 5000ms (see `ColorExpansion/Config.ts`, `tricksterRerollIntervalMs`), matching the design intent already noted here (roughly 5 seconds). Implemented in Phase 7; not playtested.
- Trickster bonus odds. — Implemented as a uniform random pick between Speed and Path Preference (see `Skills.ts`, `pickTricksterBonus`), matching the default assumption already noted here. Still unreviewed — which bonus (if either) should be favored remains undecided; this is simply what Phase 7 shipped with.
- Trickster speed bonus multiplier. — Temporary placeholder: 1.5× (see `ColorExpansion/Config.ts`, `tricksterSpeedBonusMultiplier`). Implemented in Phase 7; not playtested.

All nine Color Expansion balance values above are now implemented, but every one is an unplaytested/unreviewed placeholder — the same status `gridSize` and `movementSpeedCellsPerSecond` have carried since Phase 6. All are expected to change once the project owner plays/watches real Phase 7 runs.

Weapon Clash

- Base rotation speed. — Temporary placeholder: 6 rad/s (see `src/simulations/WeaponClash/Config.ts`, `rotationSpeedRadiansPerSecond`). Tuned up from an initial, much slower first guess (1.5 rad/s) after a headless smoke test showed weapon↔player contact was so rare a 2-player match sometimes didn't resolve within 20 simulated minutes — see Progress.md, Phase 8 judgment calls. Still not playtested by the project owner.
- Base damage. — Not a placeholder: WeaponClash.md states this literally ("Damage = 1"), implemented as `baseDamage: 1` in `Config.ts`.
- Weapon lengths. — Temporary placeholder: 100px (see `Config.ts`, `weaponLength`). Same retuning story as rotation speed above. Not playtested.
- Player radius. — Temporary placeholder: 18px (see `Config.ts`, `playerRadius`). Not explicitly tracked here before Phase 8, but needed for the same reason `gridSize` was for Color Expansion — flagged here now as a new placeholder.
- Movement speed. — Temporary placeholder: 180px/s (see `Config.ts`, `movementSpeedPixelsPerSecond` — renamed from `spawnVelocityMagnitude`; no numeric value changed). Same retuning story as rotation speed above. Not playtested. Now also a core gameplay rule, not just a spawn-time value: every living player's velocity is re-normalized back to exactly this speed at the end of every tick's physics, so speed never drifts from collisions — see `docs/WeaponClash.md`, Movement Speed, and `docs/Progress.md`, "Pre-Phase 9 — Constant Movement Speed."
- Hit Freeze duration. — Not a placeholder: WeaponClash.md states this literally ("0.1 seconds"), implemented as `hitFreezeDurationMs: 100` in `Config.ts`. Implemented in Phase 9.
- Weapon variant selection (Sword/Axe/Bow/Spear). — Still undecided; Phase 8 draws one generic weapon (a line) regardless of variant, since no Menu UI exists yet to choose one and no documented mechanic depends on which is drawn. See `WeaponClash.md`'s own TODO.
- Weapon-weapon collision repeat rate. — Not a numeric placeholder, but an open judgment call flagged in Phase 9: unlike Weapon Hit's documented "must fully leave before hitting again" cooldown, WeaponClash.md specifies no equivalent cooldown for Weapon Collision (weapon↔weapon). Phase 9 therefore re-checks and re-responds (bounce + reverse rotation) every tick the two weapons are found overlapping, which — for a pair whose overlap persists across several consecutive ticks — could reverse rotation direction repeatedly in quick succession. Not implemented as a bug fix since no cooldown is documented; flagged here for review in case a "must fully leave" rule is intended for weapon collision too, mirroring Weapon Hit's.
- Weapon balancing. — Still open; all placeholders above are unplaytested and expected to change once the project owner watches real runs.
- **New finding from Phase 9 verification: a stable non-colliding 2-player stalemate is reachable at today's placeholder values.** A headless smoke test (4 players, seed 1) found the last two survivors settling into a stable, nearly-periodic orbit at a separation of ~139–140px — just outside the ~136px maximum weapon reach (`playerRadius + weaponLength + playerRadius` = `18 + 100 + 18`) — and the match still hadn't resolved after 90 simulated minutes. See `docs/Progress.md`'s Phase 9 Verification section for the full account. Not a bug: determinism, arena bounds, and every Phase 9 mechanic all checked out correctly; this is an emergent consequence of the constant-movement-speed elastic-bounce physics combined with today's specific `playerRadius`/`weaponLength`/`movementSpeedPixelsPerSecond` values, and a more extreme case of the same already-flagged "matches can take a very long time to resolve" issue from Phase 8. No anti-stalemate mechanic is documented anywhere in WeaponClash.md, so none was invented here (see docs/CLAUDE.md, "If Requirements Are Missing"). Worth the project owner's attention when rebalancing the placeholders above — closing the gap between the observed stable-orbit distance (~140px) and weapon reach (136px) even slightly would likely eliminate this specific stalemate.

---

## Visual / Rendering

Color Expansion

- Player square size. — Temporary placeholder: 70% of one grid cell (see `playerSquareCellRatio` in `src/simulations/ColorExpansion/Config.ts`). Not gameplay logic, but still a Color-Expansion-specific tuning value, so it lives in that simulation's own Config alongside `gridSize`/`movementSpeedCellsPerSecond` rather than as a hardcoded number in `engine/rendering/Renderer.ts`. The value itself (0.7) is still unreviewed and expected to change if a different visual treatment is preferred — only its location was settled this session.
- Intro Screen skill descriptions. — ColorExpansion.md's Intro Screen section calls for skill descriptions to be shown alongside each character; `src/App.tsx` still doesn't pass any `skillDescriptions` into `IntroScreen` (that prop exists but is unused). Deferred out of Phase 7's scope — Phase 7 was scoped to gameplay (Roadmap.md: "Implement: Heavy, Swift, Sleeper, Trickster... Implement exactly as documented"), not UI wiring — and is a natural fit for Phase 11 (Shared Polish) instead. Flagged in Progress.md.

Weapon Clash

- Hit Freeze damage flash color. — Temporary placeholder: solid white (see `HIT_FLASH_COLOR` in `src/engine/rendering/CharacterRenderer.ts`). WeaponClash.md itself says "white (or another hit effect)," so this is an explicit default, not a guess — but the exact shade/effect (solid fill vs. outline vs. brief scale pulse) is still open for Phase 11 (Shared Polish) visual review.

---

## Future Features

- Custom Characters.
- Character editor.
- Additional simulation settings.
