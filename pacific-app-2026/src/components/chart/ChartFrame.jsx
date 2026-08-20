import { useChartDimensions } from './useChartDimensions'

/**
 * Sizing shell for every chart. Measures its box, then hands the bounded
 * drawing area to `children` as a render prop. Children return JSX only.
 */
export function ChartFrame({ margin, title, desc, children }) {
  const [ref, dms] = useChartDimensions(margin)
  const ready = dms.boundedWidth > 0 && dms.boundedHeight > 0

  return (
    <div ref={ref} style={{ width: '100%', height: '100%' }}>
      <svg width={dms.width} height={dms.height} role="img" aria-label={title}>
        {title ? <title>{title}</title> : null}
        {desc ? <desc>{desc}</desc> : null}
        <g transform={`translate(${dms.margin.left},${dms.margin.top})`}>
          {ready ? children(dms) : null}
        </g>
      </svg>
    </div>
  )
}
