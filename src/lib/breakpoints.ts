/**
 * Single source of truth for responsive breakpoints.
 * CSS Modules can't reference these numbers directly (custom properties
 * don't work inside @media conditions), so any `@media (min-width: …)`
 * in a .module.css file must match these values by hand.
 */
export const breakpoints = {
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

export type Breakpoint = keyof typeof breakpoints
