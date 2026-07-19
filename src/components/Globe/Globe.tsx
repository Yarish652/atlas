import { useEffect, useRef, type CSSProperties } from 'react'
import createGlobe from 'cobe'
import { useMediaQuery } from '../../lib/useMediaQuery'
import styles from './Globe.module.css'

export type GlobeMarker = {
  id: string
  location: [number, number]
  size: number
}

type GlobeProps = {
  markers: GlobeMarker[]
}

const BASE_COLOR: [number, number, number] = [0.78, 0.76, 0.71]
const MARKER_COLOR: [number, number, number] = [0.204, 0.251, 0.42]
const GLOW_COLOR: [number, number, number] = [0.965, 0.957, 0.937]

export function Globe({ markers }: GlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  useEffect(() => {
    const canvas = canvasRef.current
    const wrapper = wrapperRef.current
    if (!canvas || !wrapper) return

    let phi = 0
    let pointerInteracting: number | null = null
    let pointerInteractionMovement = 0
    let width = wrapper.offsetWidth

    const onResize = () => {
      width = wrapper.offsetWidth
    }
    const resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(wrapper)

    const globe = createGlobe(canvas, {
      devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.3,
      dark: 0,
      diffuse: 1.2,
      mapSamples: 14000,
      mapBrightness: 5,
      baseColor: BASE_COLOR,
      markerColor: MARKER_COLOR,
      glowColor: GLOW_COLOR,
      markers,
    })

    let animationFrame: number

    const renderFrame = () => {
      if (!document.hidden) {
        if (!prefersReducedMotion && pointerInteracting === null) {
          phi += 0.003
        }
        globe.update({
          phi: phi + pointerInteractionMovement,
          width: width * 2,
          height: width * 2,
        })
      }
      animationFrame = requestAnimationFrame(renderFrame)
    }
    animationFrame = requestAnimationFrame(renderFrame)

    const updatePointerInteraction = (value: number | null) => {
      pointerInteracting = value
      canvas.style.cursor = value !== null ? 'grabbing' : 'grab'
    }

    const updateMovement = (clientX: number) => {
      if (pointerInteracting === null) return
      const delta = clientX - pointerInteracting
      pointerInteractionMovement += delta / 200
      pointerInteracting = clientX
    }

    const onPointerDown = (e: PointerEvent) => {
      updatePointerInteraction(e.clientX)
    }
    const onPointerUp = () => updatePointerInteraction(null)
    const onPointerOut = () => updatePointerInteraction(null)
    const onPointerMove = (e: PointerEvent) => updateMovement(e.clientX)

    canvas.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointerout', onPointerOut)
    canvas.addEventListener('pointermove', onPointerMove)

    return () => {
      cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointerout', onPointerOut)
      canvas.removeEventListener('pointermove', onPointerMove)
      globe.destroy()
    }
  }, [markers, prefersReducedMotion])

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />

      {/*
        Pin probes. Each one tracks a marker's live projected screen position
        via cobe's CSS anchor positioning (--cobe-{id}), so anything needing
        to locate a pin — a label, a tooltip — can bind to it rather than
        recomputing the projection.
      */}
      {markers.map((marker) => (
        <span
          key={marker.id}
          className={styles.pinAnchor}
          style={{ positionAnchor: `--cobe-${marker.id}` } as CSSProperties}
          data-globe-pin={marker.id}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}
