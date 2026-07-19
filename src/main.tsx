import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/fonts.css'
import './styles/tokens.css'
import './styles/global.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// This is the only place allowed to know both the page and the entity.
// Sections stay ignorant.
//
// Loaded lazily after first paint so the entity never competes with the hero
// for LCP. Arriving a moment late is in character.
{
  const start = () => {
    void import('./entity').then(({ mountEntity, DRIVE_PARAMS }) => {
      const entity = mountEntity()
      if (import.meta.env.DEV) {
        const w = window as unknown as {
          __atlasEntity: typeof entity
          __atlasParams: typeof DRIVE_PARAMS
        }
        w.__atlasEntity = entity
        // The temperament, live: mutate any value in the console and the
        // behaviour re-tunes on the next tick. e.g.
        //   __atlasParams.COMFORT.SLEEP_AT = 60
        w.__atlasParams = DRIVE_PARAMS
      }
    })
  }
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 2000 })
  else setTimeout(start, 200)
}
