import type { ButtonHTMLAttributes } from 'react'
import './Shared.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary'
}

/**
 * A single reusable button style shared between /src/menu and
 * /src/components/UI (see Architecture.md, /src/components/Shared —
 * "reusable React components... not to be confused with the top-level
 * /shared folder, which holds runtime utilities, not components").
 * Purely presentational: no state, no logic beyond forwarding standard
 * button props.
 */
export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  const classes = ['ui-button', `ui-button--${variant}`, className].filter(Boolean).join(' ')
  return <button className={classes} {...props} />
}
