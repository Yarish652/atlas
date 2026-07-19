/**
 * ★ THE ONLY FILE IN THE ENTITY SYSTEM THAT NAMES THE HOMEPAGE.
 *
 * Everything else works in terms of "home" and abstract target ids. If the
 * homepage is redesigned, this file is the entire migration.
 *
 * Rules for adding a target:
 *  1. Prefer a selector the page already has for its own reasons — a section
 *     id, `a[href$=".pdf"]`, `a[href^="mailto:"]`.
 *  2. Never add an element that exists only to be a target. Geometry is
 *     inferred from what is already on the page.
 */

/** Curiosity targets: things the entity may notice and walk up to. */
export type TargetId = 'resume' | 'email' | 'contact-email' | 'contact-resume'

/** The world's root. Home lives inside this element's bounds. */
export const HOME_ROOT_SELECTOR = '#top'

export const TARGET_SELECTORS: Record<TargetId, string> = {
  resume: '#top a[href$=".pdf"]',
  email: '#top a[href^="mailto:"]',
  'contact-email': '#contact a[href^="mailto:"]',
  'contact-resume': '#contact a[href$=".pdf"]',
}

/**
 * The floors of the world, top to bottom — every section's bottom rule, each
 * broken by one visible gap the body can fall through. Gap positions are
 * STAGGERED between consecutive floors so a fall never chutes through two
 * rules in a row: each gap sits over solid floor (or a platform) below.
 *
 * The gaps are drawn in `styles/global.css` (and Footer.module.css) as
 * background gradients replacing the borders — same formulas, same 96px.
 *
 *   hero      ──gap──════════▌   → stack shelf
 *   stack     ▐═══════──75%──     → the rightmost project card
 *   projects  ──gap──════════▌   → the About portrait
 *   about     ▐════──62%──═══▌   → timeline floor
 *   timeline  ▐═══════──75%──▌   → the globe
 *   location  ──gap──════════▌   → contact floor
 *   contact   ▐═══════──75%──▌   → the footer den
 *   footer    ▐══════════════▌   → nowhere. Walls. The end.
 */
export type RuleSpec = {
  id: string
  selector: string
  /** Side of the visible gap; null = unbroken rule (walls both ends). */
  gap: 'left' | 'right' | null
  /** Right-side gaps: where the gap starts, as a fraction of rule width. */
  gapStartRatio?: number
}

export const RULE_SPECS: RuleSpec[] = [
  { id: 'hero', selector: '#top', gap: 'left' },
  { id: 'stack', selector: '#stack', gap: 'right', gapStartRatio: 0.75 },
  { id: 'projects', selector: '#projects', gap: 'left' },
  { id: 'about', selector: '#about', gap: 'right', gapStartRatio: 0.62 },
  { id: 'timeline', selector: '#timeline', gap: 'right', gapStartRatio: 0.75 },
  { id: 'location', selector: '#location', gap: 'left' },
  { id: 'contact', selector: '#contact', gap: 'right', gapStartRatio: 0.75 },
  { id: 'footer', selector: 'footer', gap: null },
]

/** Platforms: element tops the body can land on and roll along. */
export const PLATFORM_SPECS: Array<{ idPrefix: string; selector: string }> = [
  { idPrefix: 'card', selector: '#projects article' },
  { idPrefix: 'portrait', selector: '#about [data-portrait]' },
  { idPrefix: 'globe', selector: '#location canvas' },
]
