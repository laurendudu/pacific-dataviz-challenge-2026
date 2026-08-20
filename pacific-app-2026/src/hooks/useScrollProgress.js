import { useState, useRef, useEffect } from 'react'

/**
 * Returns [ref, progress] where progress runs 0 → 1 as the element travels
 * through the viewport — the engine behind every scroll-driven transition.
 *
 * The value is *damped*: each frame it eases a fraction of the way toward
 * the true scroll position rather than snapping to it. That lag is what
 * makes the motion feel like an Apple product page instead of a scrollbar
 * puppet. Lower `smooth` = heavier, more floaty; 1 = rigid, no damping.
 *
 * The loop only runs while catching up. Once it meets the target it sleeps
 * until the next scroll or resize, so a still page costs nothing.
 */
export function useScrollProgress({ smooth = 0.09 } = {}) {
  const ref = useRef(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const rigid =
      smooth >= 1 ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    /* Progress through a PINNED section: 0 the moment its top reaches the
       top of the viewport, 1 when its bottom does. For a scene that starts at
       the top of the page this reads exactly 0 before the first scroll, which
       is what lets an idle animation own the opening frame. */
    const target = () => {
      const rect = el.getBoundingClientRect()
      const travel = rect.height - window.innerHeight
      if (travel <= 0) return 0
      return clamp(-rect.top / travel, 0, 1)
    }

    let current = target()
    let frame = 0
    let running = false

    const loop = () => {
      const to = target()
      current = rigid ? to : current + (to - current) * smooth
      const settled = Math.abs(to - current) < 0.0002
      if (settled) current = to

      setProgress((prev) => (prev === current ? prev : current))

      if (settled) {
        running = false
        frame = 0
        return
      }
      frame = requestAnimationFrame(loop)
    }

    const kick = () => {
      if (running) return
      running = true
      frame = requestAnimationFrame(loop)
    }

    window.addEventListener('scroll', kick, { passive: true })
    window.addEventListener('resize', kick)
    kick()

    return () => {
      window.removeEventListener('scroll', kick)
      window.removeEventListener('resize', kick)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [smooth])

  return [ref, progress]
}

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

/** Remap a slice of progress onto 0→1. slice(p, 0.2, 0.5) → 0 below 20%, 1 at 50%. */
export const slice = (p, start, end) => clamp((p - start) / (end - start), 0, 1)

/** Decelerate into place. */
export const easeOut = (t) => 1 - Math.pow(1 - t, 3)

/** Ease in and out — the Apple curve for a move that starts and ends at rest. */
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
