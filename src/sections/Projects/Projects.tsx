import { Section, Stack } from '../../components/layout'
import { ArrowRightIcon } from '../../components/ui'
import { CellField } from './CellField'
import { Pinboard } from './Pinboard'
import styles from './Projects.module.css'

const ALL_PROJECTS_URL = 'https://github.com/Yarish652?tab=repositories'

export function Projects() {
  return (
    <Section id="projects" bordered backdrop={<CellField />}>
      <Stack gap={6}>
        <Stack direction="row" align="center" justify="space-between" wrap gap={5}>
          <h2 className={styles.heading}>Featured projects</h2>
          {/* An obstacle in the cell field: its plate is snapped to whole
              cells, so the grid runs up to its edges and around it. */}
          <a
            href={ALL_PROJECTS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.viewAll}
            data-cell-obstacle=""
          >
            <span className={styles.viewAllLabel}>
              View all projects <ArrowRightIcon width={16} height={16} />
            </span>
          </a>
        </Stack>

        <Pinboard />
      </Stack>
    </Section>
  )
}
