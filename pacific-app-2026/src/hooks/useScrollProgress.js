import { useState, useRef, useEffect } from 'react'

/**
 * Returns [ref, progress] where progress runs 0 → 1 as the element travels
 * through the viewport, the engine behind every scroll-driven transition.
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
  const progressRef = useRef(0)
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
    progressRef.current = current
    let frame = 0
    let lastPublish = 0

    const loop = (now) => {
      const to = target()
      /* Big gaps (programmatic jumps while the main thread was busy) catch up
         faster so the title/photo do not stay stuck on a stale progress. */
      const blend = rigid ? 1 : Math.abs(to - current) > 0.12 ? Math.min(1, smooth * 4) : smooth
      current = current + (to - current) * blend
      const settled = Math.abs(to - current) < 0.0002
      if (settled) current = to
      progressRef.current = current

      /* React only needs ~30fps for SVG/captions. The globe camera reads
         progressRef on its own rAF, so it stays at display refresh. */
      if (settled || now - lastPublish > 32) {
        lastPublish = now
        setProgress((prev) => (prev === current ? prev : current))
      }

      if (settled) {
        frame = 0
        return
      }
      frame = requestAnimationFrame(loop)
    }

    const kick = () => {
      if (frame) return
      frame = requestAnimationFrame(loop)
    }

    /* If scrollTo(0) lands on an already-zero scrollY, no scroll event fires
       and a lagged progressRef would stick. Poll while the tab is visible. */
    let watch = 0
    const watchKick = () => {
      if (Math.abs(target() - progressRef.current) > 0.0005) kick()
      watch = window.setTimeout(watchKick, 160)
    }

    window.addEventListener('scroll', kick, { passive: true })
    window.addEventListener('resize', kick)
    kick()
    watch = window.setTimeout(watchKick, 160)

    return () => {
      window.removeEventListener('scroll', kick)
      window.removeEventListener('resize', kick)
      if (frame) cancelAnimationFrame(frame)
      if (watch) window.clearTimeout(watch)
    }
  }, [smooth])

  return [ref, progress, progressRef]
}

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

/** Discrete beat 0 … beats-1 from a pinned scene's progress 0 → 1. */
export function beatIndex(progress, beats) {
  const n = Math.max(1, beats)
  if (n <= 1) return 0
  return Math.min(n - 1, Math.max(0, Math.round(progress * (n - 1))))
}

/** Remap a slice of progress onto 0→1. slice(p, 0.2, 0.5) → 0 below 20%, 1 at 50%. */
export const slice = (p, start, end) => clamp((p - start) / (end - start), 0, 1)

/** Fraction of a caption window used to fade in, and again to fade out. */
export const BEAT_FADE = 0.14

/** Linear in/out envelope for a caption and anything that must match it. */
export function beatOpacity(progress, from, to) {
  const fade = BEAT_FADE * (to - from)
  return Math.min(
    slice(progress, from, from + fade),
    1 - slice(progress, to - fade, to),
  )
}

/** Decelerate into place. */
export const easeOut = (t) => 1 - Math.pow(1 - t, 3)

/** Ease in and out: the Apple curve for a move that starts and ends at rest. */
export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/** Quintic smootherstep: same rest at both ends, without the cubic rush in the middle. */
export const easeInOutSmooth = (t) => t * t * t * (t * (t * 6 - 15) + 10)
