import { useMemo, useState } from 'react'
import { Menu } from './menu/Menu'
import type { MenuSelection } from './menu/MenuSelection'
import { Arena } from './components/Arena/Arena'
import { ColorExpansionArena } from './components/Arena/ColorExpansionArena'
import { WeaponClashArena } from './components/Arena/WeaponClashArena'
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

function App() {
  const [selection, setSelection] = useState<MenuSelection | null>(null)
  const [runSeed, setRunSeed] = useState(0)
  const [stats, setStats] = useState<PlayerStatDisplay[]>([])
  const uiManager = useMemo(() => new UIManager(), [])
  const phase = useUIPhase(uiManager)

  const players: Player[] = useMemo(() => {
    if (!selection) return []
    return selection.characterIds
      .map((id) => getCharacterById(id))
      .filter((character): character is Character => character !== undefined)
      .map((character, index) => ({ id: character.id, slot: index, character }))
  }, [selection])

  function handleStart(menuSelection: MenuSelection) {
    setSelection(menuSelection)
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
        ) : selection.simulationId === 'weapon-clash' ? (
          <WeaponClashArena
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
