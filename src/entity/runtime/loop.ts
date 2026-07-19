/**
 * The frame driver. One rAF for the entire system.
 *
 * Runs at display rate: the entity's motion is continuous easing, and easing
 * at 30Hz visibly stutters where a pose-based sprite never did. Stopping means
 * cancelAnimationFrame, not a flag check — a paused entity must cost nothing.
 */
export type Loop = {
  start(): void
  stop(): void
  isRunning(): boolean
}

/** A tab restored after minutes would otherwise hand us one enormous dt. */
const MAX_DT_MS = 64

export function createLoop(tick: (dt: number) => void): Loop {
  let handle = 0
  let running = false
  let last = 0

  const frame = (t: number) => {
    handle = requestAnimationFrame(frame)
    if (last === 0) {
      last = t
      return
    }
    const dt = Math.min(t - last, MAX_DT_MS)
    last = t
    tick(dt)
  }

  return {
    start() {
      if (running) return
      running = true
      last = 0
      handle = requestAnimationFrame(frame)
    },
    stop() {
      if (!running) return
      running = false
      cancelAnimationFrame(handle)
    },
    isRunning: () => running,
  }
}
