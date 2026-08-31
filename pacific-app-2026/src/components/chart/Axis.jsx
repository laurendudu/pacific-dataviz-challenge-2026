/**
 * Axes built by hand from scale.ticks(): d3-axis is banned in this project
 * (it renders via d3-selection). D3 supplies the tick VALUES and the scale
 * function; React draws every line and label.
 */

/**
 * `ticks` overrides the values entirely. A log scale spanning only two or three
 * decades ignores its tick count and returns every minor tick, so callers that
 * need a thinner set have to supply it.
 */
export function AxisBottom({ scale, y, ticks: fixedTicks, tickCount = 5, tickFormat = String, label }) {
  const ticks = fixedTicks ?? getTicks(scale, tickCount)
  const [x0, x1] = rangeExtent(scale)

  return (
    <g className="axis" transform={`translate(0,${y})`}>
      <line className="axis__domain" x1={x0} x2={x1} y1={0} y2={0} />
      {ticks.map((t) => (
        <g key={String(t)} transform={`translate(${scale(t)},0)`}>
          <line className="axis__tick-line" y1={0} y2={6} />
          <text className="axis__label" y={20} textAnchor="middle">
            {tickFormat(t)}
          </text>
        </g>
      ))}
      {label ? (
        <text className="axis__title" x={x1} y={42} textAnchor="end">
          {label}
        </text>
      ) : null}
    </g>
  )
}

export function AxisLeft({ scale, width, tickCount = 5, tickFormat = String, label, grid = true }) {
  const ticks = getTicks(scale, tickCount)

  return (
    <g className="axis">
      {ticks.map((t) => (
        <g key={String(t)} transform={`translate(0,${scale(t)})`}>
          {grid ? <line className="axis__grid-line" x1={0} x2={width} /> : null}
          <text className="axis__label" x={-10} dy="0.32em" textAnchor="end">
            {tickFormat(t)}
          </text>
        </g>
      ))}
      {label ? (
        <text className="axis__title" x={0} y={-12} textAnchor="start">
          {label}
        </text>
      ) : null}
    </g>
  )
}

/** Band scales have no .ticks(); use their domain instead. */
function getTicks(scale, count) {
  return typeof scale.ticks === 'function' ? scale.ticks(count) : scale.domain()
}

function rangeExtent(scale) {
  const r = scale.range()
  return [r[0], r[r.length - 1]]
}
