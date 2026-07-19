/** Document-space point: viewport coordinates + scroll offset. Scroll-invariant. */
export type DocPoint = { x: number; y: number }

export type Vec = { x: number; y: number }

/**
 * What an end of a surface does to a rolling body:
 *   wall — stops it; momentum reflects (the page edge, or a blocked end).
 *   drop — nothing. The body rolls off and gravity takes over.
 */
export type SurfaceEdge = 'wall' | 'drop'

/** A horizontal span the entity can stand on — a section rule, a card top,
    a passing cloud. */
export type Surface = {
  id: string
  /** y of the entity's CENTRE when standing here (one radius above the edge). */
  y: number
  minX: number
  maxX: number
  leftEdge: SurfaceEdge
  rightEdge: SurfaceEdge
  /** Moving surfaces: horizontal velocity, px/s. Standing bodies are carried. */
  carryVx?: number
}

/**
 * The world as movement sees it. Movement owns falling, bouncing and rolling;
 * the interaction manager owns where the floors actually are. This interface
 * is the entire boundary between them.
 */
export type Terrain = {
  /**
   * The surface supporting a body at (x, y), within reflow tolerance.
   * `prefer` is sticky support: if that surface is still under the body it
   * wins outright, so a lift carrying a passenger past a static floor
   * doesn't have its passenger stolen by proximity.
   */
  supportAt(x: number, y: number, prefer?: string): Surface | null
  /** The first surface a body falling from (x, y) would meet, or null. */
  firstBelow(x: number, y: number): Surface | null
  /** The page walls, in body-centre coordinates. */
  walls(): { left: number; right: number }
}
