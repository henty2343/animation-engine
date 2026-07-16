import { useMemo, useState } from 'react'
import { Menu } from './menu/Menu'
import type { MenuSelection } from './menu/MenuSelection'
import { Arena } from './components/Arena/Arena'
import { IntroScreen } from './components/UI/IntroScreen'
import { StatsPanel } from './components/UI/StatsPanel'
import { useUIPhase } from './components/UI/useUIPhase'
import { UIManager } from './engine/ui/UIManager'
import { getCharacterById } from './characters/Characters'
import { getSimulationById } from './simulations/registry'
import type { Character } from './types/Character'
import type { PlayerStatDisplay } from './components/UI/types'
import './App.css'

/**
 * Top-level view switch: Menu (setup) first, then — once Start is
 * pressed — the shared run timeline (Intro -> Running, see Engine.md,
 * Timeline). There is no automatic path to the Winner phase yet: that
 * requires a real Simulation<TState> to call Simulation.isComplete()
 * against, and neither Color Expansion nor Weapon Clash exist yet
 * (Phase 6 / Phase 8 — see Progress.md). UIManager.showWinner() is ready
 * for whichever of those phases reaches completion first.
 *
 * The 'running' view still uses the Phase 2 demo characters (see
 * Arena.tsx) — there is no real simulation to run or stats to report
 * yet, so StatsPanel is fed the same demo characters mapped into
 * placeholder display rows. This is clearly not real gameplay data; it
 * only proves StatsPanel and Arena render together correctly.
 */
function App() {
  const [selection, setSelection] = useState<MenuSelection | null>(null)
  const uiManager = useMemo(() => new UIManager(), [])
  const phase = useUIPhase(uiManager)

  function handleStart(menuSelection: MenuSelection) {
    setSelection(menuSelection)
    uiManager.startRun()
  }

  if (!selection) {
    return <Menu onStart={handleStart} />
  }

  const simulation = getSimulationById(selection.simulationId)
  const characters = selection.characterIds
    .map((id) => getCharacterById(id))
    .filter((character): character is Character => character !== undefined)

  if (phase === 'intro') {
    return <IntroScreen simulationName={simulation?.name ?? ''} characters={characters} />
  }

  const demoStats: PlayerStatDisplay[] = characters.map((character, index) => ({
    playerId: character.id,
    character,
    rank: index + 1,
    eliminated: false,
    statLines: ['Awaiting simulation'],
  }))

  return (
    <div className="run-view">
      <div className="arena-wrapper">
        <Arena aspectRatio={selection.aspectRatio} />
      </div>
      <StatsPanel entries={demoStats} />
    </div>
  )
}

export default App
