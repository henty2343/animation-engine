import type { PlayerStatDisplay } from './types'
import { Card } from '../Shared/Card'
import './UI.css'

interface WinnerScreenProps {
  /** Final ranking, rank 1 = winner (see engine/statistics/Ranking.ts). */
  ranking: PlayerStatDisplay[]
}

/**
 * The winner screen (see Engine.md, Timeline, and each simulation doc's
 * Winner Screen section): final ranking, winner highlighted, remaining
 * players faded. The simulation freezes immediately when this appears —
 * that freeze is SimulationEngine stopping its loop
 * (see SimulationEngine.advanceSimulationStep), not something this
 * component does.
 */
export function WinnerScreen({ ranking }: WinnerScreenProps) {
  const winner = ranking.find((entry) => entry.rank === 1)

  return (
    <div className="winner-screen">
      <Card className="winner-screen__card">
        {winner && (
          <div className="winner-screen__winner">
            <span className="winner-screen__swatch" style={{ background: winner.character.color }} />
            <h1>{winner.character.name} wins!</h1>
          </div>
        )}
        <ol className="winner-screen__ranking">
          {ranking.map((entry) => (
            <li
              key={entry.playerId}
              className={
                entry.rank === 1
                  ? 'winner-screen__row winner-screen__row--winner'
                  : 'winner-screen__row winner-screen__row--faded'
              }
            >
              <span className="winner-screen__rank">#{entry.rank}</span>
              <span className="winner-screen__swatch" style={{ background: entry.character.color }} />
              <span className="winner-screen__name">{entry.character.name}</span>
              <span className="winner-screen__stats">{entry.statLines.join(' · ')}</span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  )
}
