import type { HTMLAttributes } from 'react'
import './Shared.css'

/**
 * A simple bordered panel used to group related Menu/UI content (see
 * Architecture.md, /src/components/Shared).
 */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  const classes = ['ui-card', className].filter(Boolean).join(' ')
  return <div className={classes} {...props} />
}
