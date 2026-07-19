# The Ball — Atlas Entity System Reference

Everything about the resident of this page: its body, its world, and its
mind. This is the document to read before touching `src/entity/` — and the
spec the future Rive cat must honour.

The ball is a placeholder **body**. The interaction architecture, physics,
and behaviour engine underneath it are the product. If the ball already
feels alive, the cat only adds ears.

---

## 1. What it is

A behaviour-driven entity that lives ON the page — not an animation that
plays on top of it. Every movement has a cause:

```
world changes → drives shift → brain decides → machine legalises
             → movement integrates → renderer draws
```

Nothing reacts instantly, on principle. Every reaction has the shape
**delay → decision → movement → settle**. And not everything finishes what
it started — also on principle.

---

## 2. Architecture

```
src/entity/
├── interaction/   the senses    — all DOM reads, pointer, floors, targets
├── drives/        the chemistry — 5 drives + energy, all tunable
├── brain/         the decisions — the only layer that decides anything
├── stateMachine/  the law       — legal states and transitions
├── movement/      the physics   — rolling, gravity, jumping, springs
├── renderer/      the body      — circle, deformation, gaze, micro-signs
├── clouds/        the weather   — transient platforms, the way back up
├── runtime/       loop (30Hz rAF) + pausable behaviour clock
├── body.ts        the one shared number: BODY_RADIUS_PX = 18
└── entity.ts      composition root — the only file that knows all layers
```

Data flows one way per tick: **sense → chemistry → decide → integrate →
draw**.

### Contracts (who is allowed to know what)

- The homepage does not know the entity exists. The entity knows the
  homepage exists in exactly one file: `interaction/map.ts`.
- The brain never touches the DOM; it asks the interaction manager.
- The brain asks **movement** what it is standing on (physical truth), never
  re-derives it from coordinates.
- Drives never act — they only lean on the brain's decisions.
- The renderer is write-only, never reads layout, and is the only
  replaceable layer. Swapping the ball for a cat = reimplementing
  `renderer/` against the same `Frame`, touching nothing else.
- Movement is artwork-free: it reports signals (phase, effort, roll
  distance); the renderer decides what a body does with them.
- `main.tsx` is the only place that knows both the page and the entity.

---

## 3. The world (terrain)

The page is a physical world: every section's bottom rule is a **floor**,
each broken by one visible 96px gap the ball falls through. Gaps are drawn
in CSS (`styles/global.css` + `Footer.module.css`) with the *same formulas*
the physics uses — change one, change both. Gap positions are staggered so
a fall never chutes through two floors.

| floor    | gap position           | a fall lands on            |
|----------|------------------------|----------------------------|
| hero     | left — ends min(280px, 20%) | stack shelf           |
| stack    | right — starts 75%     | rightmost project card     |
| projects | left                   | the About portrait         |
| about    | right — 62% (stagger)  | timeline floor             |
| timeline | right — 75%            | **the globe**              |
| location | left                   | contact floor              |
| contact  | right — 75%            | the footer den             |
| footer   | none — walls both ends | nowhere. The end.          |

**Platforms** (element tops, both edges drop): project cards, the About
portrait frame, the globe canvas. **Clouds** are transient platforms in the
contact sky. Page edges are **walls** — momentum reflects off them
(restitution 0.45).

Floors are live geometry: measured lazily, marked dirty by resize /
ResizeObserver / MutationObserver (the globe mounts lazily). A reflow
carries the ball with its floor; a floor moved beyond tolerance means the
ball *falls* to wherever it went.

Every destination the brain can issue lies **on a floor**. Home is the hero
rule, right of the copy. Standing "beside" a button means standing on the
floor beneath it, gazing up.

---

## 4. Physics (movement/)

Two regimes; rolling off a `drop` edge is the only door between them.

**Grounded** — rolling:
- Seek at the braking curve's limit: `speed = min(300, √(2·380·distance))`.
  Never constant speed; acceleration capped at 620 px/s².
- Anticipation: a 150ms crouch before any trip ≥ 48px. Micro-corrections
  skip it.
- The last 18px are an underdamped spring (ζ = 0.72) — every stop
  overshoots a few px and eases back.
- **Rolling is physically correct**: rotation = horizontal distance /
  radius, applied to a faint surface-grain layer. Verified exact: a 912px
  trip = 8.06 turns = 912 / (2π·18).
- Moving surfaces **carry** what stands on them (`carryVx`) — no roll,
  because the floor moves with the body.
- **Sticky support**: the floor underfoot wins while it's still there; a
  lift passing another floor's altitude cannot have its passenger stolen.

**Airborne** — ballistics:
- Gravity 2200 px/s², terminal 1300 px/s. Horizontal momentum preserved;
  walls reflect it mid-air.
- Landings faster than 280 px/s bounce once (restitution 0.36) and *skid*
  (the floor takes a bite of horizontal speed too — unchecked carry once
  hopped the ball across the next floor's gap).
- `hop(vx, vy)` is the only way to gain height. The brain computes real
  projectile arcs (`vy = √(2g(h + clearance))`), leading a drifting cloud.
- You cannot change your mind mid-air. Decisions wait for the ground.

**Motion quality** (renderer):
- Squash-and-stretch from *effort* (smoothed acceleration): stretch along
  the heading on push-off, compress when braking — applied as
  `rotate(θ) scale rotate(−θ)` so the body deforms without net rotation.
- Landing squash scales with impact. Asymmetric breathing (slow inhale,
  quicker exhale, long still beat). The gaze dot leads attention.

---

## 5. The clouds (the way back up)

Two paper-soft clouds drift and bob in the contact section's open right
side. They are ordinary platforms until the ball **jumps onto one it was
invited to** (the jump names its cloud; a stray fall landing on one does
not hijack the descent).

A boarded cloud becomes a lift: eases up to 380 px/s, wind leans it toward
home (≤ 55 px/s), passes every floor without snagging (sticky support),
dissolves 84px above the hero shelf — dropping its passenger onto home —
and keeps rising, fading out above the navbar. A replacement forms below.

Jump trigger: on the contact floor, in FOLLOW, when the cursor's floor is
*above* and a drifting cloud is in the catch envelope (70–320px above,
within 280px horizontally).

---

## 6. States (stateMachine/)

Eleven states; transitions are enforced — an illegal proposal is refused.

**Cursor-born:**
- `REST` — breathing at home. The default and the destination.
- `NOTICE` — the delay before reacting. Visually identical to REST.
- `ALERT` — awareness: squash, orient, watch.
- `FOLLOW` — tracks the cursor's shadow along its floor at a polite 90px
  gap, descends through gaps toward a cursor below, leaps for clouds when
  the cursor is above.
- `APPROACH` — curiosity committed to a target; hesitates, then rolls to
  the spot beneath it. Can be abandoned halfway.
- `OBSERVE` — beneath the target, gazing up. Interest expires.
- `RETURN` — rolling home (or settling in place if home is unreachable —
  gravity has no ladder).

**Drive-born (the ambient life, no cursor required):**
- `SLEEP` — comfort won. 5.8s breathing, gaze fades out (eyes closed),
  energy regenerating. Min nap 6s.
- `EXPLORE` — curiosity won with nobody around: wander to a random spot or
  an unvisited target, inspect it, be satisfied.
- `EVADE` — caution spiked (violent cursor within 300px): back off
  70–120px, wary stare, resolve through ALERT.
- `PLAY` — playfulness won: one or two little hops. Rare, short, never
  near a drop edge.

---

## 7. The mind (drives/)

Five drives (0–100) plus an **energy** budget — the chemistry, separate
from the decisions. None of them mention the cursor's meaning; the cursor
only influences them. Every second they compete; the incumbent keeps the
crown unless beaten by 8 points (hysteresis). The brain expresses the
winner. Losing drives keep accumulating, so behaviour cycles by itself.

| drive       | grows                                    | falls                        | expressed as |
|-------------|------------------------------------------|------------------------------|--------------|
| curiosity   | cursor alive (+1.4/s), idle (+0.55/s), appears (+20), hover (+40), waking (+15) | decay toward 40 — **but not while asleep** | noticing, EXPLORE, approaching |
| comfort     | visitor idle & body still (+2.2/s, ×1.5 tired) | moving, being engaged, sleeping (−1.3/s) | SLEEP at ≥ 75 |
| caution     | fast cursor (> 1500 px/s) near (< 300px): +30 | −7/s (fear fades fast)      | EVADE at ≥ 25 |
| playfulness | +0.4/s while energy > 55                 | play (−55)                   | PLAY at ≥ 65 |
| boredom     | engaged (+4.5/s)                         | −2.5/s otherwise             | disengage FOLLOW at 55, abandon APPROACH at 42 |

Energy: drains with movement (3/s at full speed), regains resting (1.2/s),
fast asleep (5/s). Low energy makes comfort grow half again as fast.

**The verified life cycle, zero input**: REST → (comfort 75) SLEEP →
comfort spends itself while curiosity grows undecayed → wake → `+15`
curiosity boost → EXPLORE. Sleep restores wonder; that rule *is* the loop.

### Imperfection & memory

- **Ignore roll**: chance = 12% + (comfort − curiosity) × 0.3%/pt,
  clamped 2–60%. A comfortable ball snubs you more.
- **Attention decay**: boredom accumulates while engaged; ~12–30s of
  following ends with it walking away unprompted.
- **Abandonment**: an approach past 1.2s with drained curiosity or high
  boredom can be given up halfway.
- **Memory**: inspected targets go on a 30s cooldown — "already saw that."
  Waking primes exploring. Play restores a little comfort.

---

## 8. Micro-behaviours (the gold mine)

0.2s life signs, additive Web Animations that stack on the breathing:

| context            | cadence   | signs                    |
|--------------------|-----------|--------------------------|
| moving             | 2.2–4.2s  | glance                   |
| resting / explore  | 6–14s     | blink, adjust, glance    |
| watching (alert/observe/follow/evade) | 2.5–5s | blink, glance |
| sleeping           | 20–40s    | twitch (the tail-flick)  |

`blink` winks the gaze; `glance` darts it aside and back; `twitch` is a
tiny body pulse; `adjust` a small weight shift.

---

## 9. The companion toggle

The dot next to the "Atlas" wordmark — the ball's own portrait in the
page's opposite colour. Solid and breathing = on; hollow and still = off.
`role="switch"`, 28px hit area, focus ring, reduced-motion aware.

The header never imports the entity: the button flips
`<html data-companion>` and dispatches `atlas:companion`; the entity
listens. **Off** freezes the ball exactly where it stands (rounded back to
a perfect circle, breathing killed, loop stopped — zero cost). Switched
off mid-fall, it lands first: components don't hover. **On** wakes it
calmly where it froze.

Mode priority: reduced-motion (frozen at home) > companion off > hidden
tab (paused) > running.

---

## 10. Accessibility & modes

- The overlay is `pointer-events: none` on every element, `aria-hidden` on
  the root. It is structurally impossible for the ball to block a click.
- `prefers-reduced-motion` freezes entirely — placed at home, no breathing,
  loop never starts. Toggling mid-session freezes immediately.
- Touch devices: touch never counts as a cursor; nothing tracks a finger
  that isn't there.
- Hidden tab pauses the loop and the behaviour clock (time does not pass;
  no timeout backlog on return).
- The entity loads lazily after first paint — it never competes with the
  hero for LCP. Arriving a moment late is in character.

---

## 11. Tuning & debugging

Dev console:

```js
__atlasEntity.debug()
// { mode, state, pos, target, speedRatio, phase, surface,
//   effort, rollTurns, drives: {curiosity, comfort, caution,
//   playfulness, boredom}, dominant, energy, ticks }

__atlasParams   // the ENTIRE temperament, live-mutable
```

Every number in `drives/params.ts` is read at use-time — mutate and the
behaviour re-tunes on the next tick. Recipes:

```js
__atlasParams.COMFORT.SLEEP_AT = 58            // a napper
__atlasParams.BOREDOM.DISENGAGE_AT = 20        // aloof — loses interest fast
__atlasParams.CAUTION.FAST_CURSOR_PX_S = 600   // jumpy
__atlasParams.CURIOSITY.HOVER_BOOST = 80       // button-obsessed
__atlasParams.PLAYFULNESS.GAIN_PER_S = 2       // kittenish
__atlasParams.MEMORY.REVISIT_COOLDOWN_MS = 5e3 // forgetful
```

Movement/motion constants live in `movement/movement.ts` (`TUNING`),
behavioural timing in `brain/config.ts` (`BEHAVIOR`), world geometry in
`interaction/map.ts` + `manager.ts` constants.

---

## 12. Replacing the ball with the cat

The renderer is the only disposable layer. The cat must:

1. Reimplement `renderer/` against the same `Frame`:
   `{ pos, state, look, heading, speedRatio, effort, rollDistance, phase }`
   — mapping states to poses, effort to gait, look to head/eye rig,
   micro kinds to ear/tail/blink animations.
2. Update `body.ts` (`BODY_RADIUS_PX`) to the cat's footprint — floors,
   rolling, and standing spots all follow automatically.
3. Touch nothing else. The brain, drives, machine, movement, terrain, and
   clouds never knew it was a ball.

The personality is already here. The cat gives it ears, paws, whiskers,
and a tail.
