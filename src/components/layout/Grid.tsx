import type { CSSProperties, ReactNode } from 'react'
import styles from './Grid.module.css'

type GridProps = {
  /** Column count per breakpoint; each unset tier falls back to the one below it. */
  columns?: { base?: number; md?: number; lg?: number }
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  className?: string
  children: ReactNode
}

export function Grid({
  columns = { base: 1, md: 2, lg: 3 },
  gap = 5,
  className,
  children,
}: GridProps) {
  const base = columns.base ?? 1
  const md = columns.md ?? base
  const lg = columns.lg ?? md

  const style = {
    gap: `var(--space-${gap})`,
    '--grid-cols-base': base,
    '--grid-cols-md': md,
    '--grid-cols-lg': lg,
  } as CSSProperties

  return (
    <div className={[styles.grid, className].filter(Boolean).join(' ')} style={style}>
      {children}
    </div>
  )
}
