import { useEffect, useImperativeHandle, useLayoutEffect, useRef, type Ref } from 'react'
import { Stack } from '../../components/layout'
import { ArrowRightIcon, CloseIcon, GitHubIcon } from '../../components/ui'
import { COLLAPSE_MS, EASE_COLLAPSE, EASE_EXPAND, EXPAND_MS } from './motion'
import type { Project } from './projectData'
import styles from './Projects.module.css'

export type ProjectDetailHandle = {
  /** Plays the collapse back onto the card, then resolves. */
  collapse(): Promise<void>
}

type ProjectDetailProps = {
  project: Project
  /** The pinned card this panel grows out of, and shrinks back into. */
  origin: HTMLElement | null
  reducedMotion: boolean
  onRequestClose: () => void
  ref: Ref<ProjectDetailHandle>
}

/** Corner radii: the card's (--radius-md) growing into the panel's (--radius-lg). */
const CARD_RADIUS = 'round 10px'
const PANEL_CLIP = 'inset(0 0 0 0 round 16px)'

/** The card's rect as an inset() of the panel — the clip the panel grows from. */
function originClip(panel: HTMLElement, origin: HTMLElement | null): string | null {
  if (!origin) return null
  const o = origin.getBoundingClientRect()
  const p = panel.getBoundingClientRect()
  return `inset(${o.top - p.top}px ${p.right - o.right}px ${p.bottom - o.bottom}px ${o.left - p.left}px ${CARD_RADIUS})`
}

/**
 * The unpinned card. It occupies the whole board, layered over the pinned
 * cards, and grows out of the card it came from by animating its clip-path
 * from the card's rect to its own. Clipping, unlike scaling, never distorts
 * the text mid-flight.
 */
export function ProjectDetail({
  project,
  origin,
  reducedMotion,
  onRequestClose,
  ref,
}: ProjectDetailProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const { slug, index, title, blurb, tags, image, imageAlt, repo, demo, wip, detail } = project

  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    const from = reducedMotion ? null : originClip(panel, origin)
    if (from) {
      panel.animate([{ clipPath: from }, { clipPath: PANEL_CLIP }], {
        duration: EXPAND_MS,
        easing: EASE_EXPAND,
      })
      // The story settles in once the panel has most of its size — fading
      // up from slightly below, so it arrives rather than appears.
      innerRef.current?.animate(
        [
          { opacity: 0, transform: 'translateY(10px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: 420, delay: EXPAND_MS * 0.3, easing: EASE_EXPAND, fill: 'backwards' },
      )
    }
    headingRef.current?.focus({ preventScroll: true })
    // Open from a card low on the board → bring the panel's top into view.
    if (panel.getBoundingClientRect().top < 0) {
      panel.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'smooth' })
    }
    // Both are fixed for the life of one opening, so this runs once per open.
  }, [origin, reducedMotion])

  useImperativeHandle(ref, () => ({
    async collapse() {
      const panel = panelRef.current
      const to = !panel || reducedMotion ? null : originClip(panel, origin)
      if (!panel || !to) return
      // Words leave first, so the shrinking panel never crops a sentence.
      innerRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: COLLAPSE_MS * 0.4,
        easing: 'ease-out',
        fill: 'forwards',
      })
      const anim = panel.animate([{ clipPath: PANEL_CLIP }, { clipPath: to }], {
        duration: COLLAPSE_MS,
        easing: EASE_COLLAPSE,
        fill: 'forwards',
      })
      await anim.finished.catch(() => undefined)
    },
  }))

  // Esc, or a press anywhere outside the panel, puts the card back.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onRequestClose()
    }
    const onPointerDown = (e: PointerEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) onRequestClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [onRequestClose])

  return (
    <div
      ref={panelRef}
      id={`project-${slug}`}
      className={styles.detail}
      role="region"
      aria-labelledby={`project-${slug}-title`}
    >
      <div ref={innerRef} className={styles.detailInner}>
        <div className={styles.detailMedia}>
          <img className={styles.thumbImg} src={image} alt={imageAlt} width={880} height={550} />
          {wip && <span className={styles.wipBadge}>In progress</span>}
        </div>

        <Stack gap={5} className={styles.detailCopy}>
          <Stack gap={2}>
            <span className={styles.index}>
              {index} · {tags.join(' · ')}
            </span>
            <h3
              ref={headingRef}
              id={`project-${slug}-title`}
              className={styles.detailTitle}
              tabIndex={-1}
            >
              {title}
            </h3>
            <p className={styles.description}>{blurb}</p>
          </Stack>

          <dl className={styles.story}>
            <div>
              <dt>Problem</dt>
              <dd>{detail.problem}</dd>
            </div>
            <div>
              <dt>Approach</dt>
              <dd>{detail.approach}</dd>
            </div>
            <div>
              <dt>Result</dt>
              <dd>{detail.result}</dd>
            </div>
          </dl>

          <ul className={styles.tags} aria-label="Built with">
            {detail.stack.map((item) => (
              <li key={item} className={styles.tag}>
                {item}
              </li>
            ))}
          </ul>

          <Stack direction="row" align="center" gap={5} wrap>
            {repo && (
              <a href={repo} target="_blank" rel="noopener noreferrer" className={styles.demo}>
                <GitHubIcon width={16} height={16} /> Code
              </a>
            )}
            {demo && (
              <a href={demo} target="_blank" rel="noopener noreferrer" className={styles.demo}>
                Live demo <ArrowRightIcon width={14} height={14} />
              </a>
            )}
            {!repo && !demo && <span className={styles.wipNote}>Coming soon</span>}
          </Stack>
        </Stack>
      </div>

      <button
        type="button"
        className={styles.close}
        onClick={onRequestClose}
        aria-label={`Pin ${title} back`}
      >
        <CloseIcon width={18} height={18} />
      </button>
    </div>
  )
}
