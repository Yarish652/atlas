import type { ReactNode } from 'react'
import styles from './Container.module.css'

type ContainerProps = {
  children: ReactNode
  className?: string
}

/** Centers content and caps it at the site's max reading width. */
export function Container({ children, className }: ContainerProps) {
  return (
    <div className={[styles.container, className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}
