/**
 * Phase 1 state set.
 *
 * Every state is a link in a caused chain — nothing here exists "because it
 * looks nice". The canonical loop:
 *
 *   REST → NOTICE → ALERT → APPROACH → OBSERVE → RETURN → REST
 *
 * REST      breathing at home. The default and the destination.
 * NOTICE    the cursor came near; the entity hasn't reacted *yet*. The
 *           reaction delay lives here — visually identical to REST, which is
 *           the point: awareness arrives late, like something deciding.
 * ALERT     awareness. Squash, orient toward the cursor, watch.
 * FOLLOW    engaged. Tracks the cursor along the ground line, keeping a
 *           polite gap — a ball under gravity follows, it never hovers.
 * APPROACH  curiosity won. Rolling toward a target's spot on the ground,
 *           with a beat of hesitation before departing.
 * OBSERVE   standing on the line beneath the target, looking up at it.
 * RETURN    interest spent. Rolling home.
 *
 * Drive-born states (the ambient life, no cursor required):
 * SLEEP     comfort won. Deep rest — slow breathing, eyes closed, energy
 *           regenerating. Ends when comfort spends itself or something near.
 * EXPLORE   curiosity won with nobody around. Wander somewhere, inspect it.
 * EVADE     caution spiked — a violent cursor too close. Back away, stare.
 * PLAY      playfulness won. A hop or two, then done. Rare, short.
 */
export type StateId =
  | 'REST'
  | 'NOTICE'
  | 'ALERT'
  | 'FOLLOW'
  | 'APPROACH'
  | 'OBSERVE'
  | 'RETURN'
  | 'SLEEP'
  | 'EXPLORE'
  | 'EVADE'
  | 'PLAY'

/**
 * Legal transitions. The machine enforces these; the brain proposes them.
 * Anything not listed is a logic error and is refused, so a bad decision can
 * never produce an impossible animation.
 */
export const TRANSITIONS: Record<StateId, readonly StateId[]> = {
  REST: ['NOTICE', 'SLEEP', 'EXPLORE', 'PLAY', 'EVADE'],
  NOTICE: ['REST', 'ALERT', 'EVADE'],
  ALERT: ['REST', 'APPROACH', 'FOLLOW', 'EVADE'],
  FOLLOW: ['RETURN', 'APPROACH', 'EVADE'],
  APPROACH: ['OBSERVE', 'RETURN', 'EVADE'],
  OBSERVE: ['RETURN', 'APPROACH', 'EVADE'],
  // RETURN → APPROACH: renewed curiosity beats going home.
  RETURN: ['REST', 'APPROACH', 'EVADE'],
  // A sleeper can only wake (or be startled — EVADE covers that via REST).
  SLEEP: ['REST', 'EVADE'],
  EXPLORE: ['REST', 'RETURN', 'APPROACH', 'EVADE'],
  // After backing off it watches; the watching resolves through ALERT.
  EVADE: ['ALERT', 'REST'],
  PLAY: ['REST'],
}
