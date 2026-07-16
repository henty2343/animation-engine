import type { Character } from '../../types/Character'
import { Card } from '../Shared/Card'
import './UI.css'

interface IntroScreenProps {
  simulationName: string
  characters: Character[]
  /** Optional short skill blurb per character id (see Characters.md). */
  skillDescriptions?: Record<string, string>
}

/**
 * The intro screen shown at the start of every run (see Engine.md,
 * Timeline, and each simulation doc's Intro Screen section: simulation
 * name, characters, and skill descriptions, shown for ~1-2 seconds).
 * Duration is owned by engine/ui/UIManager, not this component — it just
 * renders for as long as the UI phase is 'intro'.
 */
export function IntroScreen({ simulationName, characters, skillDescriptions }: IntroScreenProps) {
  return (
    <div className="intro-screen">
      <Card className="intro-screen__card">
        <h1>{simulationName}</h1>
        <div className="intro-screen__characters">
          {characters.map((character) => (
            <div key={character.id} className="intro-screen__character">
              <span className="intro-screen__swatch" style={{ background: character.color }} />
              <span className="intro-screen__name">{character.name}</span>
              {skillDescriptions?.[character.id] && (
                <span className="intro-screen__skill">{skillDescriptions[character.id]}</span>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
