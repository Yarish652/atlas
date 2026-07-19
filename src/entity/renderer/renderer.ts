import type { DocPoint, Vec } from '../types'
import type { StateId } from '../stateMachine/states'
import type { Phase } from '../movement/movement'
import { BODY_RADIUS_PX } from '../body'
import type { Layer } from './layer'

/**
 * The renderer: the entity's current body.
 *
 * Write-only — it never reads layout, so it can never force a reflow. It is
 * handed a Frame each tick and dresses the DOM to match. It knows nothing
 * about why the entity is doing anything; swapping the circle for a Rive cat
 * means reimplementing this file (mapping the same Frame onto artboard
 * inputs) and touching nothing else.
 *
 * The motion vocabulary that makes translation read as self-propulsion:
 *   rolling     θ = rollDistance / radius — physically correct, not decorative
 *   effort      stretch along the heading when accelerating, squash when braking
 *   crouch      anticipation compression before push-off
 *   settle      the landing pulse after the spring stops
 */

export type Frame = {
  pos: DocPoint
  state: StateId
  /** Document point the entity is attending to, or null. */
  look: DocPoint | null
  /** Unit travel direction, or null when still. */
  heading: Vec | null
  /** 0–1 over cruise speed. */
  speedRatio: number
  /** Smoothed longitudinal effort, −1 braking … +1 accelerating. */
  effort: number
  /** Signed horizontal path distance, px, accumulated forever. */
  rollDistance: number
  phase: Phase
}

export type Renderer = {
  write(frame: Frame, dt: number): void
  /**
   * One-shot squash: arrivals at 1, landings scaled by impact. Web
   * Animations, so it composes with the CSS state animations.
   */
  settle(intensity?: number): void
  /**
   * Switched off: a component, not a creature. Kills the breathing (CSS)
   * and rounds the body back to a perfect circle so it doesn't stand
   * frozen mid-stretch.
   */
  setFrozen(frozen: boolean): void
  /**
   * A micro-behaviour: a 0.2s life sign. Blink (gaze winks), glance (gaze
   * darts aside and back), twitch (a tiny body pulse — the tail-flick),
   * adjust (a small weight shift). These are what make stillness read as
   * alive rather than paused.
   */
  micro(kind: MicroKind): void
}

export type MicroKind = 'blink' | 'glance' | 'twitch' | 'adjust'

/** Peak stretch at full effort. Subtle: the body hints at work, no more. */
const STRETCH_MAX = 0.09
/** The anticipation crouch — wider than tall, gathering itself. */
const CROUCH_SX = 1.055
const CROUCH_SY = 0.935
/** How quickly deformation chases its target. Soft, so shape never snaps. */
const DEFORM_RATE_PER_S = 14
/** Gaze offset ceiling, px. */
const GAZE_MAX_PX = 6.5
/** Gaze chase rate — attention shifts fast but never snaps. */
const GAZE_RATE_PER_S = 10

export function createRenderer(layer: Layer): Renderer {
  // The landing: momentum arrives a beat after the body stops. The movement
  // spring does positional overshoot for arrivals, so a stop is only a hint
  // of absorbed weight — but a fall's impact scales it up.
  function settleFx(intensity = 1) {
    const a = Math.min(1.6, Math.max(0.5, intensity))
    layer.breath.animate(
      [
        { transform: 'scale(1, 1)' },
        { transform: `scale(${1 + 0.07 * a}, ${1 - 0.055 * a})`, offset: 0.38 },
        { transform: `scale(${1 - 0.025 * a}, ${1 + 0.02 * a})`, offset: 0.72 },
        { transform: 'scale(1, 1)' },
      ],
      { duration: 380, easing: 'ease-out' },
    )
  }

  let lastState: StateId | '' = ''
  let lastX = NaN
  let lastY = NaN
  // Deformation is eased in JS: current values chase per-phase targets.
  let sx = 1
  let sy = 1
  let angle = 0
  let lastSx = NaN
  let lastSy = NaN
  let lastAngle = NaN
  let lastRoll = NaN
  let gazeX = 0
  let gazeY = 0
  let lastGX = NaN
  let lastGY = NaN

  return {
    write({ pos, state, look, heading, effort, rollDistance, phase }, dt) {
      const x = Math.round(pos.x * 10) / 10
      const y = Math.round(pos.y * 10) / 10
      if (x !== lastX || y !== lastY) {
        layer.entity.style.transform = `translate3d(${x}px, ${y}px, 0)`
        lastX = x
        lastY = y
      }

      if (state !== lastState) {
        layer.entity.dataset.state = state
        lastState = state
      }

      // ── Rolling: rotation is distance over radius, nothing else. ─────────
      const roll = Math.round((rollDistance / BODY_RADIUS_PX) * 100) / 100
      if (roll !== lastRoll) {
        layer.roll.style.setProperty('--roll', `${roll}rad`)
        lastRoll = roll
      }

      // ── Deformation: crouch, stretch, squash. ────────────────────────────
      let tsx = 1
      let tsy = 1
      if (phase === 'anticipating') {
        // The crouch is gravity-oriented — you gather downward, not sideways.
        tsx = CROUCH_SX
        tsy = CROUCH_SY
        angle = 0
      } else if (heading) {
        angle = Math.atan2(heading.y, heading.x)
        const s = 1 + STRETCH_MAX * effort
        tsx = s
        tsy = 1 / s
      }
      const dk = Math.min(1, (DEFORM_RATE_PER_S * dt) / 1000)
      sx += (tsx - sx) * dk
      sy += (tsy - sy) * dk
      const wsx = Math.round(sx * 1000) / 1000
      const wsy = Math.round(sy * 1000) / 1000
      const wr = Math.round(angle * 100) / 100
      if (wsx !== lastSx || wsy !== lastSy || wr !== lastAngle) {
        layer.ball.style.setProperty('--sx', String(wsx))
        layer.ball.style.setProperty('--sy', String(wsy))
        layer.ball.style.setProperty('--r', `${wr}rad`)
        lastSx = wsx
        lastSy = wsy
        lastAngle = wr
      }

      // ── Gaze: ease toward the attention point, or the travel direction. ──
      let tx = 0
      let ty = 0
      if (look) {
        const dx = look.x - pos.x
        const dy = look.y - pos.y
        const d = Math.hypot(dx, dy)
        if (d > 1) {
          tx = (dx / d) * GAZE_MAX_PX
          ty = (dy / d) * GAZE_MAX_PX
        }
      } else if (heading) {
        tx = heading.x * GAZE_MAX_PX
        ty = heading.y * GAZE_MAX_PX
      }
      const gk = Math.min(1, (GAZE_RATE_PER_S * dt) / 1000)
      gazeX += (tx - gazeX) * gk
      gazeY += (ty - gazeY) * gk
      const gx = Math.round(gazeX * 10) / 10
      const gy = Math.round(gazeY * 10) / 10
      if (gx !== lastGX || gy !== lastGY) {
        layer.gaze.style.setProperty('--gx', `${gx}px`)
        layer.gaze.style.setProperty('--gy', `${gy}px`)
        lastGX = gx
        lastGY = gy
      }
    },

    micro(kind) {
      // All one-shots ride the Web Animations API with composite: 'add', so
      // they stack on top of the gaze translate / breath keyframes instead
      // of fighting them, and clean up after themselves.
      switch (kind) {
        case 'blink':
          layer.gaze.animate(
            [
              { transform: 'scale(1)' },
              { transform: 'scale(0.1, 0.12)', offset: 0.45 },
              { transform: 'scale(1)' },
            ],
            { duration: 150, easing: 'ease-in-out', composite: 'add' },
          )
          return
        case 'glance': {
          const dir = Math.random() < 0.5 ? -1 : 1
          layer.gaze.animate(
            [
              { transform: 'translate(0, 0)' },
              { transform: `translate(${dir * 5.5}px, ${-1 + Math.random() * 2}px)`, offset: 0.3 },
              { transform: `translate(${dir * 5.5}px, ${-1 + Math.random() * 2}px)`, offset: 0.72 },
              { transform: 'translate(0, 0)' },
            ],
            { duration: 700, easing: 'ease-in-out', composite: 'add' },
          )
          return
        }
        case 'twitch':
          layer.breath.animate(
            [
              { transform: 'scale(1, 1)' },
              { transform: 'scale(1.025, 0.985)', offset: 0.4 },
              { transform: 'scale(1, 1)' },
            ],
            { duration: 220, easing: 'ease-out', composite: 'add' },
          )
          return
        case 'adjust':
          settleFx(0.55)
          return
      }
    },

    setFrozen(frozen) {
      if (frozen) {
        layer.entity.dataset.frozen = 'true'
        layer.ball.style.setProperty('--sx', '1')
        layer.ball.style.setProperty('--sy', '1')
        sx = 1
        sy = 1
        lastSx = NaN
        lastSy = NaN
      } else {
        delete layer.entity.dataset.frozen
      }
    },

    settle: settleFx,
  }
}
