import { slice, easeOut } from '../../hooks/useScrollProgress'

/**
 * Source line for a scene. Sits in the bottom-right of the sticky viewport.
 * Always visible unless `progress`, `from`, and `to` are all passed, in
 * which case it fades in and out like a caption.
 */
export function Footnote({ progress, from, to, children }) {
  const gated = progress != null && from != null && to != null
  let opacity = 1
  let y = 0

  if (gated) {
    const fade = Math.min(0.04, 0.12 * (to - from))
    const inOpacity = slice(progress, from, from + fade)
    const outOpacity = 1 - slice(progress, to - fade, to)
    opacity = Math.min(inOpacity, outOpacity)
    y = (1 - easeOut(inOpacity)) * 10
  }

  if (opacity <= 0.001) return null

  return (
    <p
      className="footnote"
      style={{ opacity, transform: `translate3d(0, ${y}px, 0)` }}
      aria-hidden={opacity < 0.5}
    >
      {children}
    </p>
  )
}
