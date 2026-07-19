import type { Surface } from '../types'
import styles from '../renderer/layer.module.css'

/**
 * The clouds: the world's only way back up.
 *
 * A couple of paper-soft clouds drift in the contact section's open sky.
 * They are ordinary platforms until the entity JUMPS onto one — then it
 * becomes a lift: it eases upward, drifts toward home on the wind, and
 * dissolves just above the hero shelf, dropping its passenger onto home.
 * The empty cloud keeps rising and fades off the screen; a new one forms
 * below.
 *
 * Boarding requires an invitation (the brain's jump names its cloud), so a
 * stray fall that happens to land on a drifting cloud does NOT hijack the
 * descent — it is just a bonus platform to roll off.
 *
 * Driven by the entity's tick: pausing the entity pauses the weather.
 */

export type CloudCatch = {
  id: string
  /** Centre x, and the surface y the body would stand at. */
  x: number
  y: number
  /** Drift velocity, for leading the jump. */
  vx: number
}

export type CloudDeps = {
  /** The sky band: where clouds may drift. Null if the world has no sky. */
  sky(): { minX: number; maxX: number; floorY: number } | null
  /** Where the wind carries a risen cloud, horizontally. */
  homeX(): number
  /** The altitude at which a rising cloud dissolves (just above home). */
  dropY(): number
}

export type Clouds = {
  update(dt: number): void
  /** Standable clouds, as terrain surfaces. */
  surfaces(): Surface[]
  /** A boardable cloud within jump range of `from`, marking an invitation. */
  catchable(from: { x: number; y: number }): CloudCatch | null
  /** Accept a landing: only invited clouds start rising. */
  board(id: string): void
  isRising(id: string): boolean
  destroy(): void
}

const CLOUD_W = 116
const BODY_R = 18
const MAX_DRIFTING = 2
const SPAWN_EVERY_MS = 6500
/** Cloud tops live this far above the contact floor. */
const BAND_ABOVE_FLOOR: [number, number] = [300, 170]
const DRIFT_VX = 21
const BOB_PX = 4
const CLIMB_MAX_PX_S = 380
const CLIMB_ACCEL_PX_S2 = 240
const WIND_MAX_PX_S = 55
const FADE_MS = 700
const FADE_IN_MS = 900
/** Jump envelope: how far above the body a cloud can be caught. */
const CATCH_HEIGHT: [number, number] = [70, 320]
const CATCH_DX = 280
const INVITE_TTL_MS = 12_000

type Phase = 'drifting' | 'rising' | 'fading'

type Cloud = {
  id: string
  el: HTMLElement
  phase: Phase
  /** Visual top of the cloud, document space. */
  x: number
  top: number
  baseTop: number
  vx: number
  vy: number
  bobT: number
  ageMs: number
  fadeLeftMs: number
  lastOpacity: number
}

export function createClouds(root: HTMLElement, deps: CloudDeps): Clouds {
  const holder = document.createElement('div')
  holder.className = styles.cloudLayer
  // Behind the entity: the ball passes in front of clouds, never under them.
  root.insertBefore(holder, root.firstChild)

  const clouds: Cloud[] = []
  let serial = 0
  let sinceSpawnMs = SPAWN_EVERY_MS // first cloud forms immediately
  let spawnSide = 1
  let invitedId: string | null = null
  let invitedAtMs = 0
  let clockMs = 0

  function spawn(skyBand: { minX: number; maxX: number; floorY: number }) {
    const el = document.createElement('div')
    el.className = styles.cloud
    el.innerHTML =
      `<span class="${styles.cloudPuff}" style="left:0;bottom:0;width:44px;height:20px"></span>` +
      `<span class="${styles.cloudPuff}" style="left:16px;bottom:4px;width:52px;height:30px"></span>` +
      `<span class="${styles.cloudPuff}" style="left:50px;bottom:2px;width:46px;height:24px"></span>` +
      `<span class="${styles.cloudPuff}" style="left:72px;bottom:0;width:44px;height:16px"></span>`
    holder.appendChild(el)

    spawnSide = -spawnSide
    const [hi, lo] = BAND_ABOVE_FLOOR
    const top = skyBand.floorY - lo - Math.random() * (hi - lo)
    const x =
      spawnSide > 0
        ? skyBand.maxX - CLOUD_W / 2 - Math.random() * 60
        : skyBand.minX + CLOUD_W / 2 + Math.random() * 60
    clouds.push({
      id: `cloud-${serial++}`,
      el,
      phase: 'drifting',
      x,
      top,
      baseTop: top,
      vx: spawnSide > 0 ? -DRIFT_VX : DRIFT_VX,
      vy: 0,
      bobT: Math.random() * 6,
      ageMs: 0,
      fadeLeftMs: 0,
      lastOpacity: -1,
    })
  }

  function remove(cloud: Cloud) {
    cloud.el.remove()
    clouds.splice(clouds.indexOf(cloud), 1)
  }

  function write(cloud: Cloud) {
    const x = Math.round((cloud.x - CLOUD_W / 2) * 10) / 10
    const y = Math.round(cloud.top * 10) / 10
    cloud.el.style.transform = `translate3d(${x}px, ${y}px, 0)`
    const opacity =
      cloud.phase === 'fading'
        ? Math.max(0, cloud.fadeLeftMs / FADE_MS)
        : Math.min(1, cloud.ageMs / FADE_IN_MS)
    const rounded = Math.round(opacity * 100) / 100
    if (rounded !== cloud.lastOpacity) {
      cloud.el.style.opacity = String(rounded)
      cloud.lastOpacity = rounded
    }
  }

  return {
    update(dt) {
      clockMs += dt
      const s = dt / 1000
      const skyBand = deps.sky()

      const drifting = clouds.filter((c) => c.phase === 'drifting').length
      sinceSpawnMs += dt
      if (skyBand && drifting < MAX_DRIFTING && sinceSpawnMs >= SPAWN_EVERY_MS) {
        sinceSpawnMs = 0
        spawn(skyBand)
      }

      for (const cloud of [...clouds]) {
        cloud.ageMs += dt
        if (cloud.phase === 'drifting') {
          cloud.x += cloud.vx * s
          cloud.bobT += s
          cloud.top = cloud.baseTop + Math.sin(cloud.bobT * 0.9) * BOB_PX
          if (skyBand) {
            // Turn around at the edges of the sky, unhurried.
            if (cloud.x < skyBand.minX + CLOUD_W / 2) cloud.vx = Math.abs(cloud.vx)
            if (cloud.x > skyBand.maxX - CLOUD_W / 2) cloud.vx = -Math.abs(cloud.vx)
          }
        } else if (cloud.phase === 'rising') {
          cloud.vy = Math.min(CLIMB_MAX_PX_S, cloud.vy + CLIMB_ACCEL_PX_S2 * s)
          cloud.top -= cloud.vy * s
          // The wind leans it toward home so the passenger is delivered,
          // not merely elevated.
          cloud.vx = Math.max(-WIND_MAX_PX_S, Math.min(WIND_MAX_PX_S, (deps.homeX() - cloud.x) * 0.4))
          cloud.x += cloud.vx * s
          if (cloud.top - BODY_R <= deps.dropY()) {
            // High enough: dissolve. The surface vanishes with the phase
            // change, and whoever stood on it falls the last few feet home.
            cloud.phase = 'fading'
            cloud.fadeLeftMs = FADE_MS
          }
        } else {
          cloud.top -= cloud.vy * s
          cloud.fadeLeftMs -= dt
          if (cloud.fadeLeftMs <= 0) {
            remove(cloud)
            continue
          }
        }
        write(cloud)
      }
    },

    surfaces() {
      const out: Surface[] = []
      for (const c of clouds) {
        if (c.phase === 'fading') continue
        if (c.ageMs < FADE_IN_MS * 0.6) continue // still forming; not solid yet
        out.push({
          id: c.id,
          y: c.top - BODY_R,
          minX: c.x - CLOUD_W / 2 + 10,
          maxX: c.x + CLOUD_W / 2 - 10,
          leftEdge: 'drop',
          rightEdge: 'drop',
          carryVx: c.vx,
        })
      }
      return out
    },

    catchable(from) {
      let best: Cloud | null = null
      for (const c of clouds) {
        if (c.phase !== 'drifting' || c.ageMs < FADE_IN_MS) continue
        const h = from.y - (c.top - BODY_R)
        if (h < CATCH_HEIGHT[0] || h > CATCH_HEIGHT[1]) continue
        if (Math.abs(c.x - from.x) > CATCH_DX) continue
        if (!best || Math.abs(c.x - from.x) < Math.abs(best.x - from.x)) best = c
      }
      if (!best) return null
      invitedId = best.id
      invitedAtMs = clockMs
      return { id: best.id, x: best.x, y: best.top - BODY_R, vx: best.vx }
    },

    board(id) {
      if (id !== invitedId || clockMs - invitedAtMs > INVITE_TTL_MS) return
      const cloud = clouds.find((c) => c.id === id)
      if (!cloud || cloud.phase !== 'drifting') return
      invitedId = null
      cloud.phase = 'rising'
      cloud.vy = 0
    },

    isRising(id) {
      const cloud = clouds.find((c) => c.id === id)
      return cloud !== undefined && cloud.phase !== 'drifting'
    },

    destroy() {
      holder.remove()
    },
  }
}
