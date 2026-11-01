import { Section, Stack } from '../../components/layout'
import { Button, PinIcon, ClockIcon } from '../../components/ui'
import { useISTClock } from '../../lib/useISTClock'
import styles from './Hero.module.css'

const EMAIL = 'kyarish5@gmail.com'

export function Hero() {
  const time = useISTClock()

  return (
    <Section id="top" reveal={false} aria-label="Introduction">
      <Stack gap={7} className={styles.copy}>
        {/* Eyebrow, name and tagline are one identity block — the eyebrow
            modifies the name, so it binds tighter than it separates. */}
        <Stack gap={5}>
          <p className={styles.eyebrow}>AI Engineer · LLM Systems · Builder</p>

          <Stack gap={4}>
            <h1 className={styles.name}>Yarish Khan</h1>
            <p className={styles.tagline}>Building intelligent software for people.</p>
          </Stack>
        </Stack>

        <Stack direction="row" align="center" gap={5} wrap className={styles.meta}>
          <Stack direction="row" align="center" gap={2}>
            <PinIcon width={16} height={16} />
            <span>Delhi, India</span>
          </Stack>
          <Stack direction="row" align="center" gap={2}>
            <ClockIcon width={16} height={16} />
            <span>
              {time} <span className={styles.metaMuted}>IST</span>
            </span>
          </Stack>
        </Stack>

        <Stack direction="row" gap={4} wrap>
          <Button href="/resume.pdf" variant="primary">
            Resume
          </Button>
          <Button href={`mailto:${EMAIL}`} variant="secondary">
            Email me
          </Button>
        </Stack>
      </Stack>
    </Section>
  )
}
