import type { ReactNode } from 'react'
import { useInView } from '../../lib/useInView'
import { Container } from './Container'
import styles from './Section.module.css'

type SectionProps = {
  id?: string
  children: ReactNode
  className?: string
  /** Draws a top divider — used between stacked page sections. */
  bordered?: boolean
  /**
   * Scroll-reveal the content (fade + 12px rise, once). On by default;
   * the hero opts out — it gets a load entrance, not a scroll one.
   * The reveal wrapper animates `translate` on CONTENT only: section
   * height and bottom rules (the entity's floors) never move.
   */
  reveal?: boolean
  'aria-label'?: string
  'aria-labelledby'?: string
}

export function Section({
  id,
  children,
  className,
  bordered = false,
  reveal = true,
  ...aria
}: SectionProps) {
  const { ref, inView } = useInView<HTMLElement>({ rootMargin: '0px 0px -10% 0px' })
  const classes = [styles.section, bordered && styles.bordered, className]
    .filter(Boolean)
    .join(' ')

  return (
    <section id={id} ref={reveal ? ref : undefined} className={classes} {...aria}>
      <Container>
        {reveal ? <div data-reveal={inView ? 'in' : 'pending'}>{children}</div> : children}
      </Container>
    </section>
  )
}
