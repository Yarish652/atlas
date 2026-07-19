/**
 * Environment policy.
 *
 * Two independent axes, deliberately not conflated: a small window is not a
 * touch device, and a tablet with a trackpad is not a phone.
 */
export type Env = {
  /** Freeze entirely, don't just slow down. */
  reducedMotion: boolean
  /** Matches the site's `md` breakpoint. */
  viewport: 'mobile' | 'desktop'
  /** Governs cursor-dependent states. There is no cursor to notice on touch. */
  finePointer: boolean
}

export type EnvWatcher = {
  current(): Env
  stop(): void
}

export function watchEnv(onChange: (env: Env) => void): EnvWatcher {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const mobile = window.matchMedia('(max-width: 767px)')
  const fine = window.matchMedia('(pointer: fine)')

  const read = (): Env => ({
    reducedMotion: reduced.matches,
    viewport: mobile.matches ? 'mobile' : 'desktop',
    finePointer: fine.matches,
  })

  let env = read()

  const update = () => {
    const next = read()
    const changed =
      next.reducedMotion !== env.reducedMotion ||
      next.viewport !== env.viewport ||
      next.finePointer !== env.finePointer
    env = next
    if (changed) onChange(env)
  }

  // Live listeners, not a load-time read: toggling the OS preference
  // mid-session must freeze the entity immediately.
  reduced.addEventListener('change', update)
  mobile.addEventListener('change', update)
  fine.addEventListener('change', update)

  return {
    current: () => env,
    stop() {
      reduced.removeEventListener('change', update)
      mobile.removeEventListener('change', update)
      fine.removeEventListener('change', update)
    },
  }
}
