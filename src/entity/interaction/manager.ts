import type { DocPoint, Surface, Terrain } from '../types'
import { BODY_RADIUS_PX } from '../body'
import {
  HOME_ROOT_SELECTOR,
  PLATFORM_SPECS,
  RULE_SPECS,
  TARGET_SELECTORS,
  type TargetId,
} from './map'

/**
 * The Interaction Manager: the entity's senses.
 *
 * It owns every DOM read — pointer position, element geometry, activity — and
 * exposes them as plain queries. The brain never touches the DOM; it asks
 * "where is the cursor", "is a target hovered", "where is home", and decides.
 *
 * Geometry is cached and re-measured lazily: rects are marked dirty on resize
 * and re-read on the next query, so a burst of resize events costs one layout
 * read, and a frame where nobody asks costs zero.
 */

type DocRect = { x: number; y: number; w: number; h: number }

export type Interaction = {
  start(): void
  stop(): void
  /** Document-space cursor, or null if no mouse has been seen. */
  pointer(): DocPoint | null
  /** ms since the cursor last moved. Infinity if never. */
  pointerIdleMs(): number
  /** Smoothed cursor speed, px/s. 0 when the cursor is still. */
  pointerSpeed(): number
  /** ms since the visitor did anything at all — moved, scrolled, typed. */
  userIdleMs(): number
  /** Which curiosity target the cursor is currently over, if any. */
  hovered(): TargetId | null
  /** The world as movement sees it: floors, edges, walls. */
  terrain(): Terrain
  /** The surface supporting a body standing at `p`, or null. */
  surfaceAt(p: DocPoint): Surface | null
  /** The floor a point's shadow falls on — the surface directly below it. */
  surfaceFor(p: DocPoint): Surface | null
  /**
   * Register a provider of transient surfaces (clouds). Queried fresh on
   * every terrain lookup — dynamic surfaces are never cached.
   */
  addSurfaceSource(source: () => Surface[]): void
  /** The open sky in the contact section, where clouds may drift. */
  sky(): { minX: number; maxX: number; floorY: number } | null
  /** The entity's resting place, on the topmost floor. */
  home(): DocPoint
  /** The standing spot for a target: on its floor, directly beneath it. */
  beside(id: TargetId): DocPoint | null
  /** A target's centre, for looking (up) at it. */
  center(id: TargetId): DocPoint | null
}

/** Hover detection is slightly forgiving — a rect miss by 2px is not intent. */
const HOVER_PAD_PX = 4

/*
  The broken rules. These constants are DRAWN in `styles/global.css` (and
  Footer.module.css) as background gradients — the visible gap in each rule
  is the same gap the physics drops through. Change one, change both.
*/
/** Width of the visible hole in a rule. */
const RULE_GAP_PX = 96
/** Left-side gaps END at min(280px, 20% of width); the line recontinues
    toward the left wall. */
const LEFT_BREAK_PX = 280
/** Platforms are element tops; their very corners are not standable. */
const PLATFORM_EDGE_INSET_PX = 6
/** Reflow tolerance when re-resolving the floor underfoot. Must exceed the
    fastest a moving surface can travel in one clamped tick (cloud climb
    380px/s × 100ms max dt = 38px), or a rising lift outruns its passenger
    on a single slow frame and drops them. */
const SUPPORT_EPS_PX = 64

function measure(el: Element): DocRect {
  const r = el.getBoundingClientRect()
  return { x: r.x + window.scrollX, y: r.y + window.scrollY, w: r.width, h: r.height }
}

function contains(r: DocRect, p: DocPoint, pad: number) {
  return p.x >= r.x - pad && p.x <= r.x + r.w + pad && p.y >= r.y - pad && p.y <= r.y + r.h + pad
}

export function createInteraction(isMobile: () => boolean): Interaction {
  let pointer: DocPoint | null = null
  let pointerMovedAt = -Infinity
  /** Seeded at start so a fresh page isn't instantly "idle". */
  let lastActivityAt = performance.now()

  let dirty = true
  let homeRoot: Element | null = null
  const targetEls = new Map<TargetId, Element>()
  const rects = new Map<TargetId, DocRect>()
  let homeRect: DocRect | null = null
  /** Sorted top to bottom. */
  let surfaces: Surface[] = []
  let walls = { left: BODY_RADIUS_PX + 2, right: 1024 }

  const markDirty = () => {
    dirty = true
  }

  function refresh() {
    if (!dirty) return
    dirty = false

    homeRoot = document.querySelector(HOME_ROOT_SELECTOR)
    homeRect = homeRoot ? measure(homeRoot) : null

    targetEls.clear()
    rects.clear()
    for (const id of Object.keys(TARGET_SELECTORS) as TargetId[]) {
      const el = document.querySelector(TARGET_SELECTORS[id])
      if (!el) continue
      targetEls.set(id, el)
      rects.set(id, measure(el))
    }

    // ── The floors ─────────────────────────────────────────────────────────
    // The page is a box; its edges are walls, in body-centre coordinates.
    walls = {
      left: BODY_RADIUS_PX + 2,
      right: document.documentElement.clientWidth - BODY_RADIUS_PX - 2,
    }

    surfaces = []
    // Every section's bottom rule, broken per its spec. A broken rule is two
    // segments around the visible gap: the main shelf whose edge drops into
    // the hole, and the ledge where the line recontinues to the wall.
    for (const spec of RULE_SPECS) {
      const el = document.querySelector(spec.selector)
      if (!el) continue
      const r = measure(el)
      const y = r.y + r.h - BODY_RADIUS_PX

      if (spec.gap === 'left') {
        const gapEnd = r.x + Math.min(LEFT_BREAK_PX, r.w * 0.2)
        const gapStart = gapEnd - RULE_GAP_PX
        surfaces.push({
          id: spec.id,
          y,
          minX: gapEnd,
          maxX: walls.right,
          leftEdge: 'drop',
          rightEdge: 'wall',
        })
        if (gapStart - walls.left > 40) {
          surfaces.push({
            id: `${spec.id}-ledge`,
            y,
            minX: walls.left,
            maxX: gapStart,
            leftEdge: 'wall',
            rightEdge: 'drop',
          })
        }
      } else if (spec.gap === 'right') {
        const gapStart = r.x + r.w * (spec.gapStartRatio ?? 0.75)
        const gapEnd = gapStart + RULE_GAP_PX
        surfaces.push({
          id: spec.id,
          y,
          minX: walls.left,
          maxX: Math.min(walls.right, gapStart),
          leftEdge: 'wall',
          rightEdge: 'drop',
        })
        if (walls.right - gapEnd > 40) {
          surfaces.push({
            id: `${spec.id}-ledge`,
            y,
            minX: gapEnd,
            maxX: walls.right,
            leftEdge: 'drop',
            rightEdge: 'wall',
          })
        }
      } else {
        // Unbroken: the basement of the world. Walls both ends.
        surfaces.push({
          id: spec.id,
          y,
          minX: walls.left,
          maxX: walls.right,
          leftEdge: 'wall',
          rightEdge: 'wall',
        })
      }
    }
    // Platforms: element tops (cards, the portrait, the globe). Both edges
    // drop — the body sits ON them, tangent, and rolls off either side.
    for (const spec of PLATFORM_SPECS) {
      document.querySelectorAll(spec.selector).forEach((el, i) => {
        const r = measure(el)
        surfaces.push({
          id: `${spec.idPrefix}-${i}`,
          y: r.y - BODY_RADIUS_PX,
          minX: r.x + PLATFORM_EDGE_INSET_PX,
          maxX: r.x + r.w - PLATFORM_EDGE_INSET_PX,
          leftEdge: 'drop',
          rightEdge: 'drop',
        })
      })
    }
    surfaces.sort((a, b) => a.y - b.y)
  }

  // ── Input ────────────────────────────────────────────────────────────────
  const onActivity = () => {
    lastActivityAt = performance.now()
  }

  let speedEma = 0

  const onPointerMove = (e: PointerEvent) => {
    lastActivityAt = performance.now()
    // Only a real cursor is worth noticing. Touch produces pointermove too,
    // and an entity tracking a finger that isn't there looks broken.
    if (e.pointerType !== 'mouse') return
    const next = { x: e.clientX + window.scrollX, y: e.clientY + window.scrollY }
    if (pointer) {
      const dtMs = Math.max(4, lastActivityAt - pointerMovedAt)
      const inst = (Math.hypot(next.x - pointer.x, next.y - pointer.y) / dtMs) * 1000
      // Smoothed: caution should react to a gesture, not to one wild sample.
      speedEma += (inst - speedEma) * 0.3
    }
    pointer = next
    pointerMovedAt = lastActivityAt
  }

  // Fonts loading, images arriving, the responsive layout shifting — any of it
  // moves home and targets. Observing the hero root catches all of them.
  const observer = new ResizeObserver(markDirty)
  // Lazy content (the globe canvas mounts only when scrolled near) adds and
  // removes platforms without necessarily resizing anything. Only the flag
  // is set here; measurement stays lazy.
  const mutations = new MutationObserver(markDirty)

  const sources: Array<() => Surface[]> = []

  /** Static floors plus whatever the dynamic sources report right now. */
  function allSurfaces(): Surface[] {
    refresh()
    if (sources.length === 0) return surfaces
    const out = surfaces.slice()
    for (const source of sources) out.push(...source())
    return out
  }

  function surfaceAt(p: DocPoint): Surface | null {
    let best: Surface | null = null
    for (const s of allSurfaces()) {
      if (p.x < s.minX - 2 || p.x > s.maxX + 2) continue
      const d = Math.abs(p.y - s.y)
      if (d <= 4 && (!best || d < Math.abs(p.y - best.y))) best = s
    }
    return best
  }

  return {
    start() {
      window.addEventListener('pointermove', onPointerMove, { passive: true })
      window.addEventListener('scroll', onActivity, { passive: true })
      window.addEventListener('touchstart', onActivity, { passive: true })
      window.addEventListener('keydown', onActivity, { passive: true })
      window.addEventListener('resize', markDirty)
      refresh()
      if (homeRoot) observer.observe(homeRoot)
      observer.observe(document.body)
      mutations.observe(document.body, { childList: true, subtree: true })
    },

    stop() {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('scroll', onActivity)
      window.removeEventListener('touchstart', onActivity)
      window.removeEventListener('keydown', onActivity)
      window.removeEventListener('resize', markDirty)
      observer.disconnect()
      mutations.disconnect()
    },

    pointer: () => pointer,
    pointerIdleMs: () => performance.now() - pointerMovedAt,
    pointerSpeed: () => (performance.now() - pointerMovedAt > 300 ? 0 : speedEma),
    userIdleMs: () => performance.now() - lastActivityAt,

    hovered() {
      if (!pointer) return null
      refresh()
      for (const [id, rect] of rects) {
        if (contains(rect, pointer, HOVER_PAD_PX)) return id
      }
      return null
    },

    surfaceAt,

    addSurfaceSource(source) {
      sources.push(source)
    },

    sky() {
      refresh()
      const el = document.querySelector('#contact')
      if (!el) return null
      const r = measure(el)
      // The open right side of the section — clouds never drift over copy.
      return {
        minX: r.x + Math.min(660, r.w * 0.5),
        maxX: Math.min(walls.right, r.x + r.w - 30),
        floorY: r.y + r.h - BODY_RADIUS_PX,
      }
    },

    surfaceFor(p) {
      // The floor a point's shadow falls on: the nearest surface below it
      // whose span covers its x. Off every span → the basement.
      let best: Surface | null = null
      for (const s of allSurfaces()) {
        if (s.y < p.y - 4) continue
        if (p.x < s.minX - 8 || p.x > s.maxX + 8) continue
        if (!best || s.y < best.y) best = s
      }
      return best ?? (surfaces.length ? surfaces[surfaces.length - 1] : null)
    },

    terrain(): Terrain {
      return {
        supportAt(x, y, prefer) {
          let best: Surface | null = null
          for (const s of allSurfaces()) {
            if (x < s.minX - 2 || x > s.maxX + 2) continue
            const d = Math.abs(y - s.y)
            if (d > SUPPORT_EPS_PX) continue
            // Sticky: the floor already underfoot wins while it's still there.
            if (prefer && s.id === prefer) return s
            if (!best || d < Math.abs(y - best.y)) best = s
          }
          return best
        },
        firstBelow(x, y) {
          let best: Surface | null = null
          for (const s of allSurfaces()) {
            if (s.y <= y) continue
            if (x < s.minX - 1 || x > s.maxX + 1) continue
            if (!best || s.y < best.y) best = s
          }
          return best
        },
        walls() {
          refresh()
          return walls
        },
      }
    },

    home() {
      refresh()
      const hero = surfaces.find((s) => s.id === 'hero')
      // No hero floor at all — rest near the top rather than crash.
      if (!hero) return { x: walls.right - 56, y: 160 }
      if (isMobile() || !homeRect) return { x: hero.maxX - 56, y: hero.y }
      // The hero is type-only, capped at 40rem; the open span of the rule to
      // the right of the copy is the entity's shelf.
      const x = Math.min(hero.maxX - 56, Math.max(homeRect.x + homeRect.w * 0.74, homeRect.x + 700))
      return { x, y: hero.y }
    },

    beside(id) {
      refresh()
      const r = rects.get(id)
      if (!r) return null
      // Gravity: the standing spot for anything is its shadow on the floor
      // beneath it. The entity rolls under the target and looks up.
      const under = { x: r.x + r.w / 2, y: r.y + r.h }
      let floor: Surface | null = null
      for (const s of surfaces) {
        if (s.y < under.y - 4) continue
        if (under.x < s.minX - 8 || under.x > s.maxX + 8) continue
        if (!floor || s.y < floor.y) floor = s
      }
      if (!floor) return null
      return { x: Math.min(floor.maxX, Math.max(floor.minX, under.x)), y: floor.y }
    },

    center(id) {
      refresh()
      const r = rects.get(id)
      return r ? { x: r.x + r.w / 2, y: r.y + r.h / 2 } : null
    },
  }
}
