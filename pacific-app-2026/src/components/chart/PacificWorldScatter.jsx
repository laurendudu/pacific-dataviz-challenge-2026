import { useMemo } from 'react'
import { extent, max } from 'd3-array'
import { Delaunay } from 'd3-delaunay'
import { format } from 'd3-format'
import { scaleLog } from 'd3-scale'
import { asrOf } from '../../data/scatter'
import { AxisBottom, AxisLeft } from './Axis'
import { ChartFrame } from './ChartFrame'

const MARGIN = { top: 12, right: 12, bottom: 44, left: 40 }
const WORLD_R = 3.2
const PACIFIC_R = 5
const HIT_R = 28

const formatGdp = format('$.2~s')
const formatAsr = format('.2~f')

const WORLD_FILL = '#a8b2b8'
const PACIFIC_FILL = 'var(--pacific)'

/**
 * One GDP × ASR scatter. D3 builds scales, ticks and the hit index;
 * React draws the SVG. Pacific dots sit on top of the world cloud.
 */
export function PacificWorldScatter({
  countries,
  methodId,
  xDomain,
  yDomain,
  hoveredIso,
  onHover,
}) {
  const points = useMemo(
    () => countries.filter((c) => Number.isFinite(c.gdp) && asrOf(c, methodId) != null),
    [countries, methodId],
  )

  return (
    <ChartFrame
      margin={MARGIN}
      title={`GDP per capita against ${methodId} Absolute Sustainability Ratio`}
      desc="Each circle is a country. Pacific territories are the larger teal marks."
    >
      {(dms) => (
        <ScatterMarks
          points={points}
          methodId={methodId}
          xDomain={xDomain}
          yDomain={yDomain}
          hoveredIso={hoveredIso}
          onHover={onHover}
          width={dms.boundedWidth}
          height={dms.boundedHeight}
        />
      )}
    </ChartFrame>
  )
}

function ScatterMarks({
  points,
  methodId,
  xDomain,
  yDomain,
  hoveredIso,
  onHover,
  width,
  height,
}) {
  const x = useMemo(
    () => scaleLog().domain(xDomain).range([0, width]).clamp(true),
    [xDomain, width],
  )
  const y = useMemo(
    () => scaleLog().domain(yDomain).range([height, 0]).clamp(true),
    [yDomain, height],
  )

  const placed = useMemo(
    () => points.map((c) => ({
      ...c,
      value: asrOf(c, methodId),
      cx: x(c.gdp),
      cy: y(asrOf(c, methodId)),
    })),
    [points, methodId, x, y],
  )

  const world = placed.filter((c) => !c.pacific)
  const pacific = placed.filter((c) => c.pacific)
  const hovered = placed.find((c) => c.iso === hoveredIso) ?? null

  const delaunay = useMemo(
    () => (placed.length ? Delaunay.from(placed, (d) => d.cx, (d) => d.cy) : null),
    [placed],
  )

  const fairY = y(1)

  const onMove = (event) => {
    if (!delaunay || !onHover) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const mx = event.clientX - bounds.left
    const my = event.clientY - bounds.top
    const i = delaunay.find(mx, my)
    const hit = placed[i]
    if (!hit) {
      onHover(null)
      return
    }
    const dist = Math.hypot(hit.cx - mx, hit.cy - my)
    onHover(dist <= HIT_R ? hit : null)
  }

  return (
    <g className="scatter-marks">
      <AxisLeft
        scale={y}
        width={width}
        tickCount={4}
        tickFormat={formatAsr}
        label="ASR"
      />
      <AxisBottom
        scale={x}
        y={height}
        tickCount={4}
        tickFormat={formatGdp}
        label="GDP per capita"
      />

      {fairY >= 0 && fairY <= height ? (
        <g className="scatter-marks__fair" pointerEvents="none">
          <line x1={0} x2={width} y1={fairY} y2={fairY} />
          <text x={width} y={fairY - 5} textAnchor="end">ASR = 1</text>
        </g>
      ) : null}

      <g className="scatter-marks__world">
        {world.map((c) => (
          <circle
            key={c.iso}
            className={`scatter-dot scatter-dot--world${c.iso === hoveredIso ? ' is-hovered' : ''}`}
            cx={c.cx}
            cy={c.cy}
            r={WORLD_R}
            fill={WORLD_FILL}
          />
        ))}
      </g>
      <g className="scatter-marks__pacific">
        {pacific.map((c) => (
          <circle
            key={c.iso}
            className={`scatter-dot scatter-dot--pacific${c.iso === hoveredIso ? ' is-hovered' : ''}`}
            cx={c.cx}
            cy={c.cy}
            r={PACIFIC_R}
            fill={PACIFIC_FILL}
          />
        ))}
      </g>

      {hovered ? (
        <circle
          className="scatter-dot__halo"
          cx={hovered.cx}
          cy={hovered.cy}
          r={(hovered.pacific ? PACIFIC_R : WORLD_R) + 3.5}
        />
      ) : null}

      <rect
        className="scatter-marks__hit"
        width={width}
        height={height}
        fill="transparent"
        onPointerMove={onMove}
        onPointerLeave={() => onHover?.(null)}
      />
    </g>
  )
}

export function scatterDomains(countries) {
  const gdps = countries.map((c) => c.gdp).filter(Number.isFinite)
  const asrs = countries.flatMap((c) => (
    Object.values(c.asr).filter((v) => Number.isFinite(v))
  ))
  const [x0, x1] = extent(gdps)
  return {
    xDomain: [Math.max(400, x0 * 0.85), x1 * 1.1],
    yDomain: [0.08, max(asrs) * 1.15],
  }
}

export { formatGdp, formatAsr }
