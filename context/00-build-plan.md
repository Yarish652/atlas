# Project Atlas — Build Plan & Context

**Owner:** Yarish · **Version:** 1.0 (July 2026) · **Status:** Approved for build

---

## 0. What this document is

The complete context and phased build specification for Project Atlas, Yarish
portfolio website. Written to be handed to an AI coding agent (e.g. Claude Code).

**How to use it in a build session:**

1. Always load sections 1–6 (context, principles, stack, data model, the cat) —
   they apply to every phase.
2. Load only the phase section currently being built (7, 9, or 10).
3. Work in vertical slices: one deliverable end-to-end, commit, then the next.
4. A phase is complete only when every item in its acceptance checklist passes.
5. Whenever real content is missing, do NOT invent it — render the designed
   placeholder state and add a line to `CONTENT_NEEDED.md` at repo root.
   yarish fills these in.

---

## 1. Context

**Who this is for.** Yarish 

**The idea.** A portfolio that becomes a place. Three layers:

- **Layer 1 — The Portfolio.** Clean, restrained, professional homepage.
  A recruiter finds name, role, resume, projects, and contact within 30
  seconds and never has to notice anything unusual.
- **Layer 2 — The Cat.** A small animated sprite cat lives on the homepage.
  It walks, sleeps, watches the cursor. It is never explained. Clicking it
  opens a short dialogue and a single door.
- **Layer 3 — The Atlas.** Behind the door: an illustrated map of rooms.
  Most of the map is under fog. Rooms open over years as Ahmad's life
  produces content. At launch only The Engineer is open; The Library opens
  in Phase 2.

**Success criteria.** The 30-second recruiter path works without friction ·
Lighthouse mobile ≥ 95 on Layer 1 · someone mentions the cat unprompted ·
adding new content never requires touching component code.

**Guiding philosophy.** Professional work proves competence. Personal content
reveals character. Incompleteness is designed-in: fog is a promise, not an
apology. The site is a living archive meant to grow for years.

---

## 2. Non-negotiable principles (every phase)

1. **Layer 1 is restrained.** No scroll effects, no particles, no gradient
   heroes. Micro-interactions and the cat only. The contrast between the calm
   surface and the rich hidden world is the entire magic trick.
2. **Honest content only.** Never invent projects, books, quotes, metrics,
   testimonials, or biography. Missing content → designed placeholder +
   `CONTENT_NEEDED.md` entry. No lorem ipsum in committed code.
3. **Fog over filler.** A room ships only when its content exists in
   `/content`. Unbuilt rooms are fogged map regions — never empty pages,
   never "coming soon" walls.
4. **Everything is data-driven.** Rooms, exhibits, pins, cat dialogue, and
   log entries render from `/content`. New content = new file, zero code.
5. **Motion grammar.** Exactly three standard motions site-wide: `fade-rise`
   (400ms ease-out), `scroll-scrub` (ScrollTrigger, scrub: true), `hover-lift`
   (translateY −4px + shadow). Plus at most ONE signature moment per room.
6. **Performance budget.** Layer 1: LCP < 2s on mid-range mobile, JS < 100KB
   gzipped, AVIF/WebP with blur-up placeholders, below-the-fold lazy. Atlas
   rooms lazy-load entirely and never weigh down `/`. Animate
   `transform`/`opacity` only.
7. **Accessibility.** `prefers-reduced-motion` swaps all motion for fades
   (the cat sits statically, still clickable). The cat is dismissible,
   persisted in localStorage. Full keyboard nav. Alt text everywhere.
8. **Deep links.** Every room and exhibit has a stable URL and correct OG
   card. The Atlas spreads by shared links — that requires URLs.
9. **Mobile is first-class inside the Atlas.** Shared links open on phones.
   Heavy effects degrade gracefully; test on a mid-range Android profile.
10. **No copyrighted assets.** No franchise characters, no song audio, no
    scanned covers. Media exhibits default to designed typographic
    spines/posters (§8.3); real cover thumbnails only if Ahmad supplies them.

---

## 3. Architecture & stack

- **Framework:** Astro (static-first) + TypeScript; interactive pieces as islands.
- **Content:** Astro Content Collections reading `/content` (markdown + JSON,
  schemas in §5), validated with zod.
- **Animation:** GSAP + ScrollTrigger (+ SplitText where useful). Lenis smooth
  scroll **inside Atlas routes only** — never on Layer 1.
- **The cat:** sprite-sheet engine in vanilla TS, modeled on oneko.js (study
  its loop; reimplement cleanly). Sprite sheet swappable via config.
- **State:** localStorage only (`atlas.visited[]`, `cat.dismissed`,
  `cat.met`). No backend, no accounts, no analytics by default.
- **Hosting:** Vercel or Netlify, static output. OG images generated at build.

**Repo layout:**
```
/src
  /components        # Layer 1 sections, cat engine, atlas shell
  /rooms             # one folder per room (engineer/, library/, ...)
  /layouts
  /pages             # index, /atlas, /atlas/[room], /atlas/log
/content
  site.json
  /projects          # one .md per Engineer exhibit
  /library           # one .md per book/film/anime/album
  map.json
  cat.json
  /log               # expedition log entries
  /worlds            # Phase 3, one folder per world
/public/assets       # images, sprite sheets, resume.pdf
CONTENT_NEEDED.md
CLAUDE.md
```

**`CLAUDE.md` stub for the repo:** (everywhere the source doc said "ahmad",
replace with "yarish" — ahmad is yarish's friend; this build is for yarish)

```md
This is Project Atlas, Yarish's layered portfolio. Read
docs/project-atlas-build-plan.md before any task. Hard rules:
never invent content (use CONTENT_NEEDED.md); Layer 1 stays
restrained; all content renders from /content; three standard
motions only; check acceptance criteria for the current phase
before calling anything done.
```
