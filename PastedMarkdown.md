# Atlas Phase 1 --- Behavior-Driven Portfolio Build Prompt

Paste this whole document as your initial prompt.

Sections marked `[FILL IN]` require real content. Do **not** invent bio
copy, project descriptions, screenshots, or contact information.

---

# 1. What you're building

A personal portfolio for **Yarish Khan** (AI Engineer • Researcher •
Builder).

The project has two equally important layers.

## Layer 1 --- Professional Portfolio

This portfolio must stand completely on its own.

A recruiter should immediately understand:

- Who I am
- What I build
- My projects
- My experience
- My resume
- How to contact me

If every animated element disappeared, this should still feel like a
premium editorial portfolio.

---

## Layer 2 --- Behavior Driven Interface

This is **not** an animated website.

It is a behavior-driven interface.

Nothing moves simply because animation looks nice.

Every movement exists because something caused it.

The homepage behaves like a tiny interactive world.

The visitor exists inside that world.

The UI components are the environment.

The moving character is one inhabitant of that environment.

The illusion of life comes from consistent behavioral rules, not flashy
animations.

Phase 1 focuses entirely on this behavior system.

Do **not** reference any future hidden experiences or Atlas worlds.

---

# 2. Current Phase

The visual portfolio is largely complete.

Do **not** redesign the website.

The current objective is to build the interaction architecture.

The first milestone is **not** the final cat.

The first milestone is a placeholder Entity (a simple circle) that
behaves convincingly.

Once the behavior engine feels alive, the placeholder will later be
replaced with an animated cat.

Behavior first.

Character second.

Artwork last.

---

# 3. Core Philosophy

Every animation must answer one question:

> What caused this?

Good:

Cursor enters

↓

Entity notices

↓

Entity decides

↓

Entity moves

↓

UI reacts

Bad:

Hover

↓

Button animates

Nothing should animate because "it looks cool."

Every motion must have a behavioral cause.

---

# 4. Architecture

Separate the system into four independent layers.

World

↓

Behavior

↓

Movement

↓

Rendering

Each layer has one responsibility.

## World

The homepage itself is the world.

Interactive objects include:

- Hero
- Resume Button
- Email Button
- Navigation
- Stack Icons
- Featured Project Cards
- About Section
- Contact Section

Every object owns:

- Position
- Interaction Zone
- Behavioral Events
- Visual Reactions

---

## Behavior

The moving character behaves using explicit rules.

Example flow:

Sleeping

↓

Notice Cursor

↓

Become Curious

↓

Walk To Target

↓

Observe

↓

Lose Interest

↓

Return Home

Every reaction should include:

- Delay
- Decision
- Movement
- Settle

Never react instantly.

---

## Movement

Movement should feel physical.

Never move at constant speed.

Movement sequence:

Accelerate

↓

Cruise

↓

Slow Down

↓

Small Settle

↓

Idle

Movement logic must remain independent from rendering.

---

## Rendering

Rendering is simply the visual representation.

Current renderer:

Placeholder Circle

Future renderer:

Animated Cat

Behavior code must never depend on the artwork.

---

# 5. Entity System

Treat the moving character as a generic Entity.

Do not hardcode "cat" behavior into the engine.

The Entity owns:

- Position
- Home
- Target
- Current State
- Direction
- Speed
- Curiosity
- Idle Timer

The renderer should later be replaceable without changing behavior
logic.

---

# 6. Homepage Interaction Zones

## Hero

This is Home.

Idle behaviors:

- Rest
- Sleep
- Watch Cursor
- Stretch

The Entity always returns here after interactions.

---

## Navigation

The Entity never blocks navigation.

It may briefly acknowledge hovered navigation items by looking toward
them.

---

## Hero Buttons

Hover Resume or Email.

Possible behavior:

- Become Curious
- Walk Toward Button
- Observe
- Return Home

---

## Tech Stack

The Entity may inspect icons.

Icons react because of the Entity.

The Entity should never react because icons animated first.

---

## Featured Projects

The Entity may walk across project cards.

Cards subtly react to the Entity's presence.

Movement should feel like physical weight interacting with objects.

---

## About

Very calm.

Mostly resting behavior.

Minimal interaction.

---

## Contact

If the visitor remains here for a while, the Entity eventually joins
them and rests nearby.

---

# 7. Behavior Rules

The Entity should feel alive through timing.

Examples:

- Wait before reacting.
- Occasionally ignore the cursor.
- Lose interest naturally.
- Pause before changing direction.
- Never teleport.
- Always return Home eventually.

The goal is believable behavior, not constant activity.

---

# 8. Technology

- React + Vite
- TypeScript
- Framer Motion (UI transitions)
- Rive (future animated cat)
- Hand-rolled behavior engine
- Typed event system

The behavior engine must remain independent from rendering.

---

# 9. Accessibility

- Entity layer must use `pointer-events: none`.
- Entity must never block UI interaction.
- Respect `prefers-reduced-motion`.
- Pause update loop when page is hidden.
- Resume gracefully when visible again.

---

# 10. Definition of Done

Success is **not** a realistic cat.

Success is a simple placeholder Entity that convinces the visitor
something on the page is making decisions.

If a plain circle already feels alive, replacing it with a cat should
require changing only the renderer.

The goal is not to animate a cat.

The goal is to build a reusable behavior engine that creates the
illusion of life.
