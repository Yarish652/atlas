/**
 * The behaviour clock.
 *
 * Separate from the frame clock, and pausable. Reaction delays and dwell
 * timers are measured against this, never counted in frames — a dropped frame
 * must not slow the entity's life down, and a tab hidden for ten minutes must
 * not come back with every timer expired at once. While paused, time simply
 * does not pass.
 */
export type Clock = {
  now(): number
  pause(): void
  /** Resumes and reports how long the pause lasted, in real ms. */
  resume(): number
  isPaused(): boolean
}

export function createClock(): Clock {
  let pausedAt: number | null = null
  let pausedTotal = 0

  return {
    now: () => (pausedAt ?? performance.now()) - pausedTotal,

    pause() {
      if (pausedAt === null) pausedAt = performance.now()
    },

    resume() {
      if (pausedAt === null) return 0
      const elapsed = performance.now() - pausedAt
      pausedTotal += elapsed
      pausedAt = null
      return elapsed
    },

    isPaused: () => pausedAt !== null,
  }
}
