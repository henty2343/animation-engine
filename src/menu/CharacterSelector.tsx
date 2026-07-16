import type { Character } from '../types/Character'
import { MIN_PLAYERS, MAX_PLAYERS } from '../shared/Constants'
import { SelectableTile } from '../components/Shared/SelectableTile'

interface CharacterSelectorProps {
  availableCharacters: Character[]
  playerCount: number
  onPlayerCountChange: (count: number) => void
  /** Character id per slot, length === playerCount. */
  slots: (string | null)[]
  onSelectSlot: (slot: number, characterId: string) => void
}

const PLAYER_COUNT_OPTIONS = Array.from(
  { length: MAX_PLAYERS - MIN_PLAYERS + 1 },
  (_, i) => MIN_PLAYERS + i,
)

/**
 * Lets the creator choose how many players (2-4) and which Character
 * fills each slot (see Engine.md, Menu — "Select participating characters
 * (2-4, one per player slot)").
 *
 * Each Character may only occupy one slot at a time: picking an
 * already-used Character for another slot is disabled here, and
 * Menu.tsx swaps the two slots' assignments instead of allowing a
 * duplicate. Two players sharing one Character would also mean sharing
 * one color (see Characters.md — "Characters never change color"),
 * which would make them indistinguishable on screen. This uniqueness
 * rule isn't stated explicitly anywhere in the docs — flagged in
 * Progress.md as a judgment call for review.
 */
export function CharacterSelector({
  availableCharacters,
  playerCount,
  onPlayerCountChange,
  slots,
  onSelectSlot,
}: CharacterSelectorProps) {
  return (
    <section className="menu-section" aria-label="Select characters">
      <h2>Characters</h2>

      <div className="menu-player-count">
        {PLAYER_COUNT_OPTIONS.map((count) => (
          <button
            key={count}
            type="button"
            className={
              count === playerCount ? 'ui-button ui-button--primary' : 'ui-button ui-button--secondary'
            }
            onClick={() => onPlayerCountChange(count)}
          >
            {count} Players
          </button>
        ))}
      </div>

      <div className="menu-slots">
        {slots.map((characterId, slot) => (
          <div key={slot} className="menu-slot">
            <span className="menu-slot__label">Player {slot + 1}</span>
            <div className="menu-tile-grid">
              {availableCharacters.map((character) => {
                const usedInOtherSlot = slots.some((id, i) => id === character.id && i !== slot)
                return (
                  <SelectableTile
                    key={character.id}
                    label={character.name}
                    swatchColor={character.color}
                    selected={characterId === character.id}
                    disabled={usedInOtherSlot}
                    onSelect={() => onSelectSlot(slot, character.id)}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
