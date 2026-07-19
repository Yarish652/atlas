import { Section, Stack } from '../../components/layout'
import styles from './Timeline.module.css'

const milestones = [
  { year: '2022', description: 'Started my engineering journey' },
  { year: '2023', description: 'Built and shipped my first products' },
  { year: '2024', description: 'Working on Atlas, research, and building tools' },
  { year: '2025', description: 'Exploring, learning, and building what matters' },
  { year: '2026', description: 'Shape the present' },
]

export function Timeline() {
  return (
    <Section id="timeline" bordered aria-label="Journey so far">
      <Stack gap={6}>
        <h2 className={styles.heading}>Journey so far</h2>

        <ol className={styles.track}>
          {milestones.map((milestone) => (
            <li key={milestone.year} className={styles.milestone}>
              <span className={styles.year}>{milestone.year}</span>
              <span className={styles.description}>{milestone.description}</span>
            </li>
          ))}
        </ol>
      </Stack>
    </Section>
  )
}
