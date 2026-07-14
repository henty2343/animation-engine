import type { Character } from '../types/Character'
import { CHARACTER_COLOR_PALETTE } from '../shared/Colors'

/**
 * The character library (see Characters.md). Colors below are placeholder
 * defaults from the shared palette — Characters.md doesn't specify exact
 * swatches, only that each character has a color and never changes it.
 * They can be swapped freely without any architectural impact.
 *
 * Character #5 (see Todo.md, Characters) is not yet designed and is not
 * included here.
 */
export const HEAVY: Character = {
  id: 'heavy',
  name: 'Heavy',
  color: CHARACTER_COLOR_PALETTE[0],
}

export const SWIFT: Character = {
  id: 'swift',
  name: 'Swift',
  color: CHARACTER_COLOR_PALETTE[1],
}

export const SLEEPER: Character = {
  id: 'sleeper',
  name: 'Sleeper',
  color: CHARACTER_COLOR_PALETTE[2],
}

export const TRICKSTER: Character = {
  id: 'trickster',
  name: 'Trickster',
  color: CHARACTER_COLOR_PALETTE[3],
}

/** Every character available for selection, keyed by id. */
export const CHARACTER_REGISTRY: Readonly<Record<string, Character>> = {
  [HEAVY.id]: HEAVY,
  [SWIFT.id]: SWIFT,
  [SLEEPER.id]: SLEEPER,
  [TRICKSTER.id]: TRICKSTER,
}

/** Looks up a character by id. Returns undefined if no such character exists. */
export function getCharacterById(id: string): Character | undefined {
  return CHARACTER_REGISTRY[id]
}

/** Every character available for selection, as a list. */
export function listCharacters(): Character[] {
  return Object.values(CHARACTER_REGISTRY)
}
