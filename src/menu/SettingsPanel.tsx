import { ASPECT_RATIOS, type AspectRatio } from '../shared/Constants'
import { SelectableTile } from '../components/Shared/SelectableTile'

interface SettingsPanelProps {
  aspectRatio: AspectRatio
  onAspectRatioChange: (aspectRatio: AspectRatio) => void
}

/**
 * Aspect ratio selection (see Engine.md, Menu — "Aspect Ratio (16:9 /
 * 9:16)") plus a placeholder area for simulation-specific settings.
 *
 * Simulation-specific settings are intentionally not implemented yet:
 * every balance value either simulation would expose here (grid
 * dimensions, movement speed, damage, rotation speed, weapon lengths) is
 * still listed as undecided in Todo.md's Balance section, and each
 * simulation's own Config.ts is still an empty placeholder. Inventing
 * numbers here would violate docs/CLAUDE.md's "Do not invent behaviour."
 * This section gets wired up once a simulation's Config exists to back
 * it (Phase 6 for Color Expansion, Phase 8 for Weapon Clash).
 */
export function SettingsPanel({ aspectRatio, onAspectRatioChange }: SettingsPanelProps) {
  return (
    <section className="menu-section" aria-label="Settings">
      <h2>Settings</h2>

      <div className="menu-subsection">
        <span className="menu-subsection__label">Aspect Ratio</span>
        <div className="menu-tile-grid menu-tile-grid--compact">
          <SelectableTile
            label="16:9"
            description="Landscape"
            selected={aspectRatio === ASPECT_RATIOS.WIDESCREEN}
            onSelect={() => onAspectRatioChange(ASPECT_RATIOS.WIDESCREEN)}
          />
          <SelectableTile
            label="9:16"
            description="Vertical"
            selected={aspectRatio === ASPECT_RATIOS.VERTICAL}
            onSelect={() => onAspectRatioChange(ASPECT_RATIOS.VERTICAL)}
          />
        </div>
      </div>

      <div className="menu-subsection">
        <span className="menu-subsection__label">Simulation Settings</span>
        <p className="menu-subsection__placeholder">
          Not yet available — balance values for this simulation haven't been decided (see Todo.md).
        </p>
      </div>
    </section>
  )
}
