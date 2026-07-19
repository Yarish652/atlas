import type { DocPoint } from '../types'
import type { Machine } from '../stateMachine/machine'
import type { Movement } from '../movement/movement'
import type { Interaction } from '../interaction/manager'
import type { Env } from '../interaction/env'
import type { Clock } from '../runtime/clock'
import type { TargetId } from '../interaction/map'
import type { Drives } from '../drives/drives'
import type { MicroKind } from '../renderer/renderer'
import { GRAVITY_PX_S2 } from '../movement/movement'
import { DRIVE_PARAMS as P } from '../drives/params'
import { TARGET_SELECTORS } from '../interaction/map'
import { BEHAVIOR, sample } from './config'

/**
 * The brain: the only layer that decides anything.
 *
 * It reads the senses (Interaction), the chemistry (Drives), and what it is
 * currently doing (Machine), and issues movement orders. The drives never
 * act — they only lean on the decisions made here: the dominant drive picks
 * the ambient behaviour, boredom ends engagements, comfort deepens the
 * ignore roll, caution interrupts everything.
 *
 * Every reaction keeps the same shape: delay → decision → movement → settle.
 * Nothing reacts instantly, on principle — and not everything finishes what
 * it started, also on principle.
 */

export type Brain = {
  /** Run one decision step. Called every tick, before movement integrates. */
  update(): void
  /** Movement reports a completed trip. */
  onArrived(): void
  /** What the entity is paying attention to, for the renderer's gaze. */
  look(): DocPoint | null
}

export type BrainDeps = {
  machine: Machine
  movement: Movement
  interaction: Interaction
  clock: Clock
  drives: Drives
  env(): Env
  rng(): number
  /** Fire a 0.2s life sign on the body. */
  micro(kind: MicroKind): void
  /** The way up, if the world has one. */
  clouds?: {
    catchable(from: DocPoint): { id: string; x: number; y: number; vx: number } | null
    isRising(id: string): boolean
  }
}

function distance(a: DocPoint, b: DocPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function createBrain({
  machine,
  movement,
  interaction,
  clock,
  drives,
  env,
  rng,
  micro,
  clouds,
}: BrainDeps): Brain {
  // ── Decision memory. Lives here, never in the machine. ──────────────────
  let noticeReadyAt = 0
  let willIgnore = false
  let followAfterMs = 0
  let ignoredUntil = -Infinity
  let curiosityTarget: TargetId | null = null
  let departAt = 0
  let observeUntil = 0
  let lastHopAt = -Infinity

  // Simple memory: what has already been inspected, and when. Enough to
  // stop the loop feeling repetitive; nothing resembling learning.
  const visitedAt = new Map<TargetId, number>()

  // SLEEP / EXPLORE / EVADE / PLAY bookkeeping.
  let sleepMinUntil = 0
  let exploreSpot: DocPoint | null = null
  let exploreLookAt: DocPoint | null = null
  let exploreTargetId: TargetId | null = null
  let exploreInspectUntil = 0
  let exploreDeadline = 0
  let evadeWatchUntil = 0
  let playHopsLeft = 0
  let nextPlayHopAt = 0

  // Micro-behaviour scheduling.
  let nextMicroAt = 0
  let lastMicroClass = ''

  // Hover tracking: how long the cursor has held on one target.
  let hover: TargetId | null = null
  let hoverSince = 0
  let curiosityAfterMs = 0

  function trackHover() {
    const h = interaction.hovered()
    if (h !== hover) {
      hover = h
      hoverSince = clock.now()
      if (h) {
        curiosityAfterMs = sample(rng, BEHAVIOR.CURIOSITY_HOVER_MS)
        drives.note('hover')
      }
    }
  }

  /** Hover held long enough that curiosity commits — unless it remembers. */
  function curiosityCommitted(): TargetId | null {
    if (!hover) return null
    // Already inspected that recently. Not worth a second trip yet.
    const seen = visitedAt.get(hover)
    if (seen !== undefined && clock.now() - seen < P.MEMORY.REVISIT_COOLDOWN_MS) return null
    return clock.now() - hoverSince >= curiosityAfterMs ? hover : null
  }

  /** The shared entry into APPROACH: decide, then hesitate, then go. */
  function approach(target: TargetId): boolean {
    const spot = interaction.beside(target)
    if (!spot || Math.abs(spot.y - movement.pos().y) > 4) return false
    if (!machine.to('APPROACH')) return false
    curiosityTarget = target
    departAt = clock.now() + sample(rng, BEHAVIOR.DEPART_DELAY_MS)
    return true
  }

  function pointerActive(): boolean {
    return interaction.pointer() !== null && interaction.pointerIdleMs() < BEHAVIOR.POINTER_IDLE_MS
  }

  function noticeworthy(): boolean {
    return pointerActive() || hover !== null
  }

  /**
   * Comfort deepens the snub, curiosity thins it. A settled, comfortable
   * body ignores you more; a curious one can't help itself.
   */
  function ignoreChance(): number {
    const l = drives.levels()
    return Math.max(0.02, Math.min(0.6, BEHAVIOR.IGNORE_CHANCE + (l.comfort - l.curiosity) * 0.003))
  }

  /** Caution won: back away from the cursor along the floor, then stare. */
  function startEvade(): boolean {
    const p = interaction.pointer()
    const sup = movement.support()
    if (!p || !sup) return false
    if (!machine.to('EVADE')) return false
    const away = movement.pos().x >= p.x ? 1 : -1
    const back = sample(rng, P.EVADE.BACK_OFF_PX)
    const x = Math.min(sup.maxX - 10, Math.max(sup.minX + 10, movement.pos().x + away * back))
    movement.setTarget({ x, y: sup.y })
    evadeWatchUntil = 0
    return true
  }

  /** Curiosity won with nobody around: go look at something. */
  function startExplore(): boolean {
    const sup = movement.support()
    if (!sup) return false
    const pos = movement.pos()

    // Sometimes the wander has a subject: an unvisited target on this floor.
    exploreTargetId = null
    exploreLookAt = null
    let spot: DocPoint | null = null
    if (rng() < P.EXPLORE.TARGET_CHANCE) {
      const ids = Object.keys(TARGET_SELECTORS) as TargetId[]
      for (const id of ids.sort(() => rng() - 0.5)) {
        const seen = visitedAt.get(id)
        if (seen !== undefined && clock.now() - seen < P.MEMORY.REVISIT_COOLDOWN_MS) continue
        const beside = interaction.beside(id)
        if (!beside || Math.abs(beside.y - pos.y) > 4) continue
        if (Math.abs(beside.x - pos.x) < 60) continue
        spot = beside
        exploreTargetId = id
        exploreLookAt = interaction.center(id)
        break
      }
    }
    if (!spot) {
      const range = P.EXPLORE.RANGE_PX
      const x = Math.min(sup.maxX - 10, Math.max(sup.minX + 10, pos.x + (rng() * 2 - 1) * range))
      if (Math.abs(x - pos.x) < 60) return false
      spot = { x, y: sup.y }
    }
    if (!machine.to('EXPLORE')) return false
    exploreSpot = spot
    exploreInspectUntil = 0
    exploreDeadline = clock.now() + P.EXPLORE.MAX_MS
    movement.setTarget(spot)
    return true
  }

  /** Playfulness won: a hop or two, then done. Rare, short, never at edges. */
  function startPlay(): boolean {
    const sup = movement.support()
    if (!sup) return false
    const pos = movement.pos()
    const margin = P.PLAY.EDGE_MARGIN_PX
    if (pos.x < sup.minX + margin || pos.x > sup.maxX - margin) return false
    if (!machine.to('PLAY')) return false
    playHopsLeft = rng() < 0.5 ? 2 : 1
    nextPlayHopAt = 0
    return true
  }

  function playHop() {
    const sup = movement.support()
    const pos = movement.pos()
    const center = sup ? (sup.minX + sup.maxX) / 2 : pos.x
    const toward = center >= pos.x ? 1 : -1
    movement.hop(toward * P.PLAY.HOP_VX * (0.4 + rng() * 0.6), sample(rng, P.PLAY.HOP_VY))
  }

  /** The tiny life signs, scheduled per context. This is the gold mine. */
  function microTick(now: number) {
    const st = machine.state()
    const moving = movement.phase() === 'moving'
    let cadence: readonly [number, number]
    let kinds: MicroKind[]
    let cls: string
    if (st === 'SLEEP') {
      cadence = P.MICRO.SLEEPING_EVERY_MS
      kinds = ['twitch']
      cls = 'sleep'
    } else if (moving) {
      cadence = P.MICRO.MOVING_EVERY_MS
      kinds = ['glance']
      cls = 'move'
    } else if (st === 'ALERT' || st === 'OBSERVE' || st === 'EVADE' || st === 'FOLLOW') {
      cadence = P.MICRO.WATCHING_EVERY_MS
      kinds = ['blink', 'glance']
      cls = 'watch'
    } else {
      cadence = P.MICRO.RESTING_EVERY_MS
      kinds = ['blink', 'adjust', 'glance']
      cls = 'rest'
    }
    if (cls !== lastMicroClass) {
      lastMicroClass = cls
      nextMicroAt = now + sample(rng, cadence)
      return
    }
    if (now >= nextMicroAt) {
      micro(kinds[Math.floor(rng() * kinds.length)])
      nextMicroAt = now + sample(rng, cadence)
    }
  }

  return {
    update() {
      trackHover()
      const now = clock.now()
      microTick(now)

      // Mid-air, decisions wait. You cannot change your mind while falling.
      if (movement.airborne()) return

      // Caution interrupts anything on the ground. Fear is not polite.
      if (drives.takeCautionSpike() && startEvade()) return

      switch (machine.state()) {
        case 'REST': {
          const home = interaction.home()
          if (
            !movement.moving() &&
            Math.abs(home.y - movement.pos().y) < 4 &&
            distance(movement.pos(), home) > 6
          ) {
            movement.setTarget(home)
          }
          if (env().finePointer) {
            if (performance.now() >= ignoredUntil || hover) {
              if (noticeworthy() && machine.to('NOTICE')) {
                noticeReadyAt = now + sample(rng, BEHAVIOR.NOTICE_DELAY_MS)
                willIgnore = hover === null && rng() < ignoreChance()
                return
              }
            }
          }

          // ── Ambient life: with nobody around, the drives take over. ────
          if (noticeworthy() || movement.moving()) return
          const l = drives.levels()
          switch (drives.dominant()) {
            case 'comfort':
              if (l.comfort >= P.COMFORT.SLEEP_AT && machine.to('SLEEP')) {
                sleepMinUntil = now + P.SLEEP.MIN_MS
              }
              return
            case 'curiosity':
              if (l.curiosity >= P.CURIOSITY.EXPLORE_AT) startExplore()
              return
            case 'playfulness':
              if (l.playfulness >= P.PLAYFULNESS.PLAY_AT && drives.energy() > P.PLAYFULNESS.MIN_ENERGY) {
                startPlay()
              }
              return
            default:
              return
          }
        }

        case 'NOTICE': {
          if (!noticeworthy()) {
            machine.to('REST')
            return
          }
          if (now >= noticeReadyAt) {
            if (willIgnore && hover === null) {
              ignoredUntil = performance.now() + sample(rng, BEHAVIOR.IGNORE_COOLDOWN_MS)
              machine.to('REST')
            } else if (machine.to('ALERT')) {
              followAfterMs = sample(rng, BEHAVIOR.FOLLOW_AFTER_MS)
            }
          }
          return
        }

        case 'ALERT': {
          const committed = curiosityCommitted()
          if (committed && approach(committed)) return
          if (!noticeworthy()) {
            machine.to('REST')
            return
          }
          if (machine.elapsed() > followAfterMs && pointerActive()) {
            machine.to('FOLLOW')
          }
          return
        }

        case 'FOLLOW': {
          const committed = curiosityCommitted()
          if (committed && approach(committed)) return

          // "Actually... not that interesting." Attention decays; boredom
          // accumulates while engaged and eventually wins.
          if (drives.levels().boredom >= P.BOREDOM.DISENGAGE_AT) {
            machine.to('RETURN')
            return
          }

          const p = interaction.pointer()
          const engaged = p !== null && interaction.pointerIdleMs() < BEHAVIOR.POINTER_IDLE_MS
          if (!engaged) {
            machine.to('RETURN')
            return
          }

          const cur = movement.support()
          if (!cur) return
          if (clouds?.isRising(cur.id)) return
          const dest = interaction.surfaceFor(p)

          if (dest && dest.y < cur.y - 4 && now - lastHopAt > 2500) {
            const cloud = clouds?.catchable(movement.pos())
            if (cloud) {
              const pos = movement.pos()
              const h = pos.y - cloud.y
              if (h > 0) {
                const vy0 = Math.sqrt(2 * GRAVITY_PX_S2 * (h + 46))
                const disc = Math.sqrt(Math.max(0, vy0 * vy0 - 2 * GRAVITY_PX_S2 * h))
                const t = (vy0 + disc) / GRAVITY_PX_S2
                const vx = Math.max(-420, Math.min(420, (cloud.x + cloud.vx * t - pos.x) / t))
                lastHopAt = now
                movement.hop(vx, -vy0)
                return
              }
            }
          }

          if (dest && dest.y > cur.y + 4) {
            const edge =
              cur.leftEdge === 'drop' && cur.rightEdge === 'drop'
                ? p.x < movement.pos().x
                  ? 'left'
                  : 'right'
                : cur.leftEdge === 'drop'
                  ? 'left'
                  : cur.rightEdge === 'drop'
                    ? 'right'
                    : null
            if (edge) {
              movement.setTarget({
                x: edge === 'left' ? cur.minX - 24 : cur.maxX + 24,
                y: cur.y,
              })
              return
            }
          }

          const shadow = Math.min(cur.maxX, Math.max(cur.minX, p.x))
          if (Math.abs(shadow - movement.pos().x) > BEHAVIOR.FOLLOW_GAP_PX) {
            const side = movement.pos().x > shadow ? 1 : -1
            const x = Math.min(
              cur.maxX,
              Math.max(cur.minX, shadow + side * BEHAVIOR.FOLLOW_GAP_PX * 0.6),
            )
            movement.setTarget({ x, y: cur.y })
          }
          return
        }

        case 'APPROACH': {
          if (curiosityTarget === null) {
            machine.to('RETURN')
            return
          }
          if (interaction.userIdleMs() > BEHAVIOR.BORED_MS) {
            machine.to('RETURN')
            return
          }
          // The imperfection: sometimes it walks halfway and loses interest.
          const l = drives.levels()
          if (
            machine.elapsed() > 1200 &&
            (l.curiosity < 22 || l.boredom >= P.BOREDOM.ABANDON_APPROACH_AT) &&
            rng() < 0.01
          ) {
            machine.to('RETURN')
            return
          }
          if (now >= departAt) {
            const beside = interaction.beside(curiosityTarget)
            if (!beside || Math.abs(beside.y - movement.pos().y) > 4) {
              machine.to('RETURN')
              return
            }
            movement.setTarget(beside)
          }
          return
        }

        case 'OBSERVE': {
          const committed = curiosityCommitted()
          if (committed && committed !== curiosityTarget && approach(committed)) return
          if (hover === curiosityTarget && hover !== null) {
            observeUntil = Math.max(observeUntil, now + 1500)
          }
          if (now >= observeUntil || interaction.userIdleMs() > BEHAVIOR.BORED_MS) {
            if (curiosityTarget) visitedAt.set(curiosityTarget, now)
            drives.note('satisfied')
            machine.to('RETURN')
          }
          return
        }

        case 'RETURN': {
          const committed = curiosityCommitted()
          if (committed && approach(committed)) return
          const home = interaction.home()
          if (Math.abs(home.y - movement.pos().y) > 4) {
            movement.setTarget({ x: movement.pos().x, y: movement.pos().y })
          } else {
            movement.setTarget(home)
          }
          return
        }

        case 'SLEEP': {
          if (now < sleepMinUntil) return
          const l = drives.levels()
          const p = interaction.pointer()
          const nearCursor =
            p !== null && pointerActive() && distance(p, movement.pos()) < P.SLEEP.NEAR_WAKE_PX
          // Wake when comfort has spent itself, or something is worth it.
          if (l.curiosity > l.comfort || hover !== null || nearCursor) {
            if (machine.to('REST')) {
              drives.note('woke')
              // Groggy: don't snap straight into noticing.
              ignoredUntil = performance.now() + 900
            }
          }
          return
        }

        case 'EXPLORE': {
          const committed = curiosityCommitted()
          if (committed && approach(committed)) return
          if (now > exploreDeadline) {
            machine.to('REST')
            return
          }
          if (exploreInspectUntil > 0 && now >= exploreInspectUntil) {
            if (exploreTargetId) visitedAt.set(exploreTargetId, now)
            drives.note('satisfied')
            machine.to('REST')
          }
          return
        }

        case 'EVADE': {
          if (evadeWatchUntil > 0 && now >= evadeWatchUntil) {
            // The stare resolves: back to watching properly.
            if (machine.to('ALERT')) followAfterMs = sample(rng, BEHAVIOR.FOLLOW_AFTER_MS)
          }
          return
        }

        case 'PLAY': {
          if (playHopsLeft > 0) {
            if (now >= nextPlayHopAt) {
              playHopsLeft--
              nextPlayHopAt = now + 420
              playHop()
            }
            return
          }
          drives.note('played')
          machine.to('REST')
          return
        }
      }
    },

    onArrived() {
      switch (machine.state()) {
        case 'APPROACH':
          if (machine.to('OBSERVE')) {
            observeUntil = clock.now() + sample(rng, BEHAVIOR.OBSERVE_MS)
          }
          return
        case 'RETURN':
          machine.to('REST')
          curiosityTarget = null
          return
        case 'EXPLORE':
          // Arrived at the wander's spot: inspect it for a while.
          exploreInspectUntil = clock.now() + sample(rng, P.EXPLORE.INSPECT_MS)
          return
        case 'EVADE':
          // Backed off. Now the wary stare.
          evadeWatchUntil = clock.now() + sample(rng, P.EVADE.WATCH_MS)
          return
        default:
          return
      }
    },

    look() {
      switch (machine.state()) {
        case 'ALERT':
        case 'FOLLOW':
        case 'EVADE':
          return interaction.pointer()
        case 'APPROACH':
        case 'OBSERVE':
          return curiosityTarget ? interaction.center(curiosityTarget) : null
        case 'EXPLORE':
          // While inspecting, look at the subject; while walking, ahead.
          return exploreInspectUntil > 0 ? (exploreLookAt ?? exploreSpot) : null
        default:
          return null
      }
    },
  }
}
