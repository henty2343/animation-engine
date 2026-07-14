import { clamp } from './Math'

/**
 * A palette of visually distinct colors, one per player slot (see
 * Engine.md, Menu: 2–4 player slots). Used to assign default Character
 * colors — see characters/Characters.ts.
 */
export const CHARACTER_COLOR_PALETTE: readonly string[] = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#eab308', // yellow
]

/**
 * Returns a hex color as an `rgba(...)` string with the given alpha, used
 * for the Winner Screen's "remaining players faded" effect (see
 * ColorExpansion.md and WeaponClash.md, Winner Screen).
 */
export function withAlpha(hexColor: string, alpha: number): string {
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`
}
