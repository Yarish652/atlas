import { useEffect, useRef, useState, type ReactNode } from 'react'
import { loadRive } from '../../lib/rive'
import { useInView } from '../../lib/useInView'
import { useMediaQuery } from '../../lib/useMediaQuery'
import styles from './About.module.css'

type StudentAnimationProps = {
  /** The .riv file. */
  src: string
  /**
   * A one-shot animation in the file. When given, the file rests on its
   * first frame and plays it on cue — on coming into view, on click, and
   * every `replayMs` while visible. When omitted, the file's first state
   * machine (or first animation) plays continuously instead.
   */
  motion?: string
  replayMs?: number
  /** Shown until the animation is ready, and kept if it can't load. */
  fallback: ReactNode
}

/** Start fetching a little before the frame scrolls into view. */
const PRELOAD = { rootMargin: '300px 0px' }
/** How much of the frame must show before it counts as "seen". */
const SEEN_THRESHOLD = 0.4

/**
 * A Rive animation that fills its parent frame.
 *
 * The runtime is fetched only when the frame nears the viewport, animates
 * only while the frame is on screen and the tab is visible, and under
 * reduced motion shows a single still frame. Until it's ready — or if the
 * file is missing — the fallback stays in place, so the frame is never empty.
 */
export function StudentAnimation({ src, motion, replayMs, fallback }: StudentAnimationProps) {
  const { ref: frameRef, inView } = useInView<HTMLDivElement>(PRELOAD)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  useEffect(() => {
    const canvas = canvasRef.current
    if (!inView || !canvas) return

    let disposed = false
    let cleanup = () => {}

    // Fetch the file ourselves: a missing asset comes back as the app's HTML,
    // and handing that to the runtime only produces parse errors. Anything
    // that isn't a real file keeps the fallback, quietly.
    const file = fetch(src).then((res) => {
      const type = res.headers.get('content-type') ?? ''
      if (!res.ok || type.includes('text/html')) throw new Error(`no animation at ${src}`)
      return res.arrayBuffer()
    })

    void Promise.all([loadRive(), file])
      .then(([{ Rive, Layout, Fit, Alignment, EventType }, buffer]) => {
        if (disposed) return
        const rive = new Rive({
          buffer,
          canvas,
          autoplay: false,
          layout: new Layout({ fit: Fit.Cover, alignment: Alignment.Center }),
          onLoad: () => {
            if (disposed) return
            rive.resizeDrawingSurfaceToCanvas()
            const looping = rive.stateMachineNames[0] ?? rive.animationNames[0]
            const cue = motion && rive.animationNames.includes(motion) ? motion : null
            const resting = cue ?? looping
            if (!resting) return

            // Still, not slow: every mode starts on its first frame.
            rive.scrub(resting, 0)
            rive.drawFrame()
            setReady(true)
            if (reducedMotion) return

            let onScreen = false
            let running = false
            const visible = () => onScreen && !document.hidden

            /** One-shot mode: play the motion from the top, unless it's already going. */
            const play = () => {
              if (!cue || running || !visible()) return
              running = true
              rive.stop(cue)
              rive.play(cue)
            }
            rive.on(EventType.Stop, () => {
              running = false
            })

            /** Continuous mode: run only while someone can see it. */
            const sync = () => {
              if (cue) return
              if (visible()) rive.play(looping)
              else rive.pause(looping)
            }

            const io = new IntersectionObserver(
              ([entry]) => {
                const arrived = !onScreen && entry.isIntersecting
                onScreen = entry.isIntersecting
                if (arrived) play()
                sync()
              },
              { threshold: SEEN_THRESHOLD },
            )
            io.observe(canvas)
            const ro = new ResizeObserver(() => rive.resizeDrawingSurfaceToCanvas())
            ro.observe(canvas)
            document.addEventListener('visibilitychange', sync)
            const timer = cue && replayMs ? window.setInterval(play, replayMs) : 0
            if (cue) {
              canvas.addEventListener('click', play)
              canvas.dataset.interactive = ''
            }

            cleanup = () => {
              io.disconnect()
              ro.disconnect()
              document.removeEventListener('visibilitychange', sync)
              window.clearInterval(timer)
              canvas.removeEventListener('click', play)
              delete canvas.dataset.interactive
              rive.cleanup()
            }
          },
          onLoadError: () => {
            rive.cleanup()
          },
        })
        cleanup = () => rive.cleanup()
      })
      // No runtime, or no file → the fallback simply stays.
      .catch(() => undefined)

    return () => {
      disposed = true
      cleanup()
    }
  }, [inView, src, motion, replayMs, reducedMotion])

  return (
    <div ref={frameRef} className={styles.animation}>
      {!ready && fallback}
      <canvas
        ref={canvasRef}
        className={styles.animationCanvas}
        data-ready={ready ? '' : undefined}
      />
    </div>
  )
}
