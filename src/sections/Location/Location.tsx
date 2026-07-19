import { lazy, Suspense } from 'react'
import { Section, Stack } from '../../components/layout'
import { useInView } from '../../lib/useInView'
import type { GlobeMarker } from '../../components/Globe'
import styles from './Location.module.css'

const Globe = lazy(() =>
  import('../../components/Globe').then((module) => ({ default: module.Globe })),
)

const markers: GlobeMarker[] = [{ id: 'mine', location: [28.7041, 77.1025], size: 0.07 }]

export function Location() {
  const { ref, inView } = useInView<HTMLDivElement>({ rootMargin: '200px' })

  return (
    <Section id="location" bordered aria-label="Where in the world">
      <div className={styles.grid}>
        <Stack gap={6}>
          <h2 className={styles.heading}>Where in the world?</h2>

          <Stack gap={3}>
            <Stack direction="row" align="start" gap={3}>
              <span className={styles.dot} aria-hidden="true" />
              <div className={styles.labelGroup}>
                <span className={styles.label}>I am here</span>
                <span className={styles.value}>Delhi, India</span>
              </div>
            </Stack>
          </Stack>
        </Stack>

        <div className={styles.globeSlot} ref={ref}>
          {inView && (
            <Suspense fallback={null}>
              <Globe markers={markers} />
            </Suspense>
          )}
        </div>
      </div>
    </Section>
  )
}
