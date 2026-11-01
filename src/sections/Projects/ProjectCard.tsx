import type { CSSProperties, Ref } from 'react'
import type { Project } from './projectData'
import styles from './Projects.module.css'

type ProjectCardProps = {
  project: Project
  /** Degrees. Each card is pinned a little crooked; hover straightens it. */
  tilt: number
  expanded: boolean
  onOpen: (card: HTMLElement) => void
  triggerRef: Ref<HTMLButtonElement>
}

/** A note pinned to the board: cover, title, one line. The rest is behind the pin. */
export function ProjectCard({ project, tilt, expanded, onOpen, triggerRef }: ProjectCardProps) {
  const { slug, index, title, intro, image, imageAlt, wip } = project

  return (
    <article className={styles.card} style={{ '--tilt': `${tilt}deg` } as CSSProperties}>
      <div className={styles.thumb}>
        <img
          className={styles.thumbImg}
          src={image}
          alt={imageAlt}
          loading="lazy"
          decoding="async"
          width={880}
          height={550}
        />
        {wip && <span className={styles.wipBadge}>WIP</span>}
      </div>

      <div className={styles.body}>
        <span className={styles.index}>{index}</span>
        <h3 className={styles.title}>
          {/* The button's ::after stretches over the whole card, so the card
              is one big target while the accessible name stays the title. */}
          <button
            ref={triggerRef}
            type="button"
            className={styles.trigger}
            aria-expanded={expanded}
            aria-controls={`project-${slug}`}
            onClick={(e) => {
              const card = e.currentTarget.closest('article')
              if (card) onOpen(card)
            }}
          >
            {title}
          </button>
        </h3>
        <p className={styles.intro} title={intro}>
          {intro}
        </p>
      </div>
    </article>
  )
}
