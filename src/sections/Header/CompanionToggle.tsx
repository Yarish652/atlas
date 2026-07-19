import { useState } from 'react'
import styles from './CompanionToggle.module.css'

/**
 * The companion switch: the ball's portrait, drawn in the page's opposite
 * colour. Solid and breathing while the companion is alive; hollow and still
 * when it is off.
 *
 * The header does not know the entity exists. This flips a document-level
 * flag and announces the change; whatever is listening reacts. If nothing
 * listens, it is an inert, honest little circle.
 */
const EVENT = 'atlas:companion'

export function CompanionToggle() {
  const [on, setOn] = useState(
    () => document.documentElement.dataset.companion !== 'off',
  )

  const toggle = () => {
    const next = !on
    setOn(next)
    document.documentElement.dataset.companion = next ? 'on' : 'off'
    window.dispatchEvent(new CustomEvent(EVENT, { detail: { on: next } }))
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      className={styles.toggle}
      onClick={toggle}
      title={on ? 'Companion: on' : 'Companion: off'}
    >
      <span className="sr-only">
        {on ? 'Pause the page companion' : 'Wake the page companion'}
      </span>
      <span className={styles.ball} aria-hidden="true" />
    </button>
  )
}
