import { useMemo, useRef } from 'react'
import { geoOrthographic, geoPath, geoGraticule10, geoDistance } from 'd3-geo'
import { scaleLinear } from 'd3-scale'
import { interpolateLab, interpolateNumber } from 'd3-interpolate'
import { feature } from 'topojson-client'
import worldCoarse from 'world-atlas/countries-110m.json'
import worldFine from 'world-atlas/countries-50m.json'
import { Scene } from '../components/scroll/Scene'
import { EarthGL } from './EarthGL'
import { useChartDimensions } from '../components/chart/useChartDimensions'
import { slice, easeOut, easeInOut } from '../hooks/useScrollProgress'
import { carbonFootprint, FOOTPRINT_DOMAIN } from '../data/carbonDummy'

/* ── choreography ─────────────────────────────────────────────────────────
   Idle spin until the first scroll, then scroll owns the rotation:

     leg 1  (0 → 0.20)   photograph, half a spin, morph to red/white
     leg 2  (0.20 → 0.60) diagram, a full spin
     leg 3  (0.60 → 1)   final spin onto the Pacific, zooming in
   ───────────────────────────────────────────────────────────────────────── */
const LEG_1 = 0.20
const LEG_2 = 0.60
const MORPH = [0.09, 0.20]
const ZOOM = [0.72, 0.99]
const IDLE_UNTIL = 0.002

const PAPER = '#ffffff'
const RED_LOW = '#fde4dc'
const RED_HIGH = '#7f1d1d'

const PACIFIC_ROTATION = [-173, 7]
const START_SCALE = 0.24
const PACIFIC_LON_SPAN = 77
const PACIFIC_LAT_SPAN = 28
const PACIFIC_PADDING = 0.92

function pacificScale(width, height) {
  const rad = (deg) => (deg * Math.PI) / 180
  return (
    PACIFIC_PADDING *
    Math.min(
      width / 2 / Math.sin(rad(PACIFIC_LON_SPAN / 2)),
      height / 2 / Math.sin(rad(PACIFIC_LAT_SPAN / 2)),
    )
  )
}

const PACIFIC = new Set([
  'Fiji', 'Micronesia', 'Kiribati', 'Marshall Is.', 'Nauru', 'Palau',
  'Papua New Guinea', 'New Caledonia', 'Fr. Polynesia', 'Solomon Is.',
  'Tonga', 'Tuvalu', 'Vanuatu', 'Samoa',
])

const MISSING_STATES = [
  { name: 'Tuvalu', coords: [179.2, -8.5] },
]
const NO_MARGIN = { top: 0, right: 0, bottom: 0, left: 0 }
const MIN_AREA = 40

const coarseCountries = feature(worldCoarse, worldCoarse.objects.countries).features
const fineCountries = feature(worldFine, worldFine.objects.countries).features
const graticule = geoGraticule10()

const redRamp = scaleLinear()
  .domain(FOOTPRINT_DOMAIN)
  .range([RED_LOW, RED_HIGH])
  .interpolate(interpolateLab)
  .clamp(true)

export function GlobeScene() {
  return (
    <Scene id="globe" pages={8}>
      {(progress) => <Globe progress={progress} />}
    </Scene>
  )
}

export function Globe({ progress }) {
  const [ref, dms] = useChartDimensions(NO_MARGIN)
  const { width, height } = dms

  const spinRef = useRef(0)
  const viewRef = useRef({ lon: 0, radius: 0 })
  const spinningRef = useRef(true)
  const opacityRef = useRef(1)

  const morph = easeOut(slice(progress, MORPH[0], MORPH[1]))
  const zoom = easeInOut(slice(progress, ZOOM[0], ZOOM[1]))
  const labelFade = slice(zoom, 0.45, 0.9)
  const spinning = progress <= IDLE_UNTIL
  const showDiagram = morph > 0.001
  const showPhoto = morph < 0.995

  spinningRef.current = spinning
  opacityRef.current = 1 - morph

  const rotation = useMemo(() => {
    const spin = spinRef.current
    let lon

    if (progress <= LEG_1) {
      lon = spin + (progress / LEG_1) * 180
    } else if (progress <= LEG_2) {
      lon = spin + 180 + ((progress - LEG_1) / (LEG_2 - LEG_1)) * 360
    } else {
      const from = spin + 540
      let delta = (((PACIFIC_ROTATION[0] - from) % 360) + 360) % 360
      if (delta < 180) delta += 360
      lon = interpolateNumber(from, from + delta)(
        (progress - LEG_2) / (1 - LEG_2),
      )
    }

    return [lon, PACIFIC_ROTATION[1] * zoom]
  }, [progress, zoom])

  const { paths, markers, labels, graticulePath, radius, cx, cy } = useMemo(() => {
    const empty = { paths: [], markers: [], labels: [], graticulePath: '', radius: 0, cx: 0, cy: 0 }
    if (!width || !height) return empty

    const base = Math.min(width, height)
    const r = interpolateNumber(base * START_SCALE, pacificScale(width, height))(zoom)
    const cx0 = width / 2
    const cy0 = height / 2

    if (!showDiagram) {
      return { ...empty, radius: r, cx: cx0, cy: cy0 }
    }

    const countries = zoom > 0.2 ? fineCountries : coarseCountries
    const projection = geoOrthographic()
      .scale(r)
      .translate([cx0, cy0])
      .rotate(rotation)
    const path = geoPath(projection)

    const paths = countries.map((f, i) => ({
      id: `c${i}`,
      name: f.properties.name,
      d: path(f) ?? '',
      value: carbonFootprint(f.properties.name),
    }))

    const markers = countries
      .map((f, i) => {
        const area = path.area(f)
        if (area > MIN_AREA) return null
        const [mx, my] = path.centroid(f)
        if (!Number.isFinite(mx) || !Number.isFinite(my)) return null
        return {
          id: `m${i}`,
          name: f.properties.name,
          x: mx,
          y: my,
          value: carbonFootprint(f.properties.name),
        }
      })
      .filter(Boolean)

    const labels = countries
      .map((f, i) => {
        if (!PACIFIC.has(f.properties.name)) return null
        const [lx, ly] = path.centroid(f)
        if (!Number.isFinite(lx) || !Number.isFinite(ly)) return null
        return { id: `l${i}`, name: f.properties.name, x: lx, y: ly }
      })
      .filter(Boolean)

    const centre = [-rotation[0], -rotation[1]]
    MISSING_STATES.forEach((state, i) => {
      if (geoDistance(state.coords, centre) > Math.PI / 2) return
      const xy = projection(state.coords)
      if (!xy) return
      markers.push({
        id: `x${i}`,
        name: state.name,
        x: xy[0],
        y: xy[1],
        value: carbonFootprint(state.name),
      })
      labels.push({ id: `xl${i}`, name: state.name, x: xy[0], y: xy[1] })
    })

    return {
      radius: r,
      cx: cx0,
      cy: cy0,
      graticulePath: path(graticule) ?? '',
      paths,
      markers,
      labels,
    }
  }, [width, height, rotation, zoom, showDiagram])

  viewRef.current = { lon: rotation[0], radius }

  if (!width || !height) return <div ref={ref} className="globe" />

  return (
    <div ref={ref} className="globe">
      {showPhoto ? (
        <EarthGL
          width={width}
          height={height}
          viewRef={viewRef}
          spinRef={spinRef}
          spinningRef={spinningRef}
          opacityRef={opacityRef}
        />
      ) : null}

      <svg
        width={width}
        height={height}
        role="img"
        aria-label="Rotating globe that becomes a choropleth of per-capita carbon footprint, then zooms to the Pacific"
      >
        <defs>
          <radialGradient id="shade" cx="34%" cy="30%" r="80%">
            <stop offset="55%" stopColor="#000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000" stopOpacity="0.45" />
          </radialGradient>
        </defs>

        <circle cx={cx} cy={cy} r={radius} fill={PAPER} opacity={morph} />
        <circle cx={cx} cy={cy} r={radius} fill="none"
                stroke="#d9dde1" strokeWidth="1" opacity={morph} />

        {showDiagram ? (
          <path d={graticulePath} fill="none" stroke="#e3e7ea"
                strokeWidth="0.6" opacity={morph} />
        ) : null}

        {showDiagram ? (
          <g>
            {paths.map((c) =>
              c.d ? (
                <path
                  key={c.id}
                  d={c.d}
                  fill={redRamp(c.value)}
                  opacity={morph}
                  stroke="#ffffff"
                  strokeOpacity={morph}
                  strokeWidth={0.5}
                />
              ) : null,
            )}
          </g>
        ) : null}

        {showDiagram && zoom > 0.02 ? (
          <g opacity={morph * zoom}>
            {markers.map((m) => (
              <circle
                key={m.id}
                cx={m.x}
                cy={m.y}
                r={2 + zoom * 6}
                fill={redRamp(m.value)}
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            ))}
          </g>
        ) : null}

        {labelFade > 0.01 ? (
          <g opacity={labelFade}>
            {labels.map((l) => {
              const flip = l.x > width * 0.72
              const offset = 10 + zoom * 4
              return (
                <text
                  key={l.id}
                  className="globe__label"
                  x={flip ? l.x - offset : l.x + offset}
                  y={l.y}
                  dy="0.32em"
                  textAnchor={flip ? 'end' : 'start'}
                >
                  {l.name}
                </text>
              )
            })}
          </g>
        ) : null}

        <circle cx={cx} cy={cy} r={radius} fill="url(#shade)"
                opacity={1 - morph} pointerEvents="none" />
      </svg>

      <Legend opacity={morph} />
      <Captions progress={progress} />
    </div>
  )
}

function Legend({ opacity }) {
  const stops = [0, 5, 10, 15, 20]
  if (opacity <= 0.01) return null
  return (
    <div className="globe__legend" style={{ opacity }}>
      <p className="globe__legend-title">Carbon footprint · tonnes CO₂ per person</p>
      <div className="globe__legend-ramp">
        {stops.map((s) => (
          <span key={s} style={{ background: redRamp(s) }} />
        ))}
      </div>
      <div className="globe__legend-scale"><span>0</span><span>20+</span></div>
      <p className="globe__legend-note">Dummy data — placeholder</p>
    </div>
  )
}

function Captions({ progress }) {
  const beats = [
    { at: [0.01, 0.19], text: 'One planet, one atmosphere.' },
    { at: [0.24, 0.58], text: 'Every country draws on it — but not equally.' },
    { at: [0.72, 1.0], text: 'This is where the bill arrives.' },
  ]
  return (
    <div className="globe__captions">
      {beats.map((b) => {
        const o = Math.min(
          slice(progress, b.at[0], b.at[0] + 0.05),
          1 - slice(progress, b.at[1] - 0.05, b.at[1]),
        )
        return (
          <p
            key={b.text}
            className="globe__caption"
            style={{ opacity: o, transform: `translate3d(0,${(1 - o) * 16}px,0)` }}
            aria-hidden={o < 0.5}
          >
            {b.text}
          </p>
        )
      })}
    </div>
  )
}
