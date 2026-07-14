/**
 * A Character is reusable across every simulation (see Characters.md).
 *
 * Characters never contain behaviour — that lives in each simulation's own
 * Skills.ts (see Skills.md). This type only describes identity and
 * presentation.
 */
export interface Character {
  /** Stable identifier used for registry lookup. Never changes. */
  id: string

  /** Display name shown in the Menu and on-screen statistics. */
  name: string

  /** The character's color. Characters never change color. */
  color: string

  /** Optional icon shown in the Menu and statistics panels. */
  icon?: string
}
