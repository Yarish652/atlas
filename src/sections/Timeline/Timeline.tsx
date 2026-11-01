import { useCallback, useEffect, useRef, useState } from 'react'
import { Section, Stack } from '../../components/layout'
import { ArrowRightIcon } from '../../components/ui'
import { useMediaQuery } from '../../lib/useMediaQuery'
import styles from './Timeline.module.css'

type Chapter = {
  chapter: string
  title: string
  description: string
  /** The present, and the direction from it. Everything else is past. */
  kind?: 'now' | 'next'
}

const chapters: Chapter[] = [
  {
    chapter: 'Chapter 1',
    title: 'Finding Direction',
    description: 'Started engineering and spent time exploring what genuinely interested me.',
  },
  {
    chapter: 'Chapter 2',
    title: 'Learning the Fundamentals',
    description: 'Focused on DSA, algorithms, and computer science.',
  },
  {
    chapter: 'Chapter 3',
    title: 'Building the Web',
    description: 'Learned frontend, built my first blog, then expanded into backend development.',
  },
  {
    chapter: 'Chapter 4',
    title: 'The AI Shift',
    description: 'Discovered LLMs, RAG, embeddings, and started building AI-powered products.',
  },
  {
    chapter: 'Chapter 5 · Now',
    title: 'LLM Systems You Can Check',
    description:
      'Cited retrieval, local agents like Timesheet Sloth, fixes merged into ActivityWatch, and microGPT on an FPGA.',
    kind: 'now',
  },
  {
    chapter: 'Chapter 6 · Next',
    title: 'Closer to the Metal',
    description:
      'GSoC 2027, evals by default, and on-device models: agents people can inspect and steer.',
    kind: 'next',
  },
]

const NOW_INDEX = chapters.findIndex((c) => c.kind === 'now')
/** Change the stamp whenever chapters 5 and 6 change. */
const UPDATED = { iso: '2026-11', label: 'Nov 2026' }

/** The journey plays once, left to right, when it's first seen. */
const SWEEP_MS = 2400
/** Let the section's own reveal land first. */
const SWEEP_DELAY_MS = 500
/**
 * The arrows' glide: a critically damped spring. It eases in and out on its
 * own, and a click mid-glide retargets it without losing momentum, so quick
 * clicks flow into one movement instead of stopping and restarting.
 */
const SPRING_K = 140
const SPRING_C = 2 * Math.sqrt(SPRING_K)
const SPRING_STEP_S = 0.004

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

/** The one animation that may be moving the track at a time. */
type Motion = { kind: 'sweep' | 'glide'; frame: number; target: number; x: number; v: number }

export function Timeline() {
  const trackRef = useRef<HTMLOListElement>(null)
  const motionRef = useRef<Motion | null>(null)
  const [edges, setEdges] = useState({ start: true, end: false })
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  /** Where the track would sit with chapter `i` at its left edge. */
  const offsetOf = useCallback((i: number) => {
    const track = trackRef.current
    const items = track?.children
    if (!track || !items?.[i]) return 0
    const first = items[0] as HTMLElement
    const target = (items[i] as HTMLElement).offsetLeft - first.offsetLeft
    return Math.min(target, track.scrollWidth - track.clientWidth)
  }, [])

  /** Halt whatever is moving the track, and hand snapping back to the browser. */
  const stop = useCallback(() => {
    const m = motionRef.current
    if (!m) return
    cancelAnimationFrame(m.frame)
    motionRef.current = null
    if (trackRef.current) trackRef.current.style.scrollSnapType = ''
  }, [])

  /** Begin driving the track by hand. Snap would fight every in-between position. */
  const take = useCallback((kind: Motion['kind'], target: number): Motion | null => {
    const track = trackRef.current
    if (!track) return null
    track.style.scrollSnapType = 'none'
    const m: Motion = { kind, frame: 0, target, x: track.scrollLeft, v: 0 }
    motionRef.current = m
    return m
  }, [])

  /** The arrows' spring. Called again mid-flight, it just moves the target. */
  const glideTo = useCallback(
    (target: number) => {
      const track = trackRef.current
      if (!track) return
      if (reducedMotion) {
        stop()
        track.scrollLeft = target
        return
      }
      const current = motionRef.current
      if (current?.kind === 'glide') {
        current.target = target
        return
      }
      stop()
      const m = take('glide', target)
      if (!m) return
      let last = performance.now()
      const tick = (now: number) => {
        // Integrate in small fixed steps so the glide takes the same real
        // time at 30fps as at 120fps — and stays stable on a slow frame.
        let elapsed = Math.min(0.5, (now - last) / 1000)
        last = now
        while (elapsed > 0) {
          const dt = Math.min(SPRING_STEP_S, elapsed)
          m.v += (SPRING_K * (m.target - m.x) - SPRING_C * m.v) * dt
          m.x += m.v * dt
          elapsed -= dt
        }
        if (Math.abs(m.target - m.x) < 0.5 && Math.abs(m.v) < 4) {
          track.scrollLeft = m.target
          stop()
          return
        }
        track.scrollLeft = m.x
        m.frame = requestAnimationFrame(tick)
      }
      m.frame = requestAnimationFrame(tick)
    },
    [reducedMotion, stop, take],
  )

  /** The opening sweep: a slow, timed ease from wherever the track is. */
  const sweepTo = useCallback(
    (target: number) => {
      const track = trackRef.current
      if (!track) return
      stop()
      if (reducedMotion) {
        // Same destination, no journey: the present is where it opens.
        track.scrollLeft = target
        return
      }
      const m = take('sweep', target)
      if (!m) return
      const from = m.x
      const t0 = performance.now()
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / SWEEP_MS)
        track.scrollLeft = from + (target - from) * easeInOutCubic(t)
        if (t < 1) m.frame = requestAnimationFrame(tick)
        else stop()
      }
      m.frame = requestAnimationFrame(tick)
    },
    [reducedMotion, stop, take],
  )

  // ── Which ends are reached (for the arrows) ──────────────────────────────
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    let frame = 0
    const update = () => {
      frame = 0
      const max = track.scrollWidth - track.clientWidth
      const next = { start: track.scrollLeft <= 2, end: track.scrollLeft >= max - 2 }
      setEdges((e) => (e.start === next.start && e.end === next.end ? e : next))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    track.addEventListener('scroll', onScroll, { passive: true })
    const ro = new ResizeObserver(onScroll)
    ro.observe(track)
    return () => {
      track.removeEventListener('scroll', onScroll)
      ro.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [])

  // ── The sweep: chapter 1 → Now, once, on first sight ─────────────────────
  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    let timer = 0
    let handled = false

    // Any hand on the track takes over, immediately — from the sweep or a glide.
    const interrupt = () => {
      handled = true
      window.clearTimeout(timer)
      stop()
    }
    const inputs = ['wheel', 'pointerdown', 'touchstart', 'keydown'] as const
    for (const type of inputs) track.addEventListener(type, interrupt, { passive: true })

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || handled) return
        io.disconnect()
        timer = window.setTimeout(
          () => {
            // The arrows got there first: they win.
            if (!handled && !motionRef.current) sweepTo(offsetOf(NOW_INDEX))
          },
          reducedMotion ? 0 : SWEEP_DELAY_MS,
        )
      },
      { threshold: 0.5 },
    )
    io.observe(track)

    return () => {
      io.disconnect()
      window.clearTimeout(timer)
      for (const type of inputs) track.removeEventListener(type, interrupt)
      stop()
    }
  }, [offsetOf, reducedMotion, stop, sweepTo])

  /** Arrow buttons: one chapter at a time, counted from where the track is headed. */
  const step = (dir: 1 | -1) => {
    const track = trackRef.current
    const first = track?.children[0] as HTMLElement | undefined
    if (!track || !first) return
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0
    const stride = first.offsetWidth + gap
    const max = track.scrollWidth - track.clientWidth
    const m = motionRef.current
    const from = m?.kind === 'glide' ? m.target : track.scrollLeft
    const index = Math.round(from / stride) + dir
    glideTo(Math.max(0, Math.min(max, index * stride)))
  }

  return (
    <Section id="timeline" bordered aria-label="Journey so far">
      <Stack gap={6}>
        <Stack direction="row" align="center" justify="space-between" gap={4}>
          <Stack direction="row" align="baseline" gap={3} wrap>
            <h2 className={styles.heading}>Journey so far</h2>
            <p className={styles.stamp}>
              Updated <time dateTime={UPDATED.iso}>{UPDATED.label}</time>
            </p>
          </Stack>
          <Stack direction="row" gap={2}>
            <button
              type="button"
              className={styles.arrow}
              onClick={() => step(-1)}
              disabled={edges.start}
              aria-controls="journey-track"
              aria-label="Previous chapter"
            >
              <ArrowRightIcon width={16} height={16} className={styles.back} />
            </button>
            <button
              type="button"
              className={styles.arrow}
              onClick={() => step(1)}
              disabled={edges.end}
              aria-controls="journey-track"
              aria-label="Next chapter"
            >
              <ArrowRightIcon width={16} height={16} />
            </button>
          </Stack>
        </Stack>

        {/* Focusable so the keyboard can scroll it too. */}
        <ol
          ref={trackRef}
          id="journey-track"
          className={styles.track}
          tabIndex={0}
          aria-label="Chapters"
        >
          {chapters.map((c) => (
            <li key={c.chapter} className={styles.milestone} data-kind={c.kind}>
              <span className={styles.chapter}>{c.chapter}</span>
              <h3 className={styles.title}>{c.title}</h3>
              <p className={styles.description}>{c.description}</p>
            </li>
          ))}
        </ol>
      </Stack>
    </Section>
  )
}
