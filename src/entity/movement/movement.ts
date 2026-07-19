import type { DocPoint, Surface, Terrain, Vec } from '../types'

/**
 * Movement: how the entity crosses space. Pure mechanics — it knows nothing
 * about states, targets' meanings, or the DOM. It is given a Terrain and a
 * destination, and produces a believable body: crouch, push off, cruise,
 * brake, land, settle — and now fall, bounce and roll, because the world has
 * gravity.
 *
 * Two regimes:
 *   grounded — rolling along a surface toward the target. Capped
 *              acceleration, √(2·brake·d) approach, underdamped spring stop.
 *   airborne — ballistics. Gravity, preserved horizontal momentum, wall
 *              reflections, restitution on landing. Steering has no
 *              authority here; you cannot change your mind mid-air.
 *
 * Rolling off a 'drop' edge is the only door from grounded to airborne;
 * landing is the only door back.
 */

/** Exported so the brain can compute jump arcs in the same gravity. */
export const GRAVITY_PX_S2 = 2200

const TUNING = {
  /** Cruise ceiling. Fast enough to feel willing, slow enough to feel small. */
  MAX_SPEED_PX_S: 300,
  /** How eagerly it gets going. */
  ACCEL_PX_S2: 620,
  /** How gently it stops. Lower than accel: braking reads as intention. */
  BRAKE_PX_S2: 380,
  /** The crouch before push-off. Anticipation is what sells self-propulsion. */
  ANTICIPATION_MS: 150,
  /** Micro-corrections don't wind up first — nothing crouches to drift 10px. */
  ANTICIPATION_MIN_TRIP_PX: 48,
  /** Inside this radius, steering hands over to the landing spring. */
  SETTLE_RADIUS_PX: 18,
  /** Landing spring. ζ < 1 on purpose: a few px of overshoot, one soft return. */
  SPRING_OMEGA_RAD_S: 16,
  SPRING_ZETA: 0.72,
  /** Close enough, slow enough → at rest. */
  ARRIVE_EPSILON_PX: 0.6,
  ARRIVE_SPEED_PX_S: 8,
  /** Effort smoothing rate. Raw per-frame accel is too twitchy to render. */
  EFFORT_SMOOTH_PER_S: 12,

  // ── The world's physics ────────────────────────────────────────────────
  GRAVITY_PX_S2: GRAVITY_PX_S2,
  MAX_FALL_PX_S: 1300,
  /** How much of the horizontal momentum a wall gives back. */
  WALL_RESTITUTION: 0.45,
  /** How much of the vertical momentum a floor gives back. */
  BOUNCE_RESTITUTION: 0.36,
  /** Impacts slower than this don't bounce — they just land. */
  BOUNCE_MIN_PX_S: 280,
  /** Rolling out of a landing sheds a little speed to the floor. */
  LANDING_FRICTION: 0.85,
} as const

export type Phase = 'still' | 'anticipating' | 'moving' | 'settling' | 'airborne'

export type MotionEvent =
  /** A commanded trip ended at its target. */
  | { kind: 'arrived'; traveled: number }
  /** The body hit a floor. `impact` is the vertical speed it arrived with. */
  | { kind: 'landed'; impact: number }

export type Movement = {
  pos(): DocPoint
  /** 0–1 over cruise speed (falls can exceed cruise; clamped). */
  speedRatio(): number
  /** Unit direction of travel, or null when still. */
  heading(): Vec | null
  phase(): Phase
  airborne(): boolean
  /** The surface currently underfoot, or null mid-air. */
  support(): Surface | null
  /**
   * Signed horizontal path distance, px, accumulated forever. The renderer
   * rolls the body by this over its radius (θ = d / r). Horizontal because
   * floors are horizontal — vertical travel spins nothing on its own.
   */
  rollDistance(): number
  /** Smoothed longitudinal effort: +1 hard acceleration … −1 hard braking. */
  effort(): number
  moving(): boolean
  target(): DocPoint | null
  setTarget(p: DocPoint): void
  /** Teleport onto solid ground. Spawn and freeze only. */
  place(p: DocPoint): void
  /**
   * Leap: leave the ground with this velocity (vy negative = up). The only
   * way the body ever gains height. Cancels any current trip — you cannot
   * be walking somewhere and airborne.
   */
  hop(vx: number, vy: number): void
  /** Advance by dt ms. */
  update(dt: number): MotionEvent | null
}

export function createMovement(spawn: DocPoint, terrain: Terrain): Movement {
  const pos: DocPoint = { x: spawn.x, y: spawn.y }
  const vel: Vec = { x: 0, y: 0 }
  let target: DocPoint | null = null
  let support: Surface | null = null
  // Spawning mid-air is legitimate — gravity resolves it into an entrance.
  let airborne = true
  let traveled = 0
  let anticipateLeftMs = 0
  let rollDist = 0
  let effort = 0
  let prevSpeed = 0

  const speed = () => Math.hypot(vel.x, vel.y)

  function phase(): Phase {
    if (airborne) return 'airborne'
    if (target === null) return 'still'
    if (anticipateLeftMs > 0) return 'anticipating'
    const dist = Math.hypot(target.x - pos.x, target.y - pos.y)
    return dist <= TUNING.SETTLE_RADIUS_PX ? 'settling' : 'moving'
  }

  function updateEffort(s: number) {
    const now = speed()
    const raw = s > 0 ? Math.max(-1, Math.min(1, (now - prevSpeed) / s / TUNING.ACCEL_PX_S2)) : 0
    prevSpeed = now
    const k = Math.min(1, TUNING.EFFORT_SMOOTH_PER_S * s)
    effort += (raw - effort) * k
  }

  /** Advance ballistically. Returns a landing event when a floor is met. */
  function stepAirborne(s: number): MotionEvent | null {
    vel.y = Math.min(vel.y + TUNING.GRAVITY_PX_S2 * s, TUNING.MAX_FALL_PX_S)

    const prevY = pos.y
    let nx = pos.x + vel.x * s
    const ny = pos.y + vel.y * s

    // The page is a box: its edges give momentum back.
    const w = terrain.walls()
    if (nx < w.left) {
      nx = w.left
      vel.x = -vel.x * TUNING.WALL_RESTITUTION
    } else if (nx > w.right) {
      nx = w.right
      vel.x = -vel.x * TUNING.WALL_RESTITUTION
    }

    // Landing: the first floor crossed this tick. Checking against the
    // nearest-below-start prevents tunnelling through a card at high speed.
    const floor = vel.y > 0 ? terrain.firstBelow(nx, prevY - 1) : null
    if (floor && floor.y <= ny) {
      rollDist += nx - pos.x
      traveled += Math.hypot(nx - pos.x, floor.y - prevY)
      pos.x = nx
      pos.y = floor.y
      const impact = vel.y
      if (impact > TUNING.BOUNCE_MIN_PX_S) {
        // Too hot to stick: give some back and hop. The floor takes a bite
        // of the horizontal momentum too — a bouncing ball skids, it does
        // not glide, and unchecked carry can hop it across the next gap.
        vel.y = -impact * TUNING.BOUNCE_RESTITUTION
        vel.x *= TUNING.LANDING_FRICTION
      } else {
        vel.y = 0
        vel.x *= TUNING.LANDING_FRICTION
        airborne = false
        support = floor
      }
      return { kind: 'landed', impact }
    }

    rollDist += nx - pos.x
    traveled += Math.hypot(nx - pos.x, ny - prevY)
    pos.x = nx
    pos.y = ny
    return null
  }

  /** Roll along the support toward the target; fall off drops, bounce off walls. */
  function stepGrounded(s: number): MotionEvent | null {
    // Re-resolve support from live geometry so a small reflow carries the
    // body with its floor. A big reflow (fonts landing, content loading) can
    // move the floor beyond tolerance — then the floor is simply no longer
    // under us, and the honest answer is to fall onto wherever it went.
    const current = terrain.supportAt(pos.x, pos.y, support?.id)
    if (!current) {
      airborne = true
      support = null
      vel.y = 0
      return null
    }
    support = current
    pos.y = current.y
    // A moving surface carries what stands on it. No roll: the floor moves
    // with the body, so nothing turns.
    if (current.carryVx) pos.x += current.carryVx * s

    if (target === null) return null

    if (anticipateLeftMs > 0) {
      anticipateLeftMs -= s * 1000
      return null
    }

    const dx = target.x - pos.x
    const dy = target.y - pos.y
    const dist = Math.hypot(dx, dy)

    if (dist > TUNING.SETTLE_RADIUS_PX) {
      // Seek at the braking curve's speed limit.
      const brakeSpeed = Math.sqrt(2 * TUNING.BRAKE_PX_S2 * dist)
      const desiredSpeed = Math.min(TUNING.MAX_SPEED_PX_S, brakeSpeed)
      const desiredX = (dx / dist) * desiredSpeed
      const desiredY = (dy / dist) * desiredSpeed
      const steerX = desiredX - vel.x
      const steerY = desiredY - vel.y
      const steer = Math.hypot(steerX, steerY)
      const maxSteer = TUNING.ACCEL_PX_S2 * s
      if (steer > maxSteer) {
        vel.x += (steerX / steer) * maxSteer
        vel.y += (steerY / steer) * maxSteer
      } else {
        vel.x = desiredX
        vel.y = desiredY
      }
    } else {
      // The landing spring finishes the trip.
      const w = TUNING.SPRING_OMEGA_RAD_S
      const c = 2 * TUNING.SPRING_ZETA * w
      vel.x += (dx * w * w - vel.x * c) * s
      vel.y += (dy * w * w - vel.y * c) * s

      if (dist <= TUNING.ARRIVE_EPSILON_PX && speed() <= TUNING.ARRIVE_SPEED_PX_S) {
        pos.x = target.x
        pos.y = target.y
        vel.x = 0
        vel.y = 0
        target = null
        effort = 0
        prevSpeed = 0
        return { kind: 'arrived', traveled }
      }
    }

    const stepX = vel.x * s
    pos.x += stepX
    traveled += Math.abs(stepX)
    rollDist += stepX

    // What did the end of the floor do to us?
    if (support) {
      if (pos.x < support.minX) {
        if (support.leftEdge === 'wall') {
          pos.x = support.minX
          vel.x = -vel.x * TUNING.WALL_RESTITUTION
        } else {
          airborne = true
          support = null
          vel.y = 0
        }
      } else if (pos.x > support.maxX) {
        if (support.rightEdge === 'wall') {
          pos.x = support.maxX
          vel.x = -vel.x * TUNING.WALL_RESTITUTION
        } else {
          airborne = true
          support = null
          vel.y = 0
        }
      }
    }
    return null
  }

  return {
    pos: () => pos,
    speedRatio: () => Math.min(1, speed() / TUNING.MAX_SPEED_PX_S),
    moving: () => target !== null,
    target: () => target,
    phase,
    airborne: () => airborne,
    support: () => support,
    rollDistance: () => rollDist,
    effort: () => effort,

    heading() {
      const s = speed()
      if (s < 1) return null
      return { x: vel.x / s, y: vel.y / s }
    },

    setTarget(p) {
      // A fresh trip from standstill winds up first; retargeting mid-trip
      // keeps momentum. Mid-air, the new target simply waits for the ground.
      if (target === null && !airborne) {
        traveled = 0
        const dist = Math.hypot(p.x - pos.x, p.y - pos.y)
        anticipateLeftMs = dist > TUNING.ANTICIPATION_MIN_TRIP_PX ? TUNING.ANTICIPATION_MS : 0
      }
      target = { x: p.x, y: p.y }
    },

    hop(vx, vy) {
      vel.x = vx
      vel.y = vy
      airborne = true
      support = null
      target = null
      anticipateLeftMs = 0
    },

    place(p) {
      pos.x = p.x
      pos.y = p.y
      vel.x = 0
      vel.y = 0
      target = null
      airborne = false
      support = null
      traveled = 0
      anticipateLeftMs = 0
      effort = 0
      prevSpeed = 0
      // rollDist survives on purpose — teleporting doesn't repaint the body.
    },

    update(dt) {
      const s = dt / 1000
      const event = airborne ? stepAirborne(s) : stepGrounded(s)
      updateEffort(s)
      return event
    },
  }
}
