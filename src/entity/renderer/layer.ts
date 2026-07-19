import { BODY_RADIUS_PX } from '../body'
import styles from './layer.module.css'

/**
 * The entity's DOM, built imperatively.
 *
 * Deliberately not a React component. The renderer writes transforms directly
 * and would never re-render anyway, so React would contribute a lifecycle to
 * manage and nothing else. Staying out of the tree also keeps the entity
 * framework-independent — it is a resident of the page, not a feature of it.
 *
 * Transform layering, one concern per element:
 *
 *   entity   position           (JS, per frame)
 *   breath   state animation    (CSS keyframes — breathing, squash, settle)
 *   ball     deformation        (JS — squash-and-stretch, crouch)
 *   roll     rolling            (JS — θ = distance / radius)
 *   gaze     attention          (JS)
 *
 * Splitting them means the breathing keyframes, the stretch math and the
 * rolling rotation never fight over one transform property.
 */
export type Layer = {
  root: HTMLElement
  entity: HTMLElement
  breath: HTMLElement
  ball: HTMLElement
  roll: HTMLElement
  gaze: HTMLElement
  destroy(): void
}

export function createLayer(): Layer {
  const root = document.createElement('div')
  root.className = styles.layer
  // The entity is decorative for input purposes, full stop.
  root.setAttribute('aria-hidden', 'true')

  const entity = document.createElement('div')
  entity.className = styles.entity
  entity.dataset.state = 'REST'

  const breath = document.createElement('div')
  breath.className = styles.breath
  // Sized from the shared body spec so the drawn circle, the rolling math and
  // the standing surfaces can never disagree.
  const d = BODY_RADIUS_PX * 2
  breath.style.width = `${d}px`
  breath.style.height = `${d}px`
  breath.style.left = `${-BODY_RADIUS_PX}px`
  breath.style.top = `${-BODY_RADIUS_PX}px`

  const ball = document.createElement('div')
  ball.className = styles.ball

  const roll = document.createElement('div')
  roll.className = styles.roll

  const gaze = document.createElement('div')
  gaze.className = styles.gaze

  ball.appendChild(roll)
  ball.appendChild(gaze)
  breath.appendChild(ball)
  entity.appendChild(breath)
  root.appendChild(entity)
  document.body.appendChild(root)

  return {
    root,
    entity,
    breath,
    ball,
    roll,
    gaze,
    destroy() {
      root.remove()
    },
  }
}
