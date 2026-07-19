/**
 * Behavioural timing. Ranges are sampled per event — an entity that reacts in
 * exactly 1.2s every time is a machine, and the illusion dies.
 */
export const BEHAVIOR = {
  /** The reaction delay: the cursor is live, the entity hasn't reacted yet. */
  NOTICE_DELAY_MS: [800, 2000] as const,
  /** Sometimes it just doesn't care. Believability lives in the misses. */
  IGNORE_CHANCE: 0.12,
  /** After ignoring, don't re-notice immediately — the snub was the decision. */
  IGNORE_COOLDOWN_MS: [4000, 9000] as const,
  /** Cursor still for this long and the entity loses interest. */
  POINTER_IDLE_MS: 3000,
  /** Hover a target this long before curiosity commits. */
  CURIOSITY_HOVER_MS: [350, 800] as const,
  /** Watch from ALERT this long before engagement wins and it follows. */
  FOLLOW_AFTER_MS: [700, 1500] as const,
  /** The polite gap: it follows the cursor, it doesn't park under it. */
  FOLLOW_GAP_PX: 90,
  /** The beat between deciding to go and actually going. */
  DEPART_DELAY_MS: [250, 700] as const,
  /** How long standing beside a target stays interesting. */
  OBSERVE_MS: [2600, 5200] as const,
  /** Visitor does nothing for this long → give up whatever this was, go home. */
  BORED_MS: 14000,
} as const

export function sample(rng: () => number, [lo, hi]: readonly [number, number]) {
  return lo + rng() * (hi - lo)
}
