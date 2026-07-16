import type { PlayerStatDisplay } from './types'
import './UI.css'

interface StatsPanelProps {
  /** Already ranked (see engine/statistics/Ranking.ts) — this component never sorts. */
  entries: PlayerStatDisplay[]
}

/**
 * Live statistics shown during a run (see Engine.md, UI — "Live stats",
 * and each simulation doc's Statistics section). Purely a rendering of
 * whatever ranked entries it's given via StatisticsStore.getRanked() —
 * it has no idea what any stat means (see StatisticsStore.ts).
 */
export function StatsPanel({ entries }: StatsPanelProps) {
  return (
    <aside className="stats-panel" aria-label="Live statistics">
      <ol className="stats-panel__list">
        {entries.map((entry) => (
          <li
            key={entry.playerId}
            className={
              entry.eliminated ? 'stats-panel__row stats-panel__row--eliminated' : 'stats-panel__row'
            }
          >
            <span className="stats-panel__rank">#{entry.rank}</span>
            <span className="stats-panel__swatch" style={{ background: entry.character.color }} />
            <span className="stats-panel__name">{entry.character.name}</span>
            <span className="stats-panel__stats">{entry.statLines.join(' · ')}</span>
          </li>
        ))}
      </ol>
    </aside>
  )
}
