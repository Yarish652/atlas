import type { CSSProperties, ElementType, ReactNode } from 'react'
import styles from './Stack.module.css'

type SpaceToken = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

type StackProps = {
  as?: ElementType
  direction?: 'row' | 'column'
  gap?: SpaceToken
  align?: CSSProperties['alignItems']
  justify?: CSSProperties['justifyContent']
  wrap?: boolean
  className?: string
  children: ReactNode
}

/** Flex layout primitive — the default way to space a run of elements. */
export function Stack({
  as: Tag = 'div',
  direction = 'column',
  gap = 4,
  align,
  justify,
  wrap = false,
  className,
  children,
}: StackProps) {
  const style: CSSProperties = {
    flexDirection: direction,
    gap: `var(--space-${gap})`,
    alignItems: align,
    justifyContent: justify,
    flexWrap: wrap ? 'wrap' : 'nowrap',
  }

  return (
    <Tag className={[styles.stack, className].filter(Boolean).join(' ')} style={style}>
      {children}
    </Tag>
  )
}
