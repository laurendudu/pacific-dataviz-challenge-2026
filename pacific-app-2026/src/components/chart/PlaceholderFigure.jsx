import { ChartFrame } from './ChartFrame'

/**
 * Structural stand-in while the data pipeline lands. Renders the real
 * ChartFrame so margins and sizing are honest, states which dataset the
 * finished figure needs, and tracks scroll progress so the scene's motion
 * is visible before any chart exists.
 */
export function PlaceholderFigure({ label, dataset, step, progress = 0 }) {
  return (
    <div className="ph">
      <span className="ph__badge">{label} · step {step + 1}</span>
      <ChartFrame title={`${label} (placeholder)`}>
        {({ boundedWidth, boundedHeight }) => (
          <g>
            <rect
              width={boundedWidth}
              height={boundedHeight}
              fill="none"
              stroke="var(--surface-3)"
              strokeDasharray="4 4"
              rx="4"
            />
            <text className="ph__label" x={boundedWidth / 2} y={boundedHeight / 2 - 12} textAnchor="middle">
              awaiting: {dataset}
            </text>
            {/* progress read-out — delete once a real figure lands */}
            <line
              className="axis__grid-line"
              x1={0} x2={boundedWidth}
              y1={boundedHeight - 8} y2={boundedHeight - 8}
            />
            <line
              x1={0} x2={boundedWidth * progress}
              y1={boundedHeight - 8} y2={boundedHeight - 8}
              stroke="var(--series-1)" strokeWidth="2" strokeLinecap="round"
            />
            <circle
              cx={boundedWidth * progress}
              cy={boundedHeight - 8}
              r="4"
              fill="var(--series-1)"
            />
          </g>
        )}
      </ChartFrame>
    </div>
  )
}
