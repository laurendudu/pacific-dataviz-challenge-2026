import { memo, useRef, useEffect } from 'react'
import Globe from 'react-globe.gl'

/**
 * Photoreal Earth for the opening leg — a globe.gl sphere with NASA imagery
 * and a topography bump map. It carries no data layers.
 *
 * Camera motion is driven from refs on a dedicated rAF loop so the parent
 * can re-render the SVG diagram without reconciling this WebGL tree. Idle
 * spin also lives here: it writes into `spinRef` and never setStates.
 *
 * globe.gl uses a perspective camera; the SVG overlay uses d3's
 * orthographic projection. A narrow FOV at long distance is near-ortho,
 * so the two stay registered through the crossfade.
 */
const NEAR_ORTHO_FOV = 6
const SPIN_DEG_PER_MS = 0.004 // ≈ one turn / 90s

function altitudeForRadius(radius, height) {
  const target = radius / (height / 2)
  const half = Math.tan((NEAR_ORTHO_FOV / 2) * (Math.PI / 180))
  const sin = Math.sin(Math.atan(target * half))
  return sin > 0 ? 1 / sin - 1 : 10
}

export const EarthGL = memo(function EarthGL({
  width,
  height,
  viewRef,
  spinRef,
  spinningRef,
  opacityRef,
}) {
  const globeRef = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => {
    const globe = globeRef.current
    if (!globe) return

    const camera = globe.camera()
    camera.fov = NEAR_ORTHO_FOV
    camera.updateProjectionMatrix()

    const controls = globe.controls()
    controls.enabled = false
    controls.autoRotate = false

    globe.renderer().setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 1.75))
  }, [width, height])

  useEffect(() => {
    if (!width || !height) return

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let last = performance.now()
    let frame = 0

    const tick = (now) => {
      const dt = Math.min(now - last, 48)
      last = now

      const spinning = spinningRef.current && !reduceMotion
      if (spinning) spinRef.current += dt * SPIN_DEG_PER_MS

      const globe = globeRef.current
      const { lon, radius } = viewRef.current
      const useLon = spinning ? spinRef.current : lon

      if (globe && radius > 0) {
        globe.pointOfView(
          { lat: 0, lng: -useLon, altitude: altitudeForRadius(radius, height) },
          0,
        )
      }

      if (wrapRef.current) wrapRef.current.style.opacity = String(opacityRef.current)

      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [width, height, viewRef, spinRef, spinningRef, opacityRef])

  if (!width || !height) return null

  return (
    <div ref={wrapRef} className="globe__earth" aria-hidden="true">
      <Globe
        ref={globeRef}
        width={width}
        height={height}
        backgroundColor="rgba(0,0,0,0)"
        globeImageUrl="/textures/earth-4096.jpg"
        bumpImageUrl="/textures/earth-topology.png"
        showAtmosphere={false}
        animateIn={false}
        enablePointerInteraction={false}
        rendererConfig={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
      />
    </div>
  )
})
