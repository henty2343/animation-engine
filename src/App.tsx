import { useMemo, useState } from 'react'
import { Menu } from './menu/Menu'
import type { MenuSelection } from './menu/MenuSelection'
import { Arena } from './components/Arena/Arena'
import { ColorExpansionArena } from './components/Arena/ColorExpansionArena'
import { IntroScreen } from './components/UI/IntroScreen'
import { StatsPanel } from './components/UI/StatsPanel'
import { WinnerScreen } from './components/UI/WinnerScreen'
import { useUIPhase } from './components/UI/useUIPhase'
import { UIManager } from './engine/ui/UIManager'
import { getCharacterById } from './characters/Characters'
import { getSimulationById } from './simulations/registry'
import type { Character } from './types/Character'
import type { Player } from './types/Player'
import type { PlayerStatDisplay } from './components/UI/types'
import './App.css'

/**
 * Top-level view switch: Menu (setup) -> Intro -> Running -> Winner (see
 * Engine.md, Timeline).
 *
 * Color Expansion now runs for real: once Start is pressed, this builds
 * the fixed player roster (see types/Player.ts) from the Menu's
 * selection and hands it to ColorExpansionArena, which loads and drives
 * simulations/ColorExpansion/ColorExpansion.ts through the real
 * SimulationEngine (see that component's own doc comment). Any other
 * selected simulation (currently only Weapon Clash, still an empty
 * placeholder — Phase 8) falls back to the Phase 2 demo Arena, since
 * there is nothing real yet to run for it.
 *
 * There is still no automatic path to the Winner phase for anything
 * other than Color Expansion: only ColorExpansionArena's onComplete
 * calls UIManager.showWinner() so far, on the tick
 * Simulation.isComplete() first reports true (see that component).
 */
function App() {
  const [selection, setSelection] = useState<MenuSelection | null>(null)
  const [runSeed, setRunSeed] = useState(0)
  const [stats, setStats] = useState<PlayerStatDisplay[]>([])
  const uiManager = useMemo(() => new UIManager(), [])
  const phase = useUIPhase(uiManager)

  // Hooks must run unconditionally on every render (see
  // .oxlintrc.json's react/rules-of-hooks) even though `selection` can
  // be null before Start is pressed — the guard lives inside the
  // memoized callback instead of around the hook call itself.
  const players: Player[] = useMemo(() => {
    if (!selection) return []
    return selection.characterIds
      .map((id) => getCharacterById(id))
      .filter((character): character is Character => character !== undefined)
      .map((character, index) => ({ id: character.id, slot: index, character }))
  }, [selection])

  function handleStart(menuSelection: MenuSelection) {
    setSelection(menuSelection)
    // A fresh seed per run (see Engine.md, Determinism — the same seed
    // must always reproduce the same result; a new run gets a new one,
    // chosen here since the Menu itself has no opinion on it).
    setRunSeed(Math.floor(Math.random() * 0xffffffff))
    setStats([])
    uiManager.startRun()
  }

  if (!selection) {
    return <Menu onStart={handleStart} />
  }

  const simulationDescriptor = getSimulationById(selection.simulationId)

  if (phase === 'intro') {
    return (
      <IntroScreen
        simulationName={simulationDescriptor?.name ?? ''}
        characters={players.map((player) => player.character)}
      />
    )
  }

  if (phase === 'winner') {
    return <WinnerScreen ranking={stats} />
  }

  return (
    <div className="run-view">
      <div className="arena-wrapper">
        {selection.simulationId === 'color-expansion' ? (
          <ColorExpansionArena
            players={players}
            aspectRatio={selection.aspectRatio}
            seed={runSeed}
            onStatsUpdate={setStats}
            onComplete={() => uiManager.showWinner()}
          />
        ) : (
          <Arena aspectRatio={selection.aspectRatio} />
        )}
      </div>
      <StatsPanel entries={stats} />
    </div>
  )
}

export default App
