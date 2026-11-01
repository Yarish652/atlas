import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useMediaQuery } from '../../lib/useMediaQuery'
import {
  COLLAPSE_MS,
  EASE_COLLAPSE,
  EASE_EXPAND,
  EXPAND_MS,
  PIN_LEAD_MS,
  PIN_POP_MS,
} from './motion'
import { ProjectCard } from './ProjectCard'
import { ProjectDetail, type ProjectDetailHandle } from './ProjectDetail'
import { projects } from './projectData'
import styles from './Projects.module.css'

/** Pinned a little crooked, deterministically. Kept ≤ 2° so card tops stay flat enough to stand on. */
const TILTS = [-1.6, 1.2, -0.8, 1.8, -1.2, 0.6]

/**
 * The pinned projects, and the one unpinned. The board is transparent — the
 * section's cell field shows through around the cards.
 */
export function Pinboard() {
  const boardRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<HTMLDivElement>(null)
  const triggersRef = useRef<Record<string, HTMLButtonElement | null>>({})
  const detailRef = useRef<ProjectDetailHandle>(null)
  const pinAnimRef = useRef<Animation | null>(null)
  const openTimerRef = useRef(0)
  /** Board height just before opening — the expand eases from it. */
  const heightFromRef = useRef<number | null>(null)
  /** The board's height animation — the expand, or the collapse holding it until the panel unmounts. */
  const heightAnimRef = useRef<Animation | null>(null)
  /** Return focus here once the card is pinned back. */
  const returnFocusRef = useRef<string | null>(null)
  const closingRef = useRef(false)

  const [open, setOpen] = useState<{ slug: string; card: HTMLElement } | null>(null)

  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  // ── Unpin / pin back ─────────────────────────────────────────────────────
  const openCard = useCallback(
    (slug: string, card: HTMLElement) => {
      if (open || closingRef.current || openTimerRef.current) return
      if (reducedMotion) {
        setOpen({ slug, card })
        return
      }
      heightFromRef.current = boardRef.current?.offsetHeight ?? null
      // The pin lifts out, and the card starts rising before it's fully
      // free — overlapping, so it reads as one motion rather than two.
      pinAnimRef.current = card.animate(
        [
          { translate: '-50% 0', opacity: 1 },
          { translate: '-50% -12px', opacity: 0 },
        ],
        { duration: PIN_POP_MS, easing: EASE_EXPAND, fill: 'forwards', pseudoElement: '::before' },
      )
      openTimerRef.current = window.setTimeout(() => {
        openTimerRef.current = 0
        setOpen({ slug, card })
      }, PIN_LEAD_MS)
    },
    [open, reducedMotion],
  )

  useEffect(() => () => window.clearTimeout(openTimerRef.current), [])

  // The board eases to the panel's height instead of jumping to it.
  useLayoutEffect(() => {
    const board = boardRef.current
    if (!board) return
    if (open) {
      const from = heightFromRef.current
      heightFromRef.current = null
      const to = board.offsetHeight
      if (from !== null && Math.abs(to - from) > 1) {
        heightAnimRef.current = board.animate([{ height: `${from}px` }, { height: `${to}px` }], {
          duration: EXPAND_MS,
          easing: EASE_EXPAND,
        })
      }
    } else {
      // The panel is gone, so the board's natural height is now the one the
      // collapse was easing to — release the hold without a jump.
      heightAnimRef.current?.cancel()
      heightAnimRef.current = null
    }
  }, [open])

  const closeCard = useCallback(async () => {
    if (!open || closingRef.current) return
    closingRef.current = true
    const board = boardRef.current
    const cards = cardsRef.current
    if (board && cards && !reducedMotion) {
      // Closed mid-expand: start from wherever the board is right now.
      const from = board.offsetHeight
      heightAnimRef.current?.cancel()
      heightAnimRef.current = null
      const to = cards.offsetHeight
      if (Math.abs(to - from) > 1) {
        heightAnimRef.current = board.animate([{ height: `${from}px` }, { height: `${to}px` }], {
          duration: COLLAPSE_MS,
          easing: EASE_COLLAPSE,
          fill: 'forwards',
        })
      }
    }
    await detailRef.current?.collapse()
    returnFocusRef.current = open.slug
    setOpen(null)
    closingRef.current = false
    // Pressed back in: the pin returns.
    const pin = pinAnimRef.current
    pinAnimRef.current = null
    if (pin) {
      pin.reverse()
      void pin.finished.then(
        () => pin.cancel(),
        () => pin.cancel(),
      )
    }
  }, [open, reducedMotion])

  useEffect(() => {
    if (open || !returnFocusRef.current) return
    triggersRef.current[returnFocusRef.current]?.focus({ preventScroll: true })
    returnFocusRef.current = null
  }, [open])

  const openProject = open ? projects.find((p) => p.slug === open.slug) : undefined

  return (
    <div ref={boardRef} className={styles.board}>
      <div className={styles.stage}>
        <div
          ref={cardsRef}
          className={styles.cards}
          inert={open !== null}
          data-dimmed={open ? '' : undefined}
        >
          {projects.map((project, i) => (
            <ProjectCard
              key={project.slug}
              project={project}
              tilt={TILTS[i % TILTS.length]}
              expanded={open?.slug === project.slug}
              onOpen={(card) => openCard(project.slug, card)}
              triggerRef={(el) => {
                triggersRef.current[project.slug] = el
              }}
            />
          ))}
        </div>

        {openProject && open && (
          <ProjectDetail
            ref={detailRef}
            project={openProject}
            origin={open.card}
            reducedMotion={reducedMotion}
            onRequestClose={closeCard}
          />
        )}
      </div>
    </div>
  )
}
