import { useMemo } from 'react'
import { extent, max, min } from 'd3-array'
import { Delaunay } from 'd3-delaunay'
import { scaleLinear, scaleLog } from 'd3-scale'
import { X_VAR_BY_ID, asrOf, formatAsr, xOf } from '../../data/scatter'
import { AxisBottom, AxisLeft } from './Axis'
import { ChartFrame } from './ChartFrame'

const MARGIN = { top: 12, right: 12, bottom: 52, left: 40 }
const WORLD_R = 3.2
const PACIFIC_R = 5
const HIT_R = 28

const WORLD_FILL = '#a8b2b8'
const PACIFIC_FILL = 'var(--pacific)'

const SCALE_BY_ID = { linear: scaleLinear, log: scaleLog }

/**
 * One x × ASR scatter. D3 builds scales, ticks and the hit index; React draws
 * the SVG. Pacific dots sit on top of the world cloud.
 *
 * `xVarId` picks the x axis: 'vuln' for ND-GAIN climate vulnerability, 'gdp'
 * for GDP per capita. The y axis is always the ASR under `methodId`.
 */
export function PacificWorldScatter({
  countries,
  methodId,
  xVarId,
  xDomain,
  yDomain,
  hoveredIso,
  onHover,
}) {
  const xVar = X_VAR_BY_ID[xVarId]

  const points = useMemo(
    () => countries.filter((c) => xOf(c, xVarId) != null && asrOf(c, methodId) != null),
    [countries, xVarId, methodId],
  )

  return (
    <ChartFrame
      margin={MARGIN}
      title={`${xVar.axisLabel} against ${methodId} Absolute Sustainability Ratio`}
      desc="Each circle is a country. Pacific territories are the larger teal marks."
    >
      {(dms) => (
        <ScatterMarks
          points={points}
          methodId={methodId}
          xVar={xVar}
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
  xVar,
  xDomain,
  yDomain,
  hoveredIso,
  onHover,
  width,
  height,
}) {
  const x = useMemo(
    () => SCALE_BY_ID[xVar.scale]().domain(xDomain).range([0, width]).clamp(true),
    [xVar, xDomain, width],
  )
  const y = useMemo(
    () => scaleLog().domain(yDomain).range([height, 0]).clamp(true),
    [yDomain, height],
  )

  /* Powers of ten only. d3's log scale returns its minor ticks whenever the
     domain is narrower than the requested count, which on GDP per capita is
     two dozen labels along a 340px axis. */
  const xTicks = useMemo(() => {
    if (xVar.scale !== 'log') return undefined
    return x.ticks().filter((t) => Number.isInteger(Math.log10(t)))
  }, [xVar, x])

  const placed = useMemo(
    () => points.map((c) => ({
      ...c,
      value: asrOf(c, methodId),
      cx: x(xOf(c, xVar.id)),
      cy: y(asrOf(c, methodId)),
    })),
    [points, methodId, xVar, x, y],
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
        ticks={xTicks}
        tickCount={4}
        tickFormat={xVar.format}
        label={xVar.axisLabel}
      />

      {/* Which way the axis reads. Neither variable is self-evidently
          directional, and 'more vulnerable to the right' is the whole point. */}
      <g className="scatter-marks__ends" pointerEvents="none">
        <text x={0} y={height + 46} textAnchor="start">← {xVar.ends[0]}</text>
        <text x={width} y={height + 46} textAnchor="end">{xVar.ends[1]} →</text>
      </g>

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

/**
 * Shared domains, so the three rule panels can be read against each other.
 *
 * The x domain is padded rather than snapped to zero: ND-GAIN scores the whole
 * world inside 0.26-0.66, and anchoring that at 0 would squeeze every country
 * into the right-hand third of the frame.
 */
export function scatterDomains(countries, xVarId) {
  const xs = countries.map((c) => xOf(c, xVarId)).filter((v) => v != null)
  const asrs = countries.flatMap((c) => (
    Object.values(c.asr ?? {}).filter((v) => Number.isFinite(v))
  ))

  if (!xs.length || !asrs.length) return { xDomain: [0, 1], yDomain: [0.1, 10] }

  const [x0, x1] = extent(xs)
  const xVar = X_VAR_BY_ID[xVarId]
  const xDomain = xVar.scale === 'log'
    ? [Math.max(400, x0 * 0.85), x1 * 1.1]
    : [x0 - (x1 - x0) * 0.06, x1 + (x1 - x0) * 0.06]

  return {
    xDomain,
    yDomain: [min(asrs) * 0.85, max(asrs) * 1.15],
  }
}
