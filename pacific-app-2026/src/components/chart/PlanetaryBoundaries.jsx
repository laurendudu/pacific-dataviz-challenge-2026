import { useId, useMemo } from 'react'
import { arc } from 'd3-shape'
import { scaleLinear } from 'd3-scale'
import { interpolateNumber } from 'd3-interpolate'
import { slice, easeOut, easeInOutSmooth } from '../../hooks/useScrollProgress'
import {
  BOUNDARIES,
  HIGH_RISK,
  STATUS_FILL,
  STATUS_STROKE,
  statusOf,
  CROSSED,
} from '../../data/planetaryBoundaries'

/* Visual radii relative to the earth / planetary-boundary circle. */
const HR_RATIO = 1.46
const SPOKE_RATIO = 1.72
const LABEL_RATIO = 1.86
const RADAR = [1.14, 1.30, 1.46, 1.64]

const RING = '#8b95a0'
const SPOKE = '#c5ccd3'
const PB_STROKE = '#4a5560'
const HR_STROKE = '#d4a017'

/**
 * Scroll-driven planetary-boundaries figure. `progress` is 0→1 through the
 * schema phase; D3 only produces path strings and radii.
 *
 *   0.00  circle the size of the earth
 *   0.08  dashed radar rings
 *   0.28  rings settle: safe space, planetary boundary, high-risk line
 *   0.48  nine spokes
 *   0.62  names
 *   0.66  values
 */
export function PlanetaryBoundaries({ progress, cx, cy, fromR, width, height }) {
  const uid = useId().replace(/:/g, '')
  const p = progress

  const radar = easeOut(slice(p, 0.08, 0.26))
  const settle = easeInOutSmooth(slice(p, 0.26, 0.46))
  const spokesIn = easeOut(slice(p, 0.46, 0.60))
  const namesIn = easeOut(slice(p, 0.58, 0.74))
  const valuesIn = easeOut(slice(p, 0.66, 0.92))

  const earthR = fromR
  const hrR = earthR * interpolateNumber(RADAR[2], HR_RATIO)(settle)

  const rScale = useMemo(
    () =>
      scaleLinear()
        .domain([0, 1, HIGH_RISK, 2.2])
        .range([0, earthR, earthR * HR_RATIO, earthR * 1.72])
        .clamp(true),
    [earthR],
  )

  const wedgeArc = useMemo(() => arc().innerRadius(0).padAngle(0), [])

  const n = BOUNDARIES.length
  const step = (Math.PI * 2) / n

  const wedges = useMemo(() => {
    const out = []
    for (let i = 0; i < n; i++) {
      const b = BOUNDARIES[i]
      const local = slice(valuesIn, i * 0.04, 0.55 + i * 0.04)
      const t = easeOut(local)
      const outer = rScale(b.value * t)
      const startAngle = i * step - step / 2
      const endAngle = startAngle + step
      const mid = startAngle + step / 2
      out.push({
        ...b,
        i,
        d: outer > 1.5 ? wedgeArc({ innerRadius: 0, outerRadius: outer, startAngle, endAngle }) : null,
        fill: STATUS_FILL[statusOf(b.value)],
        stroke: STATUS_STROKE[statusOf(b.value)],
        startAngle,
        endAngle,
        mid,
        lx: cx + Math.sin(mid) * earthR * LABEL_RATIO,
        ly: cy - Math.cos(mid) * earthR * LABEL_RATIO,
        opacity: t,
      })
    }
    return out
  }, [valuesIn, rScale, wedgeArc, n, step, cx, cy, earthR])

  const safeR = earthR * 0.82
  const zoneR = (earthR + hrR) / 2
  const safeArc = upperArc(cx, cy, safeR)
  const zoneArc = upperArc(cx, cy, zoneR)

  const radarRings = RADAR.map((k, i) => {
    const target = i < 2 ? 1 : HR_RATIO
    const r = interpolateNumber(k, target)(settle) * earthR
    return { i, r, opacity: radar * (1 - settle) }
  })

  return (
    <g className="schema" aria-hidden="false">
      <defs>
        <path id={`schema-safe-${uid}`} d={safeArc} fill="none" />
        <path id={`schema-zone-${uid}`} d={zoneArc} fill="none" />
      </defs>

      {/* Safe operating space — fills the earth circle once the legend lands. */}
      <circle
        cx={cx}
        cy={cy}
        r={earthR}
        fill="#e3f6ea"
        opacity={settle * (1 - valuesIn * 0.72)}
      />

      {/* Zone of increasing risk — the band between the two lines. */}
      <path
        d={annulus(cx, cy, earthR, hrR)}
        fill="#fff6cc"
        fillRule="evenodd"
        opacity={settle * (1 - valuesIn * 0.65)}
      />

      {wedges.map((w) =>
        w.d ? (
          <path
            key={w.id}
            d={w.d}
            fill={w.fill}
            stroke={w.stroke}
            strokeWidth="0.7"
            opacity={w.opacity}
            transform={`translate(${cx} ${cy})`}
          />
        ) : null,
      )}

      {/* Earth / planetary-boundary circle — always on, from the first beat. */}
      <circle
        cx={cx}
        cy={cy}
        r={earthR}
        fill="none"
        stroke={PB_STROKE}
        strokeWidth={interpolateNumber(1, 1.35)(settle)}
        opacity={0.55 + settle * 0.35}
      />

      {radarRings.map((ring) => (
        <circle
          key={ring.i}
          cx={cx}
          cy={cy}
          r={ring.r}
          fill="none"
          stroke={RING}
          strokeWidth="1"
          strokeDasharray="2.5 7"
          opacity={ring.opacity * 0.55}
        />
      ))}

      {/* High-risk line, solid, once the radar has settled. */}
      <circle
        cx={cx}
        cy={cy}
        r={hrR}
        fill="none"
        stroke={HR_STROKE}
        strokeWidth="1.25"
        opacity={settle * 0.85}
      />

      {BOUNDARIES.map((b, i) => {
        const a = i * step - step / 2
        const x2 = cx + Math.sin(a) * earthR * SPOKE_RATIO
        const y2 = cy - Math.cos(a) * earthR * SPOKE_RATIO
        return (
          <line
            key={`spoke-${b.id}`}
            x1={cx}
            y1={cy}
            x2={x2}
            y2={y2}
            stroke={SPOKE}
            strokeWidth="0.75"
            opacity={spokesIn * 0.9}
          />
        )
      })}

      <text className="schema__ring-label" opacity={settle * (1 - valuesIn * 0.7)}>
        <textPath href={`#schema-safe-${uid}`} startOffset="50%" textAnchor="middle">
          Safe operating space
        </textPath>
      </text>
      <text className="schema__ring-label schema__ring-label--muted" opacity={settle * (1 - valuesIn * 0.55)}>
        <textPath href={`#schema-zone-${uid}`} startOffset="50%" textAnchor="middle">
          Zone of increasing risk
        </textPath>
      </text>

      {wedges.map((w) => (
        <NameLabel key={`n-${w.id}`} wedge={w} opacity={namesIn} />
      ))}
    </g>
  )
}

function NameLabel({ wedge, opacity }) {
  const { lx, ly, lines, mid } = wedge
  const onRight = Math.sin(mid) > 0.18
  const onLeft = Math.sin(mid) < -0.18
  const anchor = onRight ? 'start' : onLeft ? 'end' : 'middle'
  const dy = Math.abs(Math.cos(mid)) > 0.82 ? (Math.cos(mid) > 0 ? -8 : 12) : 0
  const lineH = 13
  const startY = ly + dy - ((lines.length - 1) * lineH) / 2

  return (
    <text className="schema__name" x={lx} y={startY} textAnchor={anchor} opacity={opacity}>
      {lines.map((line, i) => (
        <tspan key={line} x={lx} dy={i === 0 ? 0 : lineH}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

export function SchemaLegend({ progress }) {
  const settle = easeOut(slice(progress, 0.28, 0.48))
  const valuesIn = easeOut(slice(progress, 0.70, 0.84))
  if (settle <= 0.001) return null

  return (
    <aside className="schema-legend" style={{ opacity: settle }} aria-hidden={settle < 0.5}>
      <div className="schema-legend__row">
        <span className="schema-legend__swatch schema-legend__swatch--safe" />
        <span>Safe operating space</span>
      </div>
      <div className="schema-legend__row">
        <span className="schema-legend__line" />
        <span>Planetary boundary</span>
      </div>
      <div className="schema-legend__block">
        <div className="schema-legend__row">
          <span className="schema-legend__line schema-legend__line--risk" />
          <span>High risk line</span>
        </div>
        <p className="schema-legend__sub">Zone of increasing risk</p>
      </div>
      {valuesIn > 0.001 ? (
        <p className="schema-legend__count" style={{ opacity: valuesIn }}>
          {CROSSED} of 9 crossed
        </p>
      ) : null}
    </aside>
  )
}

export function schemaEarthRadius(width, height) {
  const pad = Math.min(120, Math.max(72, Math.min(width, height) * 0.14))
  const half = Math.min(width, height) / 2 - pad
  return Math.max(62, (half / SPOKE_RATIO) * 0.7)
}

function upperArc(cx, cy, r) {
  return `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`
}

function annulus(cx, cy, r0, r1) {
  return [
    `M ${cx - r1} ${cy}`,
    `A ${r1} ${r1} 0 1 0 ${cx + r1} ${cy}`,
    `A ${r1} ${r1} 0 1 0 ${cx - r1} ${cy}`,
    `M ${cx - r0} ${cy}`,
    `A ${r0} ${r0} 0 1 1 ${cx + r0} ${cy}`,
    `A ${r0} ${r0} 0 1 1 ${cx - r0} ${cy}`,
    'Z',
  ].join(' ')
}

