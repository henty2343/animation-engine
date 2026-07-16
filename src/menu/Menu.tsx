import { useState } from 'react'
import { SimulationSelector } from './SimulationSelector'
import { CharacterSelector } from './CharacterSelector'
import { SettingsPanel } from './SettingsPanel'
import type { MenuSelection } from './MenuSelection'
import { Button } from '../components/Shared/Button'
import { Card } from '../components/Shared/Card'
import { listSimulations } from '../simulations/registry'
import { listCharacters } from '../characters/Characters'
import { getSetting, setSetting } from '../shared/Settings'
import { ASPECT_RATIOS, MIN_PLAYERS, type AspectRatio } from '../shared/Constants'
import './Menu.css'

interface MenuProps {
  onStart: (selection: MenuSelection) => void
}

/**
 * The main menu (see Engine.md, Menu): select a simulation, select 2-4
 * participating characters, configure simulation-specific settings and
 * aspect ratio, then Start. This is the only setup screen before a
 * simulation starts (see Engine.md, UI — "The Menu only handles setup
 * before a simulation starts"); intro/live-stats/winner screens are
 * handled separately by engine/ui + components/UI once a run begins.
 *
 * Selections persist to shared/Settings.ts as they change, so returning
 * to the menu later (e.g. after a run) remembers the last configuration
 * — see Settings.ts's own doc comment, which anticipated exactly this
 * usage ("read and written through this store by the Menu itself in a
 * later phase").
 */
export function Menu({ onStart }: MenuProps) {
  const simulations = listSimulations()
  const availableCharacters = listCharacters()

  const [simulationId, setSimulationId] = useState<string | null>(() =>
    getSetting<string | null>('menu.simulationId', simulations[0]?.id ?? null),
  )
  const [playerCount, setPlayerCount] = useState<number>(() =>
    getSetting<number>('menu.playerCount', MIN_PLAYERS),
  )
  const [slots, setSlots] = useState<(string | null)[]>(() =>
    getSetting<(string | null)[]>('menu.slots', Array(MIN_PLAYERS).fill(null)),
  )
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(() =>
    getSetting<AspectRatio>('menu.aspectRatio', ASPECT_RATIOS.WIDESCREEN),
  )

  function handleSimulationSelect(id: string) {
    setSimulationId(id)
    setSetting('menu.simulationId', id)
  }

  function handlePlayerCountChange(count: number) {
    setPlayerCount(count)
    setSetting('menu.playerCount', count)
    setSlots((prev) => {
      const next = Array.from({ length: count }, (_, i) => prev[i] ?? null)
      setSetting('menu.slots', next)
      return next
    })
  }

  function handleSelectSlot(slot: number, characterId: string) {
    setSlots((prev) => {
      const next = [...prev]
      // Swap instead of duplicating if this Character is already assigned
      // elsewhere (see CharacterSelector.tsx — uniqueness judgment call).
      const existingSlot = next.findIndex((id) => id === characterId)
      if (existingSlot !== -1 && existingSlot !== slot) {
        next[existingSlot] = next[slot]
      }
      next[slot] = characterId
      setSetting('menu.slots', next)
      return next
    })
  }

  function handleAspectRatioChange(value: AspectRatio) {
    setAspectRatio(value)
    setSetting('menu.aspectRatio', value)
  }

  const isReadyToStart =
    simulationId !== null && slots.length === playerCount && slots.every((id) => id !== null)

  function handleStart() {
    if (!isReadyToStart || simulationId === null) return
    onStart({
      simulationId,
      characterIds: slots.filter((id): id is string => id !== null),
      aspectRatio,
    })
  }

  return (
    <div className="menu">
      <h1>Animation Engine</h1>
      <Card className="menu-card">
        <SimulationSelector
          simulations={simulations}
          selectedId={simulationId}
          onSelect={handleSimulationSelect}
        />
        <CharacterSelector
          availableCharacters={availableCharacters}
          playerCount={playerCount}
          onPlayerCountChange={handlePlayerCountChange}
          slots={slots}
          onSelectSlot={handleSelectSlot}
        />
        <SettingsPanel aspectRatio={aspectRatio} onAspectRatioChange={handleAspectRatioChange} />
        <div className="menu-start">
          <Button onClick={handleStart} disabled={!isReadyToStart}>
            Start
          </Button>
        </div>
      </Card>
    </div>
  )
}
