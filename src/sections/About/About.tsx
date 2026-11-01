import { Section, Stack } from '../../components/layout'
import { StudentAnimation } from './StudentAnimation'
import styles from './About.module.css'

export function About() {
  return (
    <Section id="about" bordered aria-label="About">
      <div className={styles.grid}>
        {/* `data-portrait` marks this as the portrait frame — it describes the
            element, and is here for anything that needs to locate the photo. */}
        <div className={styles.portraitFrame} data-portrait="" aria-hidden="true">
          {/* "College Student" by animatedom, CC BY 4.0 — credited in the
              footer. Its idle is a still pose; "Timeline 1" is its one
              ~5s motion, played on cue. */}
          <StudentAnimation
            src="/about/student.riv"
            motion="Timeline 1"
            replayMs={15_000}
            fallback={
              <video
                className={styles.portraitVideo}
                src="/engineer-and-cat-loop.mp4"
                autoPlay
                loop
                muted
                playsInline
              />
            }
          />
        </div>

        <Stack gap={6} className={styles.copy}>
          <h2 className={styles.heading}>About</h2>

          <Stack gap={5}>
            <p className={styles.paragraphLead}>
              I&rsquo;m an AI engineer who builds with LLMs: retrieval that
              cites its sources, agents that run on your own machine, and
              evals honest enough to say where a model falls short.
              I&rsquo;m most interested in tools that understand people
              instead of making people adapt to technology.
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
