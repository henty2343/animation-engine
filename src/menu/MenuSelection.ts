import type { AspectRatio } from '../shared/Constants'

/**
 * The Menu's output once every required selection is made and Start is
 * pressed (see Engine.md, Menu). Kept in its own file so Menu.tsx exports
 * only the Menu component itself (see .oxlintrc.json,
 * react/only-export-components).
 */
export interface MenuSelection {
  simulationId: string
  /** One Character id per player slot, in slot order (2-4 entries). */
  characterIds: string[]
  aspectRatio: AspectRatio
}
