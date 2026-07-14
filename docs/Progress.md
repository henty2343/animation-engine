# Progress

Last updated: after Phase 1 implementation.

## Current Phase

Phase 2 — Rendering. Not started — awaiting approval to begin (see Roadmap.md, Development Rules).

## Completed Phases

### Phase 1 — Foundation

Implemented:

- Shared types: `src/types/Arena.ts`, `Character.ts`, `Player.ts`, `Simulation.ts`, `Skill.ts`
- Shared runtime utilities: `src/shared/Random.ts` (seeded deterministic PRNG), `Math.ts`, `Colors.ts`, `Constants.ts`, `Settings.ts`
- Character registry: `src/characters/Characters.ts` (Heavy, Swift, Sleeper, Trickster)
- Engine foundation: `src/engine/core/SimulationEngine.ts` — class shell only (load/get simulation/get state). The tick loop and start/stop/restart/reset lifecycle are deliberately not implemented yet; those are Phase 2 and Phase 3.

No gameplay was implemented, per the Phase 1 deliverable.

Everything else under `src/engine`, `src/menu`, `src/components`, and `src/simulations` is still an empty placeholder.

## Decisions Made Along the Way

- SimulationManager was merged into SimulationEngine — no separate class (see Architecture.md).
- Character selection: the creator selects exactly which character fills each player slot, 2–4 slots (see Engine.md, Menu).
- components/UI and components/Shared are kept, purpose not yet decided (see Architecture.md).
- Resolved a conflict in Architecture.md: the Simulation section listed `Render()` as something every simulation provides, while the Rendering section and Components section both said the engine renders and a simulation only supplies state. Confirmed with the project owner that the engine-renders reading is correct; `Render()` was removed from the Simulation section and the `Simulation` type has no render method.
- Added `Skill` to the `/src/types` list in Architecture.md — Roadmap.md's Phase 1 scope calls for a shared Skill type, and it fits the stated /types criteria (used by every simulation, no runtime logic of its own).
- Documented `/src/characters`, `/src/simulations`, and `/src/menu` in Architecture.md's Folder Structure — they already existed in the repo but weren't described there.
- Character colors in the registry are placeholder defaults from a shared palette (`CHARACTER_COLOR_PALETTE` in Colors.ts) — Characters.md specifies that characters have a color, not which exact swatches, so these can change freely without any architectural impact.

## For a New Chat

Read Blueprint.md first, then this file, before anything else.

Phase 1 files (listed above under Completed Phases) are implemented and typecheck cleanly. Everything else under `src/engine`, `src/simulations`, `src/menu`, and `src/components` is still an empty placeholder — a file existing does not mean it is implemented; check actual file contents, not just the file tree, before assuming any phase is complete.

Update "Current Phase" and "Completed Phases" above after every milestone (see Roadmap.md, Development Rules).
