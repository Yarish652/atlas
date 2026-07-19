import type { StateId } from '../stateMachine/states'
import { DRIVE_PARAMS as P } from './params'

/**
 * The drive engine: five internal drives and an energy budget. The mind's
 * chemistry, separate from the mind's decisions.
 *
 * None of these mention the cursor's meaning — the cursor merely influences
 * them (appearing feeds curiosity, violence feeds caution, absence feeds
 * comfort). Every second the drives compete; the brain reads the winner and
 * expresses it. Losing drives keep accumulating, so behaviour cycles by
 * itself: comfort wins → sleep → comfort spends itself → curiosity wins →
 * wake, look around, wander. Life, without any user input.
 *
 * All tuning lives in `params.ts` and is read at use-time — mutate the table
 * and the temperament changes on the next tick.
 */

export type DriveId = 'curiosity' | 'comfort' | 'caution' | 'playfulness' | 'boredom'

export type DriveContext = {
  state: StateId
  /** Cursor exists and moved recently. */
  pointerActive: boolean
  /** Smoothed cursor speed, px/s. */
  pointerSpeed: number
  /** Cursor distance from the body, px. Infinity if never seen. */
  pointerDist: number
  /** Body speed over cruise, 0–1. */
  speedRatio: number
}

export type DriveEvent =
  | 'hover' // cursor rests on a curiosity target
  | 'satisfied' // finished inspecting something
  | 'played' // burst complete
  | 'woke' // nap over — primes exploring

export type Drives = {
  update(dt: number, ctx: DriveContext): void
  note(event: DriveEvent): void
  levels(): Record<DriveId, number>
  energy(): number
  /** The current winner among the ambient drives. Sticky via hysteresis. */
  dominant(): DriveId
  /** Caution crossed its threshold — one flinch per cooldown. Consumes. */
  takeCautionSpike(): boolean
}

const clamp = (v: number) => Math.max(0, Math.min(100, v))

/** States in which the entity is actively engaged with the visitor. */
const ENGAGED: ReadonlySet<StateId> = new Set(['FOLLOW', 'APPROACH', 'OBSERVE'])

export function createDrives(): Drives {
  let curiosity = P.CURIOSITY.BASE
  let comfort = P.COMFORT.BASE
  let caution = P.CAUTION.BASE
  let playfulness = P.PLAYFULNESS.BASE
  let boredom = 0
  let energy = P.ENERGY.START

  let incumbent: DriveId = 'comfort'
  let nextArbitrationMs = 0
  let sinceMs = 0
  let wasPointerActive = false
  let pointerInactiveMs = 60_000
  let cautionSpike = false
  let lastSpikeAtMs = -Infinity

  return {
    update(dt, ctx) {
      const s = dt / 1000
      sinceMs += dt

      // ── Curiosity ──────────────────────────────────────────────────────
      if (ctx.pointerActive) curiosity += P.CURIOSITY.ACTIVE_GAIN_PER_S * s
      else curiosity += P.CURIOSITY.IDLE_GAIN_PER_S * s
      // Sleep restores wonder: no decay while asleep, so a long nap always
      // ends in curiosity winning — wake, look around, wander. That cycle
      // IS the life; without this the sleeper wakes indifferent and naps
      // again forever.
      if (curiosity > P.CURIOSITY.BASE && ctx.state !== 'SLEEP') {
        curiosity -= P.CURIOSITY.DECAY_PER_S * s
      }
      // The cursor returning after a real absence is an event.
      if (ctx.pointerActive && !wasPointerActive && pointerInactiveMs > 5000) {
        curiosity += P.CURIOSITY.CURSOR_APPEAR_BOOST
      }
      if (ctx.pointerActive) pointerInactiveMs = 0
      else pointerInactiveMs += dt
      wasPointerActive = ctx.pointerActive

      // ── Comfort ────────────────────────────────────────────────────────
      const tired = energy < P.ENERGY.TIRED_AT
      if (ctx.state === 'SLEEP') {
        comfort -= P.COMFORT.SLEEP_DECAY_PER_S * s
      } else if (!ctx.pointerActive && ctx.speedRatio < 0.05) {
        comfort += P.COMFORT.IDLE_GAIN_PER_S * (tired ? 1.5 : 1) * s
      } else if (ctx.pointerActive) {
        comfort -= P.COMFORT.ACTIVE_DRAIN_PER_S * s
      }
      comfort -= P.COMFORT.MOVE_DRAIN_PER_S * ctx.speedRatio * s

      // ── Caution ────────────────────────────────────────────────────────
      if (
        ctx.pointerSpeed > P.CAUTION.FAST_CURSOR_PX_S &&
        ctx.pointerDist < P.CAUTION.RADIUS_PX &&
        sinceMs - lastSpikeAtMs > P.CAUTION.SPIKE_COOLDOWN_MS
      ) {
        caution += P.CAUTION.FAST_CURSOR_BOOST
        if (caution >= P.CAUTION.EVADE_AT) {
          cautionSpike = true
          lastSpikeAtMs = sinceMs
        }
      }
      caution -= P.CAUTION.DECAY_PER_S * s

      // ── Playfulness ────────────────────────────────────────────────────
      if (energy > P.PLAYFULNESS.MIN_ENERGY) playfulness += P.PLAYFULNESS.GAIN_PER_S * s

      // ── Boredom ────────────────────────────────────────────────────────
      if (ENGAGED.has(ctx.state)) boredom += P.BOREDOM.ENGAGED_GAIN_PER_S * s
      else boredom -= P.BOREDOM.DECAY_PER_S * s

      // ── Energy ─────────────────────────────────────────────────────────
      if (ctx.state === 'SLEEP') energy += P.ENERGY.SLEEP_GAIN_PER_S * s
      else if (ctx.speedRatio < 0.05) energy += P.ENERGY.REST_GAIN_PER_S * s
      energy -= P.ENERGY.MOVE_DRAIN_PER_S * ctx.speedRatio * s

      curiosity = clamp(curiosity)
      comfort = clamp(comfort)
      caution = clamp(caution)
      playfulness = clamp(playfulness)
      boredom = clamp(boredom)
      energy = clamp(energy)

      // ── Arbitration: the ambient drives compete on a slow clock. ───────
      if (sinceMs >= nextArbitrationMs) {
        nextArbitrationMs = sinceMs + P.ARBITRATION.PERIOD_MS
        const table: Array<[DriveId, number]> = [
          ['curiosity', curiosity],
          ['comfort', comfort],
          ['playfulness', playfulness],
          ['boredom', boredom],
        ]
        table.sort((a, b) => b[1] - a[1])
        const [challengerId, challengerLevel] = table[0]
        const incumbentLevel = table.find(([id]) => id === incumbent)?.[1] ?? 0
        // The incumbent keeps the crown unless clearly beaten — flip-flopping
        // moods read as a broken thermostat, not an animal.
        if (challengerId !== incumbent && challengerLevel > incumbentLevel + P.ARBITRATION.HYSTERESIS) {
          incumbent = challengerId
        }
      }
    },

    note(event) {
      switch (event) {
        case 'hover':
          curiosity = clamp(curiosity + P.CURIOSITY.HOVER_BOOST)
          return
        case 'satisfied':
          curiosity = clamp(curiosity - P.CURIOSITY.SATISFIED_DROP)
          boredom = clamp(boredom - 15)
          return
        case 'played':
          playfulness = clamp(playfulness - P.PLAYFULNESS.SATISFIED_DROP)
          comfort = clamp(comfort + 8)
          return
        case 'woke':
          curiosity = clamp(curiosity + P.MEMORY.WAKE_CURIOSITY_BOOST)
          return
      }
    },

    levels: () => ({ curiosity, comfort, caution, playfulness, boredom }),
    energy: () => energy,
    dominant: () => incumbent,

    takeCautionSpike() {
      if (!cautionSpike) return false
      cautionSpike = false
      return true
    },
  }
}
