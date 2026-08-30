import { useId, useMemo } from 'react'
import { arc } from 'd3-shape'
import { scaleLinear } from 'd3-scale'
import { interpolateNumber, interpolateRgb } from 'd3-interpolate'
import { slice, easeOut, easeInOutSmooth, beatOpacity } from '../../hooks/useScrollProgress'
import {
  BOUNDARIES,
  HIGH_RISK,
  SCALE_MAX,
  STATUS_FILL,
  STATUS_STROKE,
  statusOf,
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
const GREY_FILL = '#b8c0c8'
const GREY_STROKE = '#8b95a0'

const FILL_FROM_GREY = Object.fromEntries(
  Object.entries(STATUS_FILL).map(([k, hex]) => [k, interpolateRgb(GREY_FILL, hex)]),
)
const STROKE_FROM_GREY = Object.fromEntries(
  Object.entries(STATUS_STROKE).map(([k, hex]) => [k, interpolateRgb(GREY_STROKE, hex)]),
)

/** 7-of-9 caption — full colour, no climate dim. */
export const SEVEN_CROSSED = { from: 0.70, to: 0.80 }

/** Climate caption and wedge-focus share this window so they cannot drift. */
export const CLIMATE_LOOK = { from: 0.82, to: 1.05 }

/**
 * Scroll-driven planetary-boundaries figure. `progress` is 0→1 through the
 * schema phase; D3 only produces path strings and radii.
 *
 *   0.00  circle the size of the earth
 *   0.08  dashed radar rings
 *   0.28  rings settle: safe space, planetary boundary, high-risk line
 *   0.48  nine spokes
 *   0.54  names
 *   0.52  values grow in grey
 *   0.60  grey → status colour (done before the 7-of-9 caption)
 *   0.82  climate caption + highlight; other wedges recede
 */
export function PlanetaryBoundaries({ progress, cx, cy, fromR, width, height }) {
  const uid = useId().replace(/:/g, '')
  const p = progress

  const radar = easeOut(slice(p, 0.08, 0.26))
  const settle = easeInOutSmooth(slice(p, 0.26, 0.46))
  const spokesIn = easeOut(slice(p, 0.46, 0.56))
  const namesIn = easeOut(slice(p, 0.50, 0.62))
  const valuesIn = easeOut(slice(p, 0.52, 0.64))
  const zonesOut = easeOut(slice(p, 0.50, 0.62))
  const colorize = easeInOutSmooth(slice(p, 0.60, 0.68))
  const focus = beatOpacity(p, CLIMATE_LOOK.from, CLIMATE_LOOK.to)

  const earthR = fromR
  const hrR = earthR * interpolateNumber(RADAR[2], HR_RATIO)(settle)

  const rScale = useMemo(
    () =>
      scaleLinear()
        .domain([0, 1, HIGH_RISK, SCALE_MAX])
        .range([0, earthR, earthR * HR_RATIO, earthR * SPOKE_RATIO])
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
      const status = statusOf(b)
      out.push({
        ...b,
        i,
        d: outer > 1.5 ? wedgeArc({ innerRadius: 0, outerRadius: outer, startAngle, endAngle }) : null,
        fill: FILL_FROM_GREY[status](colorize),
        stroke: STROKE_FROM_GREY[status](colorize),
        startAngle,
        endAngle,
        mid,
        lx: cx + Math.sin(mid) * earthR * LABEL_RATIO,
        ly: cy - Math.cos(mid) * earthR * LABEL_RATIO,
        opacity: t,
        isClimate: b.id === 'climate',
      })
    }
    return out
  }, [valuesIn, colorize, rScale, wedgeArc, n, step, cx, cy, earthR])

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
        opacity={settle * (1 - zonesOut)}
      />

      {/* Band between the planetary-boundary circle and the high-risk line. */}
      <path
        d={annulus(cx, cy, earthR, hrR)}
        fill="#fff6cc"
        fillRule="evenodd"
        opacity={settle * (1 - zonesOut)}
      />

      {wedges.map((w) =>
        w.d ? (
          <path
            key={w.id}
            d={w.d}
            fill={w.fill}
            stroke={w.stroke}
            strokeWidth="0.7"
            opacity={Math.min(1, w.opacity / 0.2) * (w.isClimate ? 1 : 1 - focus * 0.78)}
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

      {wedges.map((w) => (
        <NameLabel key={`n-${w.id}`} wedge={w} opacity={namesIn} />
      ))}

      {/* Painted last so the curved zone names sit on top of wedges. */}
      <text
        className="schema__ring-label"
        fill="#111111"
        stroke="#ffffff"
        strokeWidth="2.25"
        paintOrder="stroke"
        opacity={settle}
        pointerEvents="none"
      >
        <textPath href={`#schema-safe-${uid}`} startOffset="50%" textAnchor="middle" fill="#111111">
          Safe operating space
        </textPath>
      </text>
      <text
        className="schema__ring-label"
        fill="#111111"
        stroke="#ffffff"
        strokeWidth="2.25"
        paintOrder="stroke"
        opacity={settle}
        pointerEvents="none"
      >
        <textPath href={`#schema-zone-${uid}`} startOffset="50%" textAnchor="middle" fill="#111111">
          Zone of increasing risk
        </textPath>
      </text>
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
  if (settle <= 0.001) return null

  return (
    <aside className="schema-legend" style={{ opacity: settle }} aria-hidden={settle < 0.5}>
      <div className="schema-legend__row">
        <span className="schema-legend__swatch schema-legend__swatch--safe" />
        <span className="schema-legend__label">Safe operating space</span>
      </div>
      <div className="schema-legend__row">
        <span className="schema-legend__line" />
        <span className="schema-legend__label">Planetary boundary</span>
      </div>
      <div className="schema-legend__row">
        <span className="schema-legend__line schema-legend__line--risk" />
        <span className="schema-legend__label">High risk line</span>
      </div>
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

