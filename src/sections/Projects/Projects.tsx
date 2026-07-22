import { Section, Grid, Stack } from '../../components/layout'
import { ArrowRightIcon } from '../../components/ui'
import { ProjectCard } from './ProjectCard'
import styles from './Projects.module.css'

const projects = [
  {
    index: '01',
    title: 'AI Pronunciation Assessment',
    description:
      'Explainable speech scoring — deterministic phoneme analysis before LLM coaching, cutting false positives by ~80%.',
    image: '/projects/pronunciation.webp',
    imageAlt: 'AI Pronunciation Assessment — phoneme report scoring a recording 86/100',
    demo: 'https://github.com/Yarish652/SpeechCorrection',
  },
  {
    index: '02',
    title: 'Momentum',
    description:
      'Local-first productivity companion that understands focused work automatically.',
    image: '/projects/momentum.webp',
    imageAlt: 'Momentum — a day of work as a bar chart, deep-work blocks highlighted',
    wip: true,
  },
  {
    index: '03',
    title: 'Speakzy',
    description: 'AI-powered language learning companion with speech feedback.',
    image: '/projects/speakzy.webp',
    imageAlt: 'Speakzy — chat bubbles translating “¿Cómo estás?”, learn & revise with AI',
    demo: 'https://speakzy-9rkd.onrender.com/',
  },
]

export function Projects() {
  return (
    <Section id="projects" bordered>
      <Stack gap={6}>
        <Stack direction="row" align="baseline" justify="space-between" wrap gap={3}>
          <h2 className={styles.heading}>Featured projects</h2>
          <a href="#" className={styles.viewAll}>
            View all projects <ArrowRightIcon width={16} height={16} />
          </a>
        </Stack>

        <Grid columns={{ base: 1, md: 2, lg: 3 }} gap={5}>
          {projects.map((project) => (
            <ProjectCard key={project.title} {...project} />
          ))}
        </Grid>
      </Stack>
    </Section>
  )
}
