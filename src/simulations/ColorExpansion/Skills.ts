import type { Character } from '../../types/Character'
import type { Skill } from '../../types/Skill'
import type { Random } from '../../shared/Random'
import type { CellCoordinate } from './Grid'
import type { ColorExpansionPlayerState } from './ColorExpansion'
import { HEAVY, SWIFT, SLEEPER, TRICKSTER } from '../../characters/Characters'
import { COLOR_EXPANSION_CONFIG } from './Config'

/**
 * Color Expansion's local hook interface (see docs/Skills.md, Contract —
 * "Every simulation defines its own local hook interface... built from
 * the shared Skill<TContext, TValue> function shape"; docs/ColorExpansion.md,
 * Skill Hooks). Hook names here belong only to Color Expansion — nothing
 * in this file is shared with, inherited by, or expected to match Weapon
 * Clash's own (future) hook interface (see Skills.md).
 *
 * Every hook is optional per Skills.md's contract: a character only
 * implements the hooks its skill actually modifies (see the four
 * per-character hook objects below). Wherever ColorExpansion.ts calls a
 * hook, a missing hook is treated as identity — see `getSkillHooks` and
 * its call sites in ColorExpansion.ts.
 *
 * `TContext` for each hook below is not the full `ColorExpansionState` —
 * it is a small, hook-specific context type this simulation defines for
 * that one call site (the acting player, plus whatever that particular
 * mechanic needs). This is exactly what `/src/types/Skill.ts`'s own docs
 * mean by `TContext` being deliberately not required to be the entire
 * simulation state: a shape defined by this simulation, for its own use,
 * never dictated by /types. Handing the *entire* simulation state to
 * every hook would let a hook read (or appear to depend on) every other
 * player's state, in tension with Skills.md's "never depends on another
 * character's hook" rule — a narrow, hook-specific context makes that
 * impossible by construction.
 *
 * (This file's hook context types predate the rename of the shared type
 * from `Skill<TState, TValue>` to `Skill<TContext, TValue>` — see
 * Progress.md, Pre-Phase 8. No behavior changed; only the generic
 * parameter's name did.)
 *
 * One documented judgment call: `modifyPathChoice`'s context includes
 * the simulation's seeded `Random` (see ColorExpansionState.random in
 * ColorExpansion.ts). ColorExpansion.md describes Trickster's Path
 * Preference bonus only as "biases which equally-shortest path is
 * chosen" without specifying a mechanism — drawing from the shared
 * seeded RNG is the simplest deterministic reading, reuses the same
 * Random instance Trickster's bonus-reroll timer already consumes (see
 * `advanceSkillState` below), and stays fully deterministic because
 * ColorExpansion.ts already processes players in a fixed order (see its
 * own doc comment, established in Phase 6) — the same seed and roster
 * always draw from `random` in the same sequence. Flagged in
 * Progress.md, same as Phase 6's other tie-break judgment calls. This
 * pattern — a hook consuming, but never assigning or reseeding, the
 * simulation's single RNG — is now written down as a general rule in
 * Skills.md's own Randomness section, rather than living only as this
 * one-off judgment call.
 */

/** Trickster's two possible active bonuses (see ColorExpansion.md, Trickster). */
export type TricksterBonus = 'speed' | 'pathPreference'

/** Context for `modifySpeed` — called once per non-sleeping-check player per tick, before movement is applied (see ColorExpansion.md, Skill Hooks). */
export interface ModifySpeedContext {
  player: ColorExpansionPlayerState
}

/** Context for `modifyCapture` — called once, immediately after a player claims the cell they moved into (see ColorExpansion.md, Skill Hooks). */
export interface ModifyCaptureContext {
  player: ColorExpansionPlayerState
  /** The cell the player just entered (and already claimed, if it was neutral). */
  enteredX: number
  enteredY: number
  /** Unit step (-1, 0, or 1 on each axis) from the player's previous cell to `enteredX`/`enteredY`. */
  directionX: number
  directionY: number
}

/** Context for `modifyPathChoice` — called whenever a player needs to choose a new target (see ColorExpansion.md, Skill Hooks). */
export interface ModifyPathChoiceContext {
  player: ColorExpansionPlayerState
  /**
   * Every first step lying on some shortest path this tick, in the fixed
   * up/right/down/left order (see Grid.ts,
   * findPathChoiceTowardNearestNeutralCell). Always includes the
   * `baseValue` passed to this hook as one of its entries.
   */
  candidates: ReadonlyArray<CellCoordinate>
  /** The simulation's seeded RNG (see the judgment call above) — read-only from a hook's perspective; only ever advanced via `.pick()`/`.chance()`. */
  random: Random
}

export interface ColorExpansionSkillHooks {
  modifySpeed?: Skill<ModifySpeedContext, number>
  modifyCapture?: Skill<ModifyCaptureContext, ReadonlyArray<CellCoordinate>>
  modifyPathChoice?: Skill<ModifyPathChoiceContext, CellCoordinate>
}

/**
 * Heavy (see ColorExpansion.md, Heavy — "Capture two cells"): moves
 * normally, and additionally attempts to capture the next cell in the
 * direction it just moved. `ColorExpansion.ts` is responsible for
 * validating the proposed cell (inside the grid, still neutral) before
 * actually claiming it — this hook only proposes candidates, per
 * Skills.md's "never mutates state directly" (see Progress.md,
 * Pre-Phase 7 session — "if the additional capture cell falls outside
 * the grid, the extra capture attempt simply does nothing").
 */
const HEAVY_HOOKS: ColorExpansionSkillHooks = {
  modifyCapture: (_character, context, baseValue) => [
    ...baseValue,
    { x: context.enteredX + context.directionX, y: context.enteredY + context.directionY },
  ],
}

/** Swift (see ColorExpansion.md, Swift — "Increased movement speed"). */
const SWIFT_HOOKS: ColorExpansionSkillHooks = {
  modifySpeed: (_character, _context, baseValue) =>
    baseValue * COLOR_EXPANSION_CONFIG.get('swiftMovementMultiplier'),
}

/**
 * Sleeper (see ColorExpansion.md, Sleeper — sleep/rush cycle, "Repeat
 * until eliminated"). Implemented entirely through `modifySpeed`, as
 * ColorExpansion.md's own Skill Hooks section calls for: sleeping drives
 * speed to zero (no movement at all that tick — see ColorExpansion.ts's
 * advancePlayer, whose movement loop simply does nothing when speed is
 * 0), rushing multiplies it above base. The cycle position is computed
 * purely from `player.activeTimeMs`, a plain per-tick counter
 * ColorExpansion.ts maintains centrally (see `advanceSkillState` below)
 * — this hook only reads it, never advances it, keeping the hook itself
 * a pure function of state (see Skills.md, Contract).
 */
const SLEEPER_HOOKS: ColorExpansionSkillHooks = {
  modifySpeed: (_character, context, baseValue) => {
    const sleepMs = COLOR_EXPANSION_CONFIG.get('sleeperSleepDurationMs')
    const rushMs = COLOR_EXPANSION_CONFIG.get('sleeperRushDurationMs')
    const cycleMs = sleepMs + rushMs
    const phase = context.player.activeTimeMs % cycleMs

    if (phase < sleepMs) return 0 // sleeping — no movement this tick
    return baseValue * COLOR_EXPANSION_CONFIG.get('sleeperRushMultiplier')
  },
}

/**
 * Trickster (see ColorExpansion.md, Trickster — exactly one of Speed /
 * Path Preference active at a time, chosen by `advanceSkillState`
 * below). Both hooks only ever read `player.tricksterActiveBonus` — the
 * bonus itself is rolled and rerolled centrally, never by these hooks
 * (see Skills.md, Contract — "never mutates state directly").
 */
const TRICKSTER_HOOKS: ColorExpansionSkillHooks = {
  modifySpeed: (_character, context, baseValue) => {
    if (context.player.tricksterActiveBonus !== 'speed') return baseValue
    return baseValue * COLOR_EXPANSION_CONFIG.get('tricksterSpeedBonusMultiplier')
  },

  modifyPathChoice: (_character, context, baseValue) => {
    if (context.player.tricksterActiveBonus !== 'pathPreference') return baseValue
    return context.random.pick(context.candidates)
  },
}

const SKILL_HOOKS_BY_CHARACTER_ID: Readonly<Record<string, ColorExpansionSkillHooks>> = {
  [HEAVY.id]: HEAVY_HOOKS,
  [SWIFT.id]: SWIFT_HOOKS,
  [SLEEPER.id]: SLEEPER_HOOKS,
  [TRICKSTER.id]: TRICKSTER_HOOKS,
}

/**
 * Looks up a character's Color Expansion skill hooks. Returns `undefined`
 * for any character with no hooks defined here (there are none today,
 * since all four registry characters implement at least one hook, but
 * this keeps the lookup total and safe for a future 5th character — see
 * Todo.md, Characters — before it has a Color Expansion skill written).
 * Every call site treats a missing hook, or a missing entry entirely, as
 * identity (see Skills.md, Contract).
 */
export function getSkillHooks(character: Character): ColorExpansionSkillHooks | undefined {
  return SKILL_HOOKS_BY_CHARACTER_ID[character.id]
}

/**
 * Rolls Trickster's very first active bonus at spawn (see
 * ColorExpansion.md, Trickster — "The very first bonus is rolled
 * immediately at spawn, so Trickster is never without an active bonus").
 * `null` for every other character, whose `tricksterActiveBonus` field
 * stays unused. Called once per player from
 * ColorExpansion.ts's createInitialState, in player-slot order, so a
 * given seed + roster always draws in the same sequence.
 */
export function getInitialTricksterBonus(character: Character, random: Random): TricksterBonus | null {
  return character.id === TRICKSTER.id ? pickTricksterBonus(random) : null
}

/**
 * Uniform random pick between Trickster's two bonuses. See Todo.md,
 * Balance — "Trickster bonus odds": which bonus (if either) should be
 * favored is still undecided; ColorExpansion.md's own Trickster section
 * states uniform-random as the explicit default assumption pending that
 * decision, which is what this implements.
 */
function pickTricksterBonus(random: Random): TricksterBonus {
  return random.chance(0.5) ? 'speed' : 'pathPreference'
}

/**
 * Advances every non-eliminated player's skill-related bookkeeping by
 * one fixed tick: `activeTimeMs`, and — for Trickster only — rerolling
 * `tricksterActiveBonus` whenever the reroll timer crosses its interval
 * (see ColorExpansion.md, Trickster). This is plain, explicit state
 * mutation, not a Skill hook — it has to be, since hooks may read state
 * but must never mutate it directly (see Skills.md, Contract). Called
 * once per tick from ColorExpansion.ts's update(), before any player's
 * movement is advanced for that same tick, so a fresh reroll (or the
 * sleep/rush phase implied by the updated `activeTimeMs`) is already in
 * effect by the time `modifySpeed`/`modifyPathChoice` read it later in
 * the same tick.
 *
 * Eliminated players are skipped entirely: their `activeTimeMs` freezes
 * and Trickster's bonus stops rerolling, since neither matters once a
 * player no longer moves.
 */
export function advanceSkillState(
  players: ColorExpansionPlayerState[],
  deltaTimeMs: number,
  random: Random,
): void {
  const rerollIntervalMs = COLOR_EXPANSION_CONFIG.get('tricksterRerollIntervalMs')

  for (const player of players) {
    if (player.eliminated) continue

    const previousActiveTimeMs = player.activeTimeMs
    player.activeTimeMs += deltaTimeMs

    if (player.character.id !== TRICKSTER.id) continue

    const previousRerolls = Math.floor(previousActiveTimeMs / rerollIntervalMs)
    const currentRerolls = Math.floor(player.activeTimeMs / rerollIntervalMs)
    if (currentRerolls > previousRerolls) {
      player.tricksterActiveBonus = pickTricksterBonus(random)
    }
  }
}
