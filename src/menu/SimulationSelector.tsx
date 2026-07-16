import type { SimulationDescriptor } from '../types/SimulationDescriptor'
import { SelectableTile } from '../components/Shared/SelectableTile'

interface SimulationSelectorProps {
  simulations: SimulationDescriptor[]
  selectedId: string | null
  onSelect: (id: string) => void
}

/**
 * Lets the creator pick which simulation to run (see Engine.md, Menu —
 * "Select Simulation"). Purely presentational and reusable across every
 * simulation: it knows nothing beyond the descriptors it's given (see
 * simulations/registry.ts).
 */
export function SimulationSelector({ simulations, selectedId, onSelect }: SimulationSelectorProps) {
  return (
    <section className="menu-section" aria-label="Select simulation">
      <h2>Simulation</h2>
      <div className="menu-tile-grid">
        {simulations.map((sim) => (
          <SelectableTile
            key={sim.id}
            label={sim.name}
            description={sim.description}
            selected={selectedId === sim.id}
            onSelect={() => onSelect(sim.id)}
          />
        ))}
      </div>
    </section>
  )
}
