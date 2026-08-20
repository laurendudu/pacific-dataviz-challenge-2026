import { useScrollProgress } from '../../hooks/useScrollProgress'

/**
 * A pinned scene. The section is `pages` viewports tall; the inner panel
 * sticks to the viewport while you scroll through it, and `children` receives
 * progress 0 → 1 to drive whatever should move.
 */
export function Scene({ id, pages = 3, smooth = 0.055, children }) {
  const [ref, progress] = useScrollProgress({ smooth })

  return (
    <section className="scene" id={id} ref={ref} style={{ height: `${pages * 100}svh` }}>
      <div className="scene__pin">{children(progress)}</div>
    </section>
  )
}
