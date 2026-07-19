import { Section, Stack } from '../../components/layout'
import styles from './About.module.css'

export function About() {
  return (
    <Section id="about" bordered aria-label="About">
      <div className={styles.grid}>
        {/* `data-portrait` marks this as the portrait frame — it describes the
            element, and is here for anything that needs to locate the photo. */}
        <div className={styles.portraitFrame} data-portrait="" aria-hidden="true">
          <video
            className={styles.portraitVideo}
            src="/engineer-and-cat-loop.mp4"
            autoPlay
            loop
            muted
            playsInline
          />
        </div>

        <Stack gap={6} className={styles.copy}>
          <h2 className={styles.heading}>About</h2>

          <Stack gap={5}>
            <p className={styles.paragraphLead}>
              I build software that feels natural to use, combining AI,
              engineering, and thoughtful design to solve real problems.
              I&rsquo;m most interested in creating tools that understand
              people instead of making people adapt to technology.
            </p>
            <p className={styles.paragraphAside}>
              Outside of coding, I enjoy exploring new places, learning how
              things work, and collecting ideas from books, travel, music, and
              everyday life. Atlas is where those interests come together
              alongside the projects I build.
            </p>
          </Stack>
        </Stack>
      </div>
    </Section>
  )
}
