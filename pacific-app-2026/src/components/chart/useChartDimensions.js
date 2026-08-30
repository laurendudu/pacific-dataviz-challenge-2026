import { useState, useRef, useEffect, useMemo } from 'react'

const DEFAULT_MARGIN = { top: 24, right: 24, bottom: 40, left: 56 }

/**
 * Measures the wrapper element and derives the inner drawing box.
 * React owns the DOM; this only reads size, it never draws.
 *
 * const [ref, dms] = useChartDimensions({ left: 80 })
 * <div ref={ref}><svg width={dms.width} height={dms.height}>
 *   <g transform={`translate(${dms.margin.left},${dms.margin.top})`}> … </g>
 * </svg></div>
 */
export function useChartDimensions(margin) {
  const ref = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const apply = (width, height) => {
      if (!width || !height) return
      setSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height },
      )
    }

    const observer = new ResizeObserver(([entry]) => {
      apply(entry.contentRect.width, entry.contentRect.height)
    })
    observer.observe(el)

    /* First paint can miss the observer callback under sticky / contain;
       measure once synchronously so the globe never sticks at 0×0. */
    const rect = el.getBoundingClientRect()
    apply(rect.width, rect.height)

    return () => observer.disconnect()
  }, [])

  const dimensions = useMemo(() => {
    const m = { ...DEFAULT_MARGIN, ...margin }
    return {
      ...size,
      margin: m,
      boundedWidth: Math.max(0, size.width - m.left - m.right),
      boundedHeight: Math.max(0, size.height - m.top - m.bottom),
    }
  }, [size, margin])

  return [ref, dimensions]
}
