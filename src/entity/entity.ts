import type { DocPoint } from './types'
import type { StateId } from './stateMachine/states'
import { BODY_RADIUS_PX } from './body'
import { createClouds } from './clouds/clouds'
import { createInteraction } from './interaction/manager'
import { watchEnv } from './interaction/env'
import { createClock } from './runtime/clock'
import { createLoop } from './runtime/loop'
import { createMachine } from './stateMachine/machine'
import { createMovement } from './movement/movement'
import { createBrain } from './brain/brain'
import { createDrives, type DriveId } from './drives/drives'
import { BEHAVIOR } from './brain/config'
import { createLayer } from './renderer/layer'
import { createRenderer } from './renderer/renderer'

/**
 * The composition root: the only file that knows all five layers exist.
 *
 *   Interaction (senses) → Brain (decisions) → State Machine (legality)
 *                        → Movement (physics) → Renderer (body)
 *
 * Data flows one way per tick: sense, decide, integrate, draw.
 */

export type Entity = {
  destroy(): void
  /** The visitor's switch: on = alive, off = freeze in place. */
  setEnabled(on: boolean): void
  /** Inspection only. */
  debug(): {
    mode: 'running' | 'paused' | 'frozen' | 'off'
    state: StateId
    pos: DocPoint
    target: DocPoint | null
    speedRatio: number
    phase: string
    surface: string | null
    effort: number
    rollTurns: number
    drives: Record<DriveId, number>
    dominant: DriveId
    energy: number
    ticks: number
  }
}

type Mode = 'running' | 'paused' | 'frozen' | 'off'

/** Trips shorter than this don't earn a landing squash. */
const SETTLE_MIN_TRAVEL_PX = 24

export function mountEntity(): Entity {
  const env = watchEnv(() => applyMode())
  const interaction = createInteraction(() => env.current().viewport === 'mobile')
  const clock = createClock()
  const machine = createMachine(clock)
  const layer = createLayer()
  const renderer = createRenderer(layer)

  interaction.start()

  // The clouds: transient platforms owned by the entity system, folded into
  // the same terrain every other surface lives in. The brain and movement
  // never know a cloud from a card.
  const clouds = createClouds(layer.root, {
    sky: () => interaction.sky(),
    homeX: () => interaction.home().x,
    dropY: () => interaction.home().y - 84,
  })
  interaction.addSurfaceSource(() => clouds.surfaces())

  // Gravity is announced once: the body spawns above its shelf and falls
  // onto it — real ballistics, real landing. (Reduced motion never sees
  // this — freeze() places it directly.)
  const home = interaction.home()
  const movement = createMovement({ x: home.x, y: home.y - 120 }, interaction.terrain())

  // The drive engine: the mind's chemistry, updated every tick from plain
  // observations, read by the brain for every ambient decision.
  const drives = createDrives()

  const brain = createBrain({
    machine,
    movement,
    interaction,
    clock,
    drives,
    env: () => env.current(),
    rng: Math.random,
    micro: (kind) => renderer.micro(kind),
    clouds: { catchable: clouds.catchable, isRising: clouds.isRising },
  })

  let mode: Mode = 'running'
  let ticks = 0
  /** The visitor's switch (companion toggle in the header). */
  let enabled = document.documentElement.dataset.companion !== 'off'
  /** Off was requested mid-air: land first, then freeze. Components don't hover. */
  let freezeOnLanding = false

  function frame() {
    return {
      pos: movement.pos(),
      state: machine.state(),
      look: brain.look(),
      heading: movement.heading(),
      speedRatio: movement.speedRatio(),
      effort: movement.effort(),
      rollDistance: movement.rollDistance(),
      phase: movement.phase(),
    }
  }

  function tick(dt: number) {
    ticks++
    clouds.update(dt)
    // Chemistry first: the drives see the world as it is this tick, then
    // the brain reads them and decides.
    const p = interaction.pointer()
    drives.update(dt, {
      state: machine.state(),
      pointerActive: p !== null && interaction.pointerIdleMs() < BEHAVIOR.POINTER_IDLE_MS,
      pointerSpeed: interaction.pointerSpeed(),
      pointerDist: p ? Math.hypot(p.x - movement.pos().x, p.y - movement.pos().y) : Infinity,
      speedRatio: movement.speedRatio(),
    })
    brain.update()
    const event = movement.update(dt)
    if (event?.kind === 'landed') {
      // Touched down on a cloud it was invited onto → the lift departs.
      // Physical fact, not a decision, so it lives here rather than in the
      // brain: an uninvited landing leaves the cloud an ordinary platform.
      const support = movement.support()
      if (support && support.id.startsWith('cloud-')) clouds.board(support.id)
    }
    if (event?.kind === 'arrived') {
      brain.onArrived()
      // The settle is caused by the stop, not by the state — but a 6px
      // home-correction drifting to rest has no momentum worth showing.
      if (event.traveled > SETTLE_MIN_TRAVEL_PX) renderer.settle()
    } else if (event?.kind === 'landed') {
      // Impact squash, scaled by how hard the floor was hit. Not a brain
      // matter — nothing was decided; gravity happened.
      renderer.settle(Math.min(1.6, event.impact / 700))
    }
    renderer.write(frame(), dt)
    // A deferred off-switch engages the moment the body is back on a floor.
    if (freezeOnLanding && !movement.airborne()) {
      freezeOnLanding = false
      applyMode()
    }
  }

  const loop = createLoop(tick)

  // ── Mode ───────────────────────────────────────────────────────────────
  function applyMode() {
    // No pause-when-offscreen anymore: the entity follows the visitor across
    // the whole page now, so it must keep living (rolling, falling) while
    // outside the viewport or it could never catch up. A hidden tab still
    // pauses everything.
    const next: Mode = env.current().reducedMotion
      ? 'frozen'
      : !enabled && !freezeOnLanding
        ? 'off'
        : document.hidden
          ? 'paused'
          : 'running'
    if (next === mode) return
    const previous = mode
    mode = next

    if (mode === 'frozen') {
      loop.stop()
      clock.pause()
      freeze()
      return
    }

    if (mode === 'off') {
      // The visitor's switch. Freeze exactly where it stands — no
      // relocation, no breathing, a component like any other.
      loop.stop()
      clock.pause()
      renderer.setFrozen(true)
      renderer.write(frame(), 0)
      return
    }

    if (mode === 'paused') {
      loop.stop()
      clock.pause()
      return
    }

    // running
    clock.resume()
    if (previous === 'frozen') {
      // The preference was cleared mid-session. Wake calmly at home.
      machine.reset()
      movement.place(interaction.home())
    } else if (previous === 'off') {
      // Wake where it froze, calm, and let behaviour resume from zero.
      renderer.setFrozen(false)
      machine.reset()
      movement.place(movement.pos())
    }
    loop.start()
  }

  /**
   * Reduced motion means still, not slow. Deterministic placement: a visitor
   * who loads with the preference on and one who enables it mid-session end
   * up identical — resting at home, breathing not even implied.
   */
  function freeze() {
    machine.reset()
    movement.place(interaction.home())
    renderer.write(frame(), 0)
  }

  const onVisibility = () => applyMode()

  function setEnabled(on: boolean) {
    if (on === enabled) return
    enabled = on
    if (!on && movement.airborne()) {
      // Mid-fall. Let gravity finish — the freeze engages on touchdown.
      freezeOnLanding = true
      return
    }
    freezeOnLanding = false
    applyMode()
  }

  // The companion toggle in the header. It announces; we obey. The header
  // never imports the entity, the entity never queries the header — the
  // document attribute is the entire contract.
  const onCompanion = () => {
    setEnabled(document.documentElement.dataset.companion !== 'off')
  }

  // ── Start ──────────────────────────────────────────────────────────────
  renderer.write(frame(), 0)
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('atlas:companion', onCompanion)

  if (env.current().reducedMotion) {
    mode = 'frozen'
    freeze()
  } else if (!enabled) {
    // The visitor switched the companion off before it even mounted. Skip
    // the entrance; a switched-off component sits at home, grounded.
    mode = 'off'
    movement.place(home)
    renderer.setFrozen(true)
    renderer.write(frame(), 0)
  } else {
    loop.start()
  }

  return {
    destroy() {
      loop.stop()
      env.stop()
      interaction.stop()
      clouds.destroy()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('atlas:companion', onCompanion)
      layer.destroy()
    },

    setEnabled,

    debug: () => ({
      mode,
      state: machine.state(),
      pos: {
        x: Math.round(movement.pos().x),
        y: Math.round(movement.pos().y),
      },
      target: movement.target(),
      speedRatio: Math.round(movement.speedRatio() * 100) / 100,
      phase: movement.phase(),
      surface: movement.support()?.id ?? null,
      effort: Math.round(movement.effort() * 100) / 100,
      drives: Object.fromEntries(
        Object.entries(drives.levels()).map(([k, v]) => [k, Math.round(v)]),
      ) as Record<DriveId, number>,
      dominant: drives.dominant(),
      energy: Math.round(drives.energy()),
      rollTurns: Math.round(movement.rollDistance() / (2 * Math.PI * BODY_RADIUS_PX) * 100) / 100,
      ticks,
    }),
  }
}
