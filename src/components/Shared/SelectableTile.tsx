import type { ReactNode } from 'react'
import './Shared.css'

interface SelectableTileProps {
  selected: boolean
  disabled?: boolean
  onSelect: () => void
  label: string
  description?: string
  swatchColor?: string
  children?: ReactNode
}

/**
 * A clickable card used for single-choice selection (see Menu's
 * Simulation selector and Character selector — Engine.md, Menu). Purely
 * presentational: the caller owns which tile is "selected".
 */
export function SelectableTile({
  selected,
  disabled = false,
  onSelect,
  label,
  description,
  swatchColor,
  children,
}: SelectableTileProps) {
  const classes = ['ui-tile', selected ? 'ui-tile--selected' : '', disabled ? 'ui-tile--disabled' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type="button"
      className={classes}
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
    >
      {swatchColor && <span className="ui-tile__swatch" style={{ background: swatchColor }} />}
      <span className="ui-tile__label">{label}</span>
      {description && <span className="ui-tile__description">{description}</span>}
      {children}
    </button>
  )
}
