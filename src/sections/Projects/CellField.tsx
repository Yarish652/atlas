import { useEffect, useRef } from 'react'
import { useMediaQuery } from '../../lib/useMediaQuery'
import styles from './Projects.module.css'

/** Target cell edge, px. The real edge stretches so whole cells fill the width. */
const CELL_PX = 14
/** Radius of the cursor's glow, in cells. */
const GLOW_RADIUS = 8
/** Peak opacity of the accent fill under the cursor. */
const GLOW_ALPHA = 0.28
/** How fast a cell cools once the cursor moves on (time constant, ms). */
const COOL_MS = 220
/** Accent (--color-accent), as the canvas needs it. */
const GLOW_RGB = '52, 64, 107'
/** Breathing room an obstacle's plate keeps around its content before rounding out to whole cells, px. */
const OBSTACLE_PAD_X = 12
const OBSTACLE_PAD_Y = 6

/**
 * An element's position inside `host`, to the sub-pixel.
 *
 * Client rects are exact but include transforms, and the section's scroll
 * reveal translates its content while it plays. Offsets ignore transforms
 * but round to whole pixels. So: trust the rect when it agrees with the
 * offsets (nothing is moving), otherwise use the offsets and report that a
 * re-snap is due once the motion ends.
 */
function positionIn(
  el: HTMLElement,
  host: HTMLElement,
): { x: number; y: number; settled: boolean } | null {
  let ox = 0
  let oy = 0
  let node: HTMLElement | null = el
  while (node && node !== host) {
    ox += node.offsetLeft
    oy += node.offsetTop
    node = node.offsetParent as HTMLElement | null
  }
  if (node !== host) return null
  const e = el.getBoundingClientRect()
  const h = host.getBoundingClientRect()
  const rx = e.left - h.left - host.clientLeft
  const ry = e.top - h.top - host.clientTop
  const settled = Math.abs(rx - ox) <= 1 && Math.abs(ry - oy) <= 1
  return settled ? { x: rx, y: ry, settled } : { x: ox, y: oy, settled }
}

/**
 * Fits an obstacle's plate to whole cells. The element's own box never
 * changes — layout stays untouched, so this can't feed back into a resize.
 * Instead it gets CSS variables describing a plate that covers exactly the
 * cells around it, padded and rounded outward, with edges on the grid
 * lines; and a shift that re-centres its content inside that plate.
 *
 * Returns false when the element was mid-transform and the snap should be
 * repeated once it settles.
 */
function snapToCells(el: HTMLElement, host: HTMLElement, field: HTMLElement, size: number) {
  const at = positionIn(el, host)
  if (!at) return true
  // Into field coordinates (the field may be inset within its host).
  const x = at.x - field.offsetLeft
  const y = at.y - field.offsetTop
  const w = el.offsetWidth
  const h = el.offsetHeight

  const c0 = Math.floor((x - OBSTACLE_PAD_X) / size)
  const c1 = Math.ceil((x + w + OBSTACLE_PAD_X) / size)
  const r0 = Math.floor((y - OBSTACLE_PAD_Y) / size)
  const r1 = Math.ceil((y + h + OBSTACLE_PAD_Y) / size)

  // Plate relative to the element. +1 so the far border lands on the
  // closing grid line rather than one pixel short of it.
  const px = c0 * size - x
  const py = r0 * size - y
  const pw = (c1 - c0) * size + 1
  const ph = (r1 - r0) * size + 1
  const round = (n: number) => `${Math.round(n * 10) / 10}px`

  el.style.setProperty('--plate-x', round(px))
  el.style.setProperty('--plate-y', round(py))
  el.style.setProperty('--plate-w', round(pw))
  el.style.setProperty('--plate-h', round(ph))
  el.style.setProperty('--plate-dx', round(px + pw / 2 - w / 2))
  el.style.setProperty('--plate-dy', round(py + ph / 2 - h / 2))
  return at.settled
}

/**
 * A fine matrix of cells covering whatever contains it, edge to edge.
 *
 * The grid lines are a CSS background sized to the cell; the cursor's glow is
 * one canvas. Each cell carries a heat value — cells near the cursor warm to
 * a peak that falls off with distance, cells it leaves cool exponentially, so
 * the cursor drags a short trail. The loop only runs while something is warm,
 * and nothing about it touches React.
 *
 * The field itself ignores the pointer; it listens on its parent, so content
 * laid over it stays fully interactive and the glow follows underneath.
 *
 * Content can opt in as an obstacle with `data-cell-obstacle`: the field
 * snaps a plate behind it to whole cells (see snapToCells), so the grid
 * runs up to its edges and around it.
 */
export function CellField() {
  const fieldRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const finePointer = useMediaQuery('(pointer: fine)')
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  // ── The grid: cell size follows the width; lines are CSS ─────────────────
  // Obstacles are snapped in the same pass, so they always agree with the
  // lines they sit on.
  useEffect(() => {
    const field = fieldRef.current
    const host = field?.parentElement
    if (!field || !host) return

    let frame = 0
    const layout = () => {
      frame = 0
      const width = field.clientWidth
      const size = width / Math.max(1, Math.round(width / CELL_PX))
      field.style.setProperty('--cell', `${size}px`)
      let settled = true
      for (const el of host.querySelectorAll<HTMLElement>('[data-cell-obstacle]')) {
        settled = snapToCells(el, host, field, size) && settled
      }
      // Something was mid-reveal: snap again, to the sub-pixel, once it lands.
      if (settled) host.removeEventListener('transitionend', schedule)
      else host.addEventListener('transitionend', schedule)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(layout)
    }

    const ro = new ResizeObserver(schedule)
    ro.observe(field)
    // An obstacle can change size on its own (a web font arriving, a wrap).
    for (const el of host.querySelectorAll('[data-cell-obstacle]')) ro.observe(el)
    void document.fonts?.ready.then(schedule)
    return () => {
      ro.disconnect()
      host.removeEventListener('transitionend', schedule)
      cancelAnimationFrame(frame)
    }
  }, [])

  // ── The glow ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const field = fieldRef.current
    const host = field?.parentElement
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!field || !host || !canvas || !ctx || !finePointer) return

    let cols = 0
    let rows = 0
    let size = CELL_PX
    let heat = new Float32Array(0)
    let dirty = true
    let frame = 0
    let last = 0
    /** Pointer in field coordinates, or null once it has left. */
    let pointer: { x: number; y: number } | null = null

    const measure = () => {
      const w = field.clientWidth
      const h = field.clientHeight
      const dpr = window.devicePixelRatio || 1
      cols = Math.max(1, Math.round(w / CELL_PX))
      size = w / cols
      rows = Math.max(1, Math.ceil(h / size))
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      heat = new Float32Array(cols * rows)
      dirty = false
    }

    const step = (now: number) => {
      frame = 0
      if (dirty) measure()
      const dt = last ? Math.min(64, now - last) : 16
      last = now
      const cool = reducedMotion ? 0 : Math.exp(-dt / COOL_MS)

      for (let i = 0; i < heat.length; i++) heat[i] *= cool

      if (pointer) {
        const pc = pointer.x / size
        const pr = pointer.y / size
        const c0 = Math.floor(pc)
        const r0 = Math.floor(pr)
        for (let r = r0 - GLOW_RADIUS; r <= r0 + GLOW_RADIUS; r++) {
          if (r < 0 || r >= rows) continue
          for (let c = c0 - GLOW_RADIUS; c <= c0 + GLOW_RADIUS; c++) {
            if (c < 0 || c >= cols) continue
            // Distance from the pointer to the cell's centre, in cells.
            const d = Math.hypot(c + 0.5 - pc, r + 0.5 - pr) / (GLOW_RADIUS + 0.5)
            if (d >= 1) continue
            const i = r * cols + c
            const target = (1 - d) * (1 - d)
            if (heat[i] < target) heat[i] = target
          }
        }
      }

      ctx.clearRect(0, 0, cols * size, rows * size)
      ctx.fillStyle = `rgb(${GLOW_RGB})`
      let warm = false
      for (let i = 0; i < heat.length; i++) {
        const h = heat[i]
        if (h < 0.01) continue
        warm = true
        ctx.globalAlpha = h * GLOW_ALPHA
        // Inset by the 1px grid line so the glow sits inside each cell.
        ctx.fillRect((i % cols) * size + 1, Math.floor(i / cols) * size + 1, size - 1, size - 1)
      }
      ctx.globalAlpha = 1

      // Sleep once everything has cooled and the cursor is gone.
      if (warm || pointer) frame = requestAnimationFrame(step)
      else last = 0
    }

    const wake = () => {
      if (!frame) frame = requestAnimationFrame(step)
    }
    const onMove = (e: PointerEvent) => {
      const r = field.getBoundingClientRect()
      pointer = { x: e.clientX - r.left, y: e.clientY - r.top }
      wake()
    }
    const onLeave = () => {
      pointer = null
      wake()
    }
    const ro = new ResizeObserver(() => {
      dirty = true
      wake()
    })

    host.addEventListener('pointermove', onMove, { passive: true })
    host.addEventListener('pointerleave', onLeave)
    ro.observe(field)
    return () => {
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerleave', onLeave)
      ro.disconnect()
      cancelAnimationFrame(frame)
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [finePointer, reducedMotion])

  return (
    <div ref={fieldRef} className={styles.field} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.glow} />
    </div>
  )
}
