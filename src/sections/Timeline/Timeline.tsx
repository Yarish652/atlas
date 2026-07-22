import { Section, Stack } from '../../components/layout'
import styles from './Timeline.module.css'

const chapters = [
  {
    chapter: 'Chapter 1',
    title: 'Finding Direction',
    description: 'Started engineering and spent time exploring what genuinely interested me.',
  },
  {
    chapter: 'Chapter 2',
    title: 'Learning the Fundamentals',
    description: 'Focused on DSA, algorithms, and computer science.',
  },
  {
    chapter: 'Chapter 3',
    title: 'Building the Web',
    description: 'Learned frontend, built my first blog, then expanded into backend development.',
  },
  {
    chapter: 'Chapter 4',
    title: 'The AI Shift',
    description: 'Discovered LLMs, RAG, embeddings, and started building AI-powered products.',
  },
  {
    chapter: 'Chapter 5',
    title: 'Today',
    description:
      'Building Atlas, Speakzy, and exploring human-computer interaction and intelligent systems.',
  },
]

export function Timeline() {
  return (
    <Section id="timeline" bordered aria-label="Journey so far">
      <Stack gap={6}>
        <h2 className={styles.heading}>Journey so far</h2>

        <ol className={styles.track}>
          {chapters.map((c) => (
            <li key={c.chapter} className={styles.milestone}>
              <span className={styles.chapter}>{c.chapter}</span>
              <h3 className={styles.title}>{c.title}</h3>
              <p className={styles.description}>{c.description}</p>
            </li>
          ))}
        </ol>
      </Stack>
    </Section>
  )
}