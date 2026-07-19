import { Section, Stack } from '../../components/layout'
import { Button, GitHubIcon, LinkedInIcon } from '../../components/ui'
import styles from './Contact.module.css'

const EMAIL = 'kyarish5@gmail.com'
const GITHUB_URL = 'https://github.com/Yarish652'
const LINKEDIN_URL = 'https://www.linkedin.com/in/yarish-khan-161340257/'

export function Contact() {
  return (
    <Section id="contact" bordered aria-label="Contact">
      <Stack gap={7} className={styles.content}>
        <h2 className={styles.heading}>Let's build something great.</h2>

        <Stack gap={4}>
          <a href={`mailto:${EMAIL}`} className={styles.email}>
            {EMAIL}
          </a>
          <Stack direction="row" gap={3}>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub profile"
              className={styles.iconLink}
            >
              <GitHubIcon />
            </a>
            <a
              href={LINKEDIN_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn profile"
              className={styles.iconLink}
            >
              <LinkedInIcon />
            </a>
          </Stack>
        </Stack>

        <Stack direction="row" gap={4} wrap>
          <Button href={`mailto:${EMAIL}`} variant="primary">
            Email me
          </Button>
          <Button href="/resume.pdf" variant="secondary">
            Resume
          </Button>
        </Stack>
      </Stack>
    </Section>
  )
}
