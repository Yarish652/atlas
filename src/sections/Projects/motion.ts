/**
 * The unpin choreography, shared by the board (pin, height) and the panel
 * (clip, content) so every part of it moves on one clock.
 */

/** The pin lifting out of the card. */
export const PIN_POP_MS = 200
/** The card starts lifting before the pin is fully out — overlap reads as one motion. */
export const PIN_LEAD_MS = 90

export const EXPAND_MS = 620
export const COLLAPSE_MS = 440

export const EASE_EXPAND = 'cubic-bezier(0.22, 1, 0.36, 1)'
export const EASE_COLLAPSE = 'cubic-bezier(0.55, 0, 0.25, 1)'
