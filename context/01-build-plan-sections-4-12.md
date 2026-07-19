## 4. The rooms model (mental model for the builder)

- A **room** is a themed, scrollable scene reachable from the Atlas map.
  Every room follows the same five-beat spine: **Threshold → Scene →
  Exhibits → Cat cameo → Exit** (returns to map, stamps it visited).
- An **exhibit** is always: an **artifact** (image / looping video /
  interactive) + a **plaque** (2–3 sentences, first person, honest,
  museum-label voice) + one **thread link** out (repo, full post, source).
- A **corner** is a themed cluster of exhibits inside a room. **Corner→room
  rule:** when a theme accumulates ~5 exhibits it graduates into its own
  room and the map redraws. New interests always enter as one exhibit first.
- **Fog** is the resting state of every unopened region: faint silhouette,
  name on hover, nothing else.
- **Aspirations are content.** Things Yarish hasn't done yet appear as sealed
  objects — the violin as a closed case, bucket-list places as hollow pins.
  Manifest flags flip them open later; the payoff moment is part of the design.

Launch map state: **The Engineer** (open, Phase 1) · **The Library** (opens
Phase 2) · The Explorer / The Musician / The Curiosity Room (fogged) · one
unlabeled fogged region ("more doors appear as life grows").

---

## 5. Data model

**`/content/site.json`**

```json
{
  "name": "Yarish",
  "role": "[YARISH: one-line role]",
  "tagline": "[YARISH: one sentence]",
  "location": "Bangalore, India",
  "email": "[YARISH]",
  "links": { "github": "[YARISH]", "linkedin": "[YARISH]" },
  "resume": "/assets/resume.pdf"
}
```

**`/content/projects/flwr-trees.md`** (Engineer exhibit)

```md
---
title: flwr-trees
oneliner: Federated learning for tree-based models, on PyPI
stack: [Python, Flower, XGBoost]
repo: https://github.com/[YARISH]/flwr-trees
demo: null
year: 2025
featured: true # also appears on Layer 1
specimen:
  type: video # video | image | iframe
  src: /assets/projects/flwr-trees-loop.mp4
---

[YARISH: plaque, 2–3 sentences, first person. What it is, what broke,
what you learned. Honest > impressive.]
```

**`/content/library/*.md`** (Library exhibit)

```md
---
kind: book # book | film | anime | album
title: "[title]"
creator: "[author/director/artist]"
status: loved # loved | to-read | to-watch
take: "[YARISH: ONE honest sentence — this is the exhibit]"
quote: null # optional, under 15 words
cover: null # optional image; default = typographic spine/poster
---
```

Special object, same collection: `library/violin.md` → `kind: instrument`,
`status: sealed`, plaque: _"I'll open this when I can play it."_ Flipping
`status` to `open` changes the render — build both states now.

**`/content/map.json`**

```json
{
  "regions": [
    { "id": "engineer", "name": "The Engineer", "state": "open" },
    { "id": "library", "name": "The Library", "state": "open" },
    { "id": "explorer", "name": "The Explorer", "state": "fogged" },
    { "id": "musician", "name": "The Musician", "state": "fogged" },
    { "id": "curiosity", "name": "The Curiosity Room", "state": "fogged" },
    { "id": "beyond", "name": null, "state": "fogged" }
  ],
  "pins": [
    { "label": "Wimbledon", "state": "someday" },
    { "label": "[YARISH: places visited]", "state": "visited" }
  ]
}
```

**`/content/cat.json`**

```json
{
  "first_click": [
    "Meow.",
    "You found me.",
    "Most visitors stop at the résumé.",
    "If you're curious… come along."
  ],
  "return_visit": ["Back already?", "I've been waiting."],
  "doors_remaining": "There are still {n} doors you haven't opened.",
  "cameos": { "engineer": "sleeping-on-bench", "library": "on-top-shelf" }
}
```

**`/content/log/YYYY-MM-DD-slug.md`** — expedition log entry: `title`,
`date`, short in-world body ("Mapped: The Library").

---

## 6. The cat (full spec, built once in Phase 1)

- **Engine:** requestAnimationFrame loop; 32×32 sprite frames (start from
  the public oneko sheet; keep the sheet swappable for a custom one later).
- **States:** `idle-walk` (wanders the viewport bottom and section top
  edges), `watch-cursor`, `chase` (brief, occasional), `sleep` (curls up
  near a project card after ~45s idle), `sit`, `stretch`, `run-across`
  (rare, once per session max).
- **Hard rules:** never overlaps text being read; never sits on interactive
  hit areas; no sound; pauses when the tab is hidden; ~32–40px — subtle,
  not a mascot.
- **Interaction:** click → small dialogue box (lines from `cat.json`, typed
  one by one) → one button, **"Follow the cat"** → Phase 1: straight into
  The Engineer; Phase 2+: into the Atlas map.
- **Dismissal:** a tiny "shoo" affordance; sets `cat.dismissed`, cat walks
  off-screen. A one-line footer easter egg ("the cat is out") brings it back.
- **Reduced motion:** cat renders seated and static, still clickable.
- **Memory (activated Phase 2):** `cat.met` + `atlas.visited[]` drive
  `return_visit` lines and the `doors_remaining` count from `map.json`.

---

## 7. PHASE 1 — The surface, the cat, the first room

**Goal:** shippable in 2–3 weeks. **Timebox is hard** — cut polish, never
the 30-second path.

### Deliverables

**1A. Layer 1 (single page `/`):** Hero (name, role, tagline, two buttons:
Resume / GitHub) → Featured Projects (3–4 cards from `featured: true`) →
About (short bio) → Skills (grouped plainly; no percentage bars, ever) →
Contact + socials → footer with the easter-egg line. Micro-interactions
only (`hover-lift` on cards, `fade-rise` on section entry).

**1B. The cat** — full §6 spec, minus memory features.

**1C. The Engineer room (`/atlas/engineer`):**

- **Threshold:** lab lights flicker on over ~1.5s, title card
  "The Engineer", palette shift (§8.2). This is the room's one signature moment.
- **Scene:** one vertical scroll styled as a research lab, 5–7 exhibit benches.
- **Exhibit candidates** (final list = whatever Yarish's repo audit has
  cleared as public-ready; public repos only, nothing under review):
  flwr-trees, SpeechCorrection, WanderEcho, LUFY, pokemon-arena, Ghost,
  the ILBS 3-camera anthropometric system (video-only specimen if code is
  private), ESA "Neural Debris Removal." Each = specimen (10s loop or live
  iframe) + plaque + repo link.
- **Future-experiments corkboard:** pinned idea cards from a manifest list —
  this is where intellectual curiosity lives.
- One cat cameo. **Exit:** "back to the surface" (returns to `/`; becomes
  return-to-map in Phase 2).

**1D. Plumbing:** SEO/meta, OG images, cat favicon, sitemap, 404 page (the
cat alone: "there's nothing here yet"), `CONTENT_NEEDED.md` listing every
placeholder used.

### Acceptance checklist

- [ ] 30-second script passes: name/role visible instantly; resume in ≤ 2
      interactions; contact visible without searching.
- [ ] Lighthouse mobile ≥ 95 (performance & accessibility) on `/`.
- [ ] Cat never obstructs text or controls; dismissal persists; reduced-motion works.
- [ ] Engineer room fully manifest-driven: add/delete a project `.md` and the
      room updates with zero code changes.
- [ ] Every exhibit has artifact + plaque + thread link; zero invented copy.
- [ ] Keyboard-only walkthrough of Layer 1 and the room succeeds.

### Yarish supplies

Bio (~80 words) · resume PDF · final project list + repo links · one 10s
capture per project · role line + tagline · social links.

---

## 8. Design direction

### 8.1 Layer 1

Before coding, write a compact token plan — 4–6 named hex values, two type
roles (a characterful display face used sparingly + a quiet body face), a
spacing scale — and test it: _would this exact plan appear for any generic
developer portfolio?_ If yes, revise. Explicitly avoid the current
AI-default looks: cream + serif + terracotta accent; near-black + single
acid accent; broadsheet hairlines-and-columns. Yarish approves the token
plan before build. Feel: a beautifully set document — generous whitespace,
one accent, nothing decorative. **The cat is Layer 1's entire signature;
spend all boldness there and keep everything else quiet.** Copy voice:
plain, specific, active, sentence case; buttons say what they do; no
self-superlatives.

### 8.2 The Atlas

Each room owns a small token set (palette + type accent + ambient detail)
declared in its room folder; the threshold transition establishes it.
Signature moments are budgeted ONE per room: Engineer = lights-on
threshold; Library = a last shelf that quietly repeats itself with small
variations (a Borges joke for whoever notices). Plaque voice everywhere:
2–3 sentences, first person, honest, no adjectives about Yarish himself.

### 8.3 Media exhibits without copyright risk

Default renders are **designed typographic spines** (books) and
**typographic poster cards** (films/anime/albums): title + creator set in
the room's type system on generated textures — more cohesive than mixed
cover art anyway. Real cover thumbnails render only when Yarish supplies
the file.

---

## 9. PHASE 2 — The map, the Library, memory

**Goal:** the Atlas becomes a place that visibly grows.

### Deliverables

**2A. The hub map (`/atlas`):** one illustrated map asset, hand-drawn
fantasy-endpaper style (AI-generated base is fine; Yarish art-directs; keep
it a single optimized image + SVG overlay layers). Regions from
`map.json`: open regions lit and clickable; fogged regions get a soft fog
overlay, faint silhouette, name on hover only; the unlabeled region stays
fully mysterious. **Reveal animation:** flipping a region to `open` plays
a mask-wipe unfog — the map's signature moment (plays once for first-time
visitors on already-open rooms too). **Pins layer:** visited = solid gold,
someday = hollow; Wimbledon glows among the somedays; tooltips only, no
links until The Explorer exists. The cat walks the map between regions.

**2B. The Library room (`/atlas/library`)** — one scroll, three corners:

- **Book wall:** "read" shelf — pulling a spine opens a spread (designed
  cover, optional short quote, the one-line take). "To-read" shelf —
  wrapped spines, hover shows title only.
- **Projector corner:** films + anime as a poster wall with a subtle
  CSS-only projector flicker; clicking a poster flips it to the take.
- **Record crate:** album sleeves flipped by drag (inertia); flip reveals
  the take. The **violin case** sits here sealed with its plaque; the
  `open` state is built now, behind the manifest flag.
- Signature moment: the infinite shelf. Cat cameo on the top shelf.

**2C. Cat memory** per §6: return-visit lines; "doors remaining" computed
live from `map.json`.

**2D. Expedition log (`/atlas/log`):** in-world changelog from
`/content/log`, seeded with "Mapped: The Engineer" and "Mapped: The
Library." Every future launch adds one — these double as LinkedIn posts.

**2E. Share infrastructure:** per-room OG cards; stable room URLs.

### Acceptance checklist

- [ ] Map loads < 1.5s on mid mobile; fog renders correctly.
- [ ] Library fully manifest-driven; `status` flips (to-read → loved,
      sealed → open) re-render with zero code changes.
- [ ] Cat greets returning visitors differently and counts doors correctly.
- [ ] Library ships with ~10 curated items with takes — never a full
      consumption history.
- [ ] All three corners usable by touch, keyboard, and reduced motion.

### Yarish supplies

The curated ~10 (books/films/anime/albums) each with a one-sentence take ·
optional quotes (< 15 words each) · visited-places list for pins · map art
direction feedback.

---

## 10. PHASE 3 — The Curiosity Room, slowly

**Goal:** one fictional world at a time, forever. Never blocks anything.
**Cadence guardrail: max one world per month; no assets are generated
before that world's bible is committed.**

### The room

`/atlas/curiosity` opens (map unfogs) when world #1 ships. Worlds render as
**exhibit cases** in an expedition-log layout: each case = one artifact +
a field-report plaque + a cross-link back to the real seed exhibit
elsewhere in the Atlas. Fogged case slots show future seeds as silhouettes.

### Repeatable process per world

1. **Seed:** one real thing. World #1: SpeechCorrection → _a civilization
   where language is visible._ (Later: violin → a city whose buildings
   resonate; Wimbledon → tennis under low gravity — only after those
   become real content.)
2. **Style bible first** → `/content/worlds/<slug>/bible.md`: palette
   (named hexes), medium/era, 3 reference images, 5 hard rules of the world.
3. **One artifact only:** a 60–90s documentary (script → consistent stills
   per the bible → VO → cut) OR a travel poster OR an illustrated map
   fragment. Never a wiki, never a 13-category encyclopedia.
4. **Exhibit case** with cross-link to the seed's exhibit (e.g. the
   SpeechCorrection bench in The Engineer). Cross-links are what make
   "interconnected worlds" true.
5. **Pipeline as exhibit:** document the generation pipeline (tools,
   consistency method) as a new bench in The Engineer — the whimsy must
   double as an AI-engineering showcase.
6. **Log entry + cat cameo** hidden somewhere in the world's artifact.

### Unfog conditions (mechanical, no debate later)

- **The Explorer** unfogs at the first real trip with 10+ photos. Build its
  chapter template only then: scroll-driven journal — Ken Burns heroes,
  "photo develops" scroll-scrub reveal, SVG route line drawing between
  stops, draggable polaroid piles, handwriting-in captions, optional muted
  ambience. Bucket-list pins turn gold as trips happen.
- **The Musician** unfogs when the violin case opens AND ~5 music exhibits
  exist (until then, music lives in the Library's record crate).
- **Any new theme** becomes a room at ~5 exhibits (corner→room rule); the
  map gains a region and the reveal animation plays.

### Acceptance per world

- [ ] Bible exists; every generated asset visibly obeys it.
- [ ] Exactly one artifact; lazy-loaded; added weight < 15MB.
- [ ] Cross-link works both directions; pipeline exhibit added; log entry written.
- [ ] World is original IP — inspired by Yarish's life, no copyrighted
      characters or settings.

---

## 11. What the AI builder must never do

- Invent biography, projects, opinions, takes, quotes, or metrics for Yarish.
- Add rooms, sections, or features not in this plan without being asked.
- Put animation weight on Layer 1 or let Atlas code load on `/`.
- Use franchise IP, song audio, or cover art Yarish didn't supply.
- Ship a room whose content isn't in `/content`, or bypass the manifest
  layer "just this once."
- Break the motion grammar (three standard motions + one signature per room).
- Mark a phase done with unchecked acceptance items.

---

## 12. Master content checklist (Yarish)

**Phase 1:** bio (~80w) · resume PDF · final public project list + repo
links · 10s capture per project · tagline · socials · headshot (optional).
**Phase 2:** ~10 curated media picks + one-line takes · optional quotes ·
visited-places list · map art feedback.
**Phase 3 (per world):** seed choice · bible approval · VO script approval.
**Ongoing:** one log-entry sentence whenever anything ships.
