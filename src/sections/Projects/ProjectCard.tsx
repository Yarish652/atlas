import { Stack } from '../../components/layout'
import { ArrowRightIcon } from '../../components/ui'
import styles from './Projects.module.css'

type ProjectCardProps = {
  index: string
  title: string
  description: string
  /** Cover art. Fixed 16:10 frame; the image scales gently on hover. */
  image: string
  imageAlt: string
  /** Live deployment. Absent while a project is still in progress. */
  demo?: string
  wip?: boolean
}

export function ProjectCard({
  index,
  title,
  description,
  image,
  imageAlt,
  demo,
  wip = false,
}: ProjectCardProps) {
  return (
    <article className={styles.card}>
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
        {wip && <span className={styles.wipBadge}>In progress</span>}
      </div>

      <Stack gap={2} className={styles.body}>
        <span className={styles.index}>{index}</span>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.description}>{description}</p>

        {demo ? (
          <a
            href={demo}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.demo}
          >
            Live demo <ArrowRightIcon width={14} height={14} />
          </a>
        ) : (
          <span className={styles.wipNote}>Coming soon</span>
        )}
      </Stack>
    </article>
  )
}
