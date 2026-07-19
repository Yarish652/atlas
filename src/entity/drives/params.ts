/**
 * The temperament, quantified. Every number that shapes the entity's
 * personality lives HERE and nowhere else.
 *
 * Deliberately mutable — in dev it is exposed as `window.__atlasParams`, so
 * any value can be changed live in the console and the behaviour re-tunes on
 * the next tick (the engine reads properties at use-time, never caches).
 *
 *   __atlasParams.COMFORT.SLEEP_AT = 60     // ball becomes a napper
 *   __atlasParams.BOREDOM.DISENGAGE_AT = 20 // loses interest almost instantly
 *   __atlasParams.CAUTION.FAST_CURSOR_PX_S = 600 // becomes jumpy
 *
 * Drives are 0–100. Rates are per second. Ranges are [min, max] sampled
 * fresh per event — fixed intervals read as machinery.
 */
export const DRIVE_PARAMS = {
  CURIOSITY: {
    /** Resting point the drive decays toward. */
    BASE: 40,
    /** Growth while the cursor is alive anywhere on the page. */
    ACTIVE_GAIN_PER_S: 1.4,
    /** Even alone, interest re-accumulates — this is what wakes it up. */
    IDLE_GAIN_PER_S: 0.55,
    /** Pull toward BASE when above it. */
    DECAY_PER_S: 0.9,
    /** The cursor returning after a real absence. */
    CURSOR_APPEAR_BOOST: 20,
    /** The cursor resting on a curiosity target. */
    HOVER_BOOST: 40,
    /** Finishing an inspection empties the tank. */
    SATISFIED_DROP: 45,
    /** Ambient exploring needs at least this much. */
    EXPLORE_AT: 58,
  },
  COMFORT: {
    BASE: 55,
    /** Growth while the visitor is idle and the body is still. */
    IDLE_GAIN_PER_S: 2.2,
    /** Being engaged with is mildly uncomfortable (attention is work). */
    ACTIVE_DRAIN_PER_S: 1.1,
    /** Movement spends comfort. */
    MOVE_DRAIN_PER_S: 2.4,
    /** Comfort spends itself while asleep — this is what ends the nap. */
    SLEEP_DECAY_PER_S: 1.3,
    /** Dominant comfort above this → sleep. */
    SLEEP_AT: 75,
  },
  CAUTION: {
    BASE: 0,
    /** A violent cursor gesture near the body. */
    FAST_CURSOR_BOOST: 30,
    /** How fast is "fast", px/s. */
    FAST_CURSOR_PX_S: 1500,
    /** Within this range, speed is threatening; beyond it, scenery. */
    RADIUS_PX: 300,
    /** Fear fades quickly. */
    DECAY_PER_S: 7,
    /** Above this → back away. Interrupts anything. */
    EVADE_AT: 25,
    /** One flinch per this window — not a strobe. */
    SPIKE_COOLDOWN_MS: 4000,
  },
  PLAYFULNESS: {
    BASE: 5,
    GAIN_PER_S: 0.4,
    /** No play when tired. */
    MIN_ENERGY: 55,
    /** Dominant playfulness above this → a burst. Rare by construction. */
    PLAY_AT: 65,
    SATISFIED_DROP: 55,
  },
  BOREDOM: {
    /** Grows while engaged (following, approaching, observing). */
    ENGAGED_GAIN_PER_S: 4.5,
    DECAY_PER_S: 2.5,
    /** "Actually... not that interesting." Following ends here. */
    DISENGAGE_AT: 55,
    /** Approaches can be abandoned halfway here. */
    ABANDON_APPROACH_AT: 42,
  },
  ENERGY: {
    START: 80,
    /** Movement cost, scaled by speed. */
    MOVE_DRAIN_PER_S: 3.0,
    REST_GAIN_PER_S: 1.2,
    SLEEP_GAIN_PER_S: 5.0,
    /** Below this, comfort grows half again as fast — tired means sleepy. */
    TIRED_AT: 30,
  },
  ARBITRATION: {
    /** How often the drives compete. */
    PERIOD_MS: 1000,
    /** A challenger must beat the incumbent by this much to take over. */
    HYSTERESIS: 8,
  },
  MEMORY: {
    /** Already inspected that — not worth a second trip yet. */
    REVISIT_COOLDOWN_MS: 30_000,
    /** Waking up primes exploring: "recently slept → explore instead". */
    WAKE_CURIOSITY_BOOST: 15,
  },
  MICRO: {
    /** Cadence of tiny life signs, per context. */
    MOVING_EVERY_MS: [2200, 4200] as [number, number],
    RESTING_EVERY_MS: [6000, 14000] as [number, number],
    SLEEPING_EVERY_MS: [20000, 40000] as [number, number],
    WATCHING_EVERY_MS: [2500, 5000] as [number, number],
  },
  EXPLORE: {
    /** How far afield an ambient wander goes. */
    RANGE_PX: 420,
    /** How long an inspection holds attention. */
    INSPECT_MS: [1800, 3600] as [number, number],
    /** Chance the wander aims at a real target instead of empty floor. */
    TARGET_CHANCE: 0.4,
    /** Give up on a wander that somehow takes too long. */
    MAX_MS: 12_000,
  },
  EVADE: {
    /** How far it backs away from a threatening cursor. */
    BACK_OFF_PX: [70, 120] as [number, number],
    /** The wary stare afterwards. */
    WATCH_MS: [1200, 2400] as [number, number],
  },
  PLAY: {
    /** A burst is one or two little hops. */
    HOP_VY: [-300, -380] as [number, number],
    HOP_VX: 60,
    /** Never play within this distance of a drop edge. */
    EDGE_MARGIN_PX: 70,
  },
  SLEEP: {
    /** Naps have a minimum dignity. */
    MIN_MS: 6000,
    /** A cursor this close wakes it regardless of drives. */
    NEAR_WAKE_PX: 110,
  },
}
