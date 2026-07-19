import type { ReactNode } from 'react'
import { Section, Grid, Stack } from '../../components/layout'
import styles from './TechStack.module.css'

/*
 * The real stack: MERN + the Python AI side (FastAPI, PyTorch,
 * scikit-learn). Marks are hand-drawn one-tone line art in small orbs;
 * anything that can't be drawn tastefully in one tone gets a typographic
 * mark instead (ex). Tooltips reflect actual use, per the CV.
 */
type Tech = {
  name: string
  /** One line: what I actually use it for. Shown as the hover tooltip. */
  tip: string
  mark: ReactNode
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

const TECHS: Tech[] = [
  {
    name: 'Python',
    tip: 'AI pipelines — speech analysis and RAG',
    mark: (
      <svg viewBox="0 0 28 28" {...stroke} aria-hidden="true">
        <path d="M14 4.2c-3.4 0-4.4 1.5-4.4 3.2v2.2h4.6v1H6.7c-1.9 0-2.5 1.8-2.5 3.4s.6 3.4 2.5 3.4h2.9v-2.3c0-1.8 1.5-3 3.3-3" />
        <path d="M14 23.8c3.4 0 4.4-1.5 4.4-3.2v-2.2h-4.6v-1h7.5c1.9 0 2.5-1.8 2.5-3.4s-.6-3.4-2.5-3.4h-2.9v2.3c0 1.8-1.5 3-3.3 3" />
        <circle cx="11.7" cy="6.6" r="0.9" fill="currentColor" stroke="none" />
        <circle cx="16.3" cy="21.4" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: 'PyTorch',
    tip: 'speech models — Whisper, Wav2Vec2',
    mark: (
      <svg viewBox="0 0 28 28" {...stroke} aria-hidden="true">
        <path d="M9.6 10.6a6.2 6.2 0 1 0 8.8 0L14 6.2" />
        <circle cx="17.3" cy="7.6" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: 'scikit-learn',
    tip: 'classical ML and evaluation baselines',
    mark: (
      <svg viewBox="0 0 28 28" {...stroke} aria-hidden="true">
        <path d="M12.6 10.4c0-1.5-1.3-2.4-3-2.4-1.9 0-3.1 1-3.1 2.3 0 3.1 6.3 1.6 6.3 4.9 0 1.5-1.4 2.5-3.3 2.5-1.9 0-3.1-1-3.1-2.4" />
        <path d="M17.5 6.5V21M17.5 14.6l5.2-5.2M17.5 14.6l5.7 6.4" />
      </svg>
    ),
  },
  {
    name: 'FastAPI',
    tip: 'the pronunciation-assessment API',
    mark: (
      <svg viewBox="0 0 28 28" {...stroke} aria-hidden="true">
        <circle cx="14" cy="14" r="9.6" />
        <path d="M15.6 8.2l-5 6.4h4l-2.2 5.2 5.2-6.6h-4z" />
      </svg>
    ),
  },
  {
    name: 'React',
    tip: 'frontends — Speakzy and this site',
    mark: (
      <svg viewBox="0 0 28 28" {...stroke} aria-hidden="true">
        <ellipse cx="14" cy="14" rx="10" ry="4" />
        <ellipse cx="14" cy="14" rx="10" ry="4" transform="rotate(60 14 14)" />
        <ellipse cx="14" cy="14" rx="10" ry="4" transform="rotate(120 14 14)" />
        <circle cx="14" cy="14" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: 'Node.js',
    tip: "Speakzy's backend runtime",
    mark: (
      <svg viewBox="0 0 28 28" {...stroke} aria-hidden="true">
        <path d="M14 3.5l9 5.2v10.6l-9 5.2-9-5.2V8.7z" />
        <path d="M14 3.5V14m0 0l9-5.2M14 14l-9-5.2" opacity="0.45" />
      </svg>
    ),
  },
  {
    name: 'Express',
    tip: 'REST APIs with JWT auth',
    mark: (
      <svg viewBox="0 0 28 28" {...stroke} aria-hidden="true">
        <path d="M4.5 14h9M13.5 14c0-3.6-2-6.2-4.6-6.2S4.5 10.4 4.5 14s1.9 6.2 4.4 6.2c1.8 0 3.3-1.1 4.1-2.9" />
        <path d="M17 8.5l6.5 11M23.5 8.5L17 19.5" />
      </svg>
    ),
  },
  {
    name: 'MongoDB',
    tip: "Speakzy's data layer on Atlas",
    mark: (
      <svg viewBox="0 0 28 28" {...stroke} aria-hidden="true">
        <path d="M14 3.8c4.2 4.6 6 8 6 11.4 0 4.4-2.7 7.4-6 8.6-3.3-1.2-6-4.2-6-8.6 0-3.4 1.8-6.8 6-11.4z" />
        <path d="M14 6.5v17.7" opacity="0.45" />
      </svg>
    ),
  },
]

export function TechStack() {
  return (
    <Section id="stack" bordered aria-label="Technologies">
      <Stack gap={6}>
        <h2 className={styles.heading}>My stack</h2>

        <Grid columns={{ base: 4, md: 4, lg: 8 }} gap={5}>
          {TECHS.map((tech) => (
            <div key={tech.name} className={styles.item} tabIndex={0} data-tip={tech.tip}>
              <div className={styles.orb}>{tech.mark}</div>
              <span className={styles.label}>{tech.name}</span>
              <span className="sr-only">{tech.tip}</span>
            </div>
          ))}
        </Grid>
      </Stack>
    </Section>
  )
}
