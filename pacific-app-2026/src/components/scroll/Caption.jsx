import { slice, easeOut } from '../../hooks/useScrollProgress'

/**
 * One line of scene text that fades up, holds, then fades out — its window
 * within the scene's progress is [from, to]. Overlapping captions crossfade.
 */
export function Caption({ progress, from, to, kicker, children }) {
  const fade = 0.12 * (to - from)
  const inOpacity = slice(progress, from, from + fade)
  const outOpacity = 1 - slice(progress, to - fade, to)
  const opacity = Math.min(inOpacity, outOpacity)
  const y = (1 - easeOut(inOpacity)) * 28

  return (
    <div
      className="caption"
      style={{ opacity, transform: `translate3d(0, ${y}px, 0)`, pointerEvents: opacity > 0.5 ? 'auto' : 'none' }}
      aria-hidden={opacity < 0.5}
    >
      {kicker ? <p className="caption__kicker">{kicker}</p> : null}
      <p className="caption__body">{children}</p>
    </div>
  )
}
