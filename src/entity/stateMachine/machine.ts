import type { Clock } from '../runtime/clock'
import { TRANSITIONS, type StateId } from './states'

/**
 * The state machine holds *what the entity is doing* and nothing else — no
 * timers, no targets, no geometry. The brain owns the decisions; this owns
 * their legality and their timestamps.
 */
export type Machine = {
  state(): StateId
  /** Behaviour-clock time the current state was entered. */
  enteredAt(): number
  /** ms in the current state, by the behaviour clock. */
  elapsed(): number
  is(...ids: StateId[]): boolean
  /** Propose a transition. Refused (false) if the table forbids it. */
  to(next: StateId): boolean
  /** Hard reset to REST. For freeze/unfreeze only — not a decision. */
  reset(): void
}

export function createMachine(clock: Clock): Machine {
  let state: StateId = 'REST'
  let enteredAt = clock.now()

  return {
    state: () => state,
    enteredAt: () => enteredAt,
    elapsed: () => clock.now() - enteredAt,
    is: (...ids) => ids.includes(state),

    to(next) {
      if (!TRANSITIONS[state].includes(next)) return false
      state = next
      enteredAt = clock.now()
      return true
    },

    reset() {
      state = 'REST'
      enteredAt = clock.now()
    },
  }
}
