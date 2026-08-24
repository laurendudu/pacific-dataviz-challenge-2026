import { useMemo, useRef, useEffect } from 'react'
import { useSpring } from 'motion/react'
import { geoOrthographic, geoPath, geoCentroid, geoGraticule } from 'd3-geo'
import { scaleThreshold } from 'd3-scale'
import { interpolateNumber } from 'd3-interpolate'
import { feature } from 'topojson-client'
import world110 from 'world-atlas/countries-110m.json'
import pacificIslands from '../data/pacificIslands.json'
import { Scene } from '../components/scroll/Scene'
import { EarthGL } from './EarthGL'
import { useChartDimensions } from '../components/chart/useChartDimensions'
import { PlanetaryBoundaries, SchemaLegend, schemaEarthRadius } from '../components/chart/PlanetaryBoundaries'
import { slice, easeOut, easeInOutSmooth } from '../hooks/useScrollProgress'
import { useEmissionShares, SHARE_YEAR } from '../data/emissionShares'

/* ── choreography ─────────────────────────────────────────────────────────
   Opening keeps its original scroll distance (7 of 16 pages). After the
   Pacific zoom: pull back, a short spin, then the earth becomes the
   planetary-boundaries schema.

     0 → 0.13      photograph left, title right, globe centres
     0.10 → 0.16   crossfade to the diagram
     0.16 → 0.44   turn onto the Pacific + zoom
     0.46 → 0.58   zoom back out to full earth
     0.55 → 0.65   spin a tad
     0.63 → 1      earth becomes the schema
   ───────────────────────────────────────────────────────────────────────── */
const OPENING_PAGES = 7
const TOTAL_PAGES = 18
const T = OPENING_PAGES / TOTAL_PAGES

const MORPH = [0.22 * T, 0.36 * T]
const ZOOM_IN = [0.38 * T, T]
const ZOOM_OUT = [T + 0.02, T + 0.14]
const RECENTER = [0, 0.30 * T]
const TURN = [0.36 * T, 0.88 * T]
const SPIN_TAD = [T + 0.11, T + 0.21]
const SCHEMA = [T + 0.19, 1]
const IDLE_UNTIL = 0.002
const SPIN_AMOUNT = 36

const PAPER = '#ffffff'
const LAND_STROKE = '#ffffff'
const ISLAND_STROKE = '#5c322c'
const GRID_STROKE = '#c5ccd3'

const graticule = geoGraticule().step([15, 15])

const PACIFIC_ROTATION = [-173, 7]
const START_SCALE = 0.24
const PACIFIC_LON_SPAN = 77
const PACIFIC_LAT_SPAN = 28
const PACIFIC_PADDING = 0.92

function pacificScale(width, height) {
  const rad = (deg) => (deg * Math.PI / 180)
  return (
    PACIFIC_PADDING *
    Math.min(
      width / 2 / Math.sin(rad(PACIFIC_LON_SPAN / 2)),
      height / 2 / Math.sin(rad(PACIFIC_LAT_SPAN / 2)),
    )
  )
}

/* Park the globe clearly in the left third so it cannot sit on the title.
   Visual size reads a bit larger than the camera radius, so we inflate it
   and keep a gap; a little of the left limb may clip, and that's fine. */
function parkOffset(width, radius, dock, titleLeft) {
  if (dock <= 0) return 0
  const gap = Math.max(72, width * 0.05)
  const visualR = radius * 1.25
  const rightPad = Math.min(64, Math.max(24, width * 0.05)) + width * 0.05
  const fallbackLeft = width - rightPad - Math.min(width * 0.46, 360)
  const limit = (Number.isFinite(titleLeft) ? titleLeft : fallbackLeft) - gap
  const leftPad = Math.max(8, width * 0.015)
  let center = visualR * 0.82 + leftPad
  center += (width / 2 - center) * 0.28
  if (center + visualR > limit) center = limit - visualR
  return (center - width / 2) * dock
}

function shortestDelta(from, to) {
  let d = ((to - from) % 360 + 360) % 360
  if (d > 180) d -= 360
  return d
}

function motion(progress, spin) {
  const morph = easeOut(slice(progress, MORPH[0], MORPH[1]))
  const zoomIn = easeInOutSmooth(slice(progress, ZOOM_IN[0], ZOOM_IN[1]))
  const zoomOut = easeInOutSmooth(slice(progress, ZOOM_OUT[0], ZOOM_OUT[1]))
  const zoom = zoomIn * (1 - zoomOut)
  const dock = 1 - easeInOutSmooth(slice(progress, RECENTER[0], RECENTER[1]))
  const turn = easeInOutSmooth(slice(progress, TURN[0], TURN[1]))
  const spinTad = easeInOutSmooth(slice(progress, SPIN_TAD[0], SPIN_TAD[1]))
  const schema = slice(progress, SCHEMA[0], SCHEMA[1])
  const land = 1 - easeOut(slice(progress, SCHEMA[0], SCHEMA[0] + 0.07))
  const lon = spin + shortestDelta(spin, PACIFIC_ROTATION[0]) * turn + SPIN_AMOUNT * spinTad
  const tilt = PACIFIC_ROTATION[1] * turn * (1 - 0.4 * spinTad)
  return { morph, zoom, zoomOut, dock, lon, tilt, schema, land }
}

const PACIFIC = new Set([
  'Fiji', 'Micronesia', 'Kiribati', 'Marshall Is.', 'Nauru', 'Palau',
  'Papua New Guinea', 'New Caledonia', 'Fr. Polynesia', 'Solomon Is.',
  'Tonga', 'Tuvalu', 'Vanuatu', 'Samoa',
])

const NO_MARGIN = { top: 0, right: 0, bottom: 0, left: 0 }
const MIN_AREA = 28

const worldCountries = feature(world110, world110.objects.countries).features

/* Coarse 110m continents (cheap to reproject) + 10m coastlines only for the
   14 island states, so atolls still have an outline. */
const diagramCountries = [
  ...worldCountries
    .filter((f) => !PACIFIC.has(f.properties.name))
    .map((f, i) => ({
      id: `w${i}`,
      feat: f,
      name: f.properties.name,
      isPacific: false,
      centroid: geoCentroid(f),
      iso: String(f.id ?? '').padStart(3, '0'),
    })),
  ...pacificIslands.features.map((f, i) => ({
    id: `p${i}`,
    feat: f,
    name: f.properties.name,
    isPacific: true,
    centroid: geoCentroid(f),
    iso: String(f.id ?? '').padStart(3, '0'),
  })),
]

/* Shares are brutally skewed: China 24.6%, Nauru 0.000002%. A linear ramp
   puts 112 of 206 countries in the lightest bin; a log ramp makes Chad and
   Brazil look alike, flattening the very inequality the caption claims. So
   the scale is CLASSED — the reader compares bands, not shades, and the
   legend states each band exactly.

   Ramp derived by walking a Lab interpolation until the lightest step clears
   2:1 against white, then stepping evenly. Verified: monotonic light->dark,
   lightest 2.06:1, darkest 10.02:1. */
const SHARE_BREAKS = [0.01, 0.1, 1, 5, 10]
const SHARE_STEPS = [
  '#dba99f', '#ca8e82', '#b87267', '#a6574d', '#933c34', '#7f1d1d',
]
const redRamp = scaleThreshold().domain(SHARE_BREAKS).range(SHARE_STEPS)

const NO_DATA = '#eceff1'

export function GlobeScene() {
  return (
    <Scene id="globe" pages={TOTAL_PAGES}>
      {(progress, progressRef) => (
        <Globe progress={progress} progressRef={progressRef} />
      )}
    </Scene>
  )
}

export function Globe({ progress, progressRef }) {
  const [ref, dms] = useChartDimensions(NO_MARGIN)
  const { width, height } = dms
  const { shares } = useEmissionShares()

  const fillFor = (iso) => {
    const v = shares?.[iso]?.[SHARE_YEAR]
    return v == null ? NO_DATA : redRamp(v)
  }

  const spinRef = useRef(0)
  const viewRef = useRef({ lon: 0, radius: 0 })
  const spinningRef = useRef(true)
  const opacityRef = useRef(1)
  const stageRef = useRef(null)
  const titleRef = useRef(null)
  const mapRef = useRef(null)
  const localProgress = useRef(progress)
  localProgress.current = progress
  const pRef = progressRef ?? localProgress

  const zoomSpring = useSpring(0, { stiffness: 90, damping: 22, mass: 0.85 })

  if (width && height && viewRef.current.radius === 0) {
    const r0 = Math.min(width, height) * START_SCALE
    viewRef.current = { lon: 0, radius: r0 }
  }

  const { morph, dock, lon, tilt, schema, land } = motion(progress, spinRef.current)
  const spinning = progress <= IDLE_UNTIL
  const showDiagram = morph > 0.001 && land > 0.01
  const showPhoto = morph < 0.995
  const landOpacity = morph * land

  /* Rebuild country paths only when the globe *turns*. Zoom is a Motion
     spring on an SVG scale, so it can run at display refresh. */
  const drawLon = Math.round(lon * 2) / 2
  const drawTilt = Math.round(tilt * 2) / 2
  const rotation = [drawLon, drawTilt]

  spinningRef.current = spinning
  opacityRef.current = 1 - morph

  useEffect(() => {
    if (!width || !height) return
    const cx0 = width / 2
    const cy0 = height / 2
    const rDraw = pacificScale(width, height)
    let frame = 0
    const tick = () => {
      const p = pRef.current
      const m = motion(p, spinRef.current)
      zoomSpring.set(m.zoom)
      const z = zoomSpring.get()
      const rOpen = Math.min(width, height) * START_SCALE
      const rFar = schemaEarthRadius(width, height)
      const rNear = interpolateNumber(rOpen, rFar)(m.zoomOut)
      const r = interpolateNumber(rNear, rDraw)(z)
      const titleLeft = titleRef.current?.getBoundingClientRect().left
      const offsetX = parkOffset(width, r, m.dock, titleLeft)
      viewRef.current = { lon: m.lon, radius: r }
      opacityRef.current = 1 - m.morph
      spinningRef.current = p <= IDLE_UNTIL
      if (stageRef.current) {
        stageRef.current.style.transform = `translate3d(${offsetX}px,0,0)`
      }
      if (titleRef.current) {
        titleRef.current.style.opacity = String(m.dock)
      }
      if (mapRef.current && rDraw > 0) {
        const s = r / rDraw
        mapRef.current.setAttribute(
          'transform',
          `translate(${cx0} ${cy0}) scale(${s}) translate(${-cx0} ${-cy0})`,
        )
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [width, height, pRef, zoomSpring])

  const { paths, markers, cx, cy, graticuleD } = useMemo(() => {
    const empty = { paths: [], markers: [], cx: 0, cy: 0, graticuleD: null }
    if (!width || !height) return empty

    const rDraw = pacificScale(width, height)
    const cx0 = width / 2
    const cy0 = height / 2

    if (!showDiagram) {
      return { ...empty, cx: cx0, cy: cy0 }
    }

    const projection = geoOrthographic()
      .scale(rDraw)
      .translate([cx0, cy0])
      .rotate(rotation)
      .clipAngle(90)
      .precision(0.4)
    const path = geoPath(projection)
    const graticuleD = path(graticule())

    const paths = []
    const markers = []

    for (const c of diagramCountries) {
      const d = path(c.feat)
      if (d) {
        paths.push({
          id: c.id,
          name: c.name,
          d,
          iso: c.iso,
          isPacific: c.isPacific,
        })
      }

      if (!c.isPacific) continue

      const area = d ? path.area(c.feat) : 0
      const [lx, ly] = path.centroid(c.feat)
      if (!Number.isFinite(lx) || !Number.isFinite(ly)) continue

      if (area < MIN_AREA) {
        markers.push({
          id: `m${c.id}`,
          name: c.name,
          x: lx,
          y: ly,
          iso: c.iso,
        })
      }
    }

    return { cx: cx0, cy: cy0, paths, markers, graticuleD }
  }, [width, height, rotation, showDiagram])

  if (!width || !height) return <div ref={ref} className="globe" />

  const rDraw = pacificScale(width, height)
  const rStart = Math.min(width, height) * START_SCALE
  const rSchema = schemaEarthRadius(width, height)
  const s0 = rDraw > 0 ? rStart / rDraw : 1
  const offset0 = parkOffset(width, rStart, dock)

  return (
    <div ref={ref} className="globe">
      <OpeningTitle ref={titleRef} opacity={dock} />

      <div
        ref={stageRef}
        className="globe__stage"
        style={{ transform: `translate3d(${offset0}px,0,0)` }}
      >
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
          aria-label="Rotating globe that zooms to the Pacific, then becomes a planetary-boundaries diagram"
        >
          <defs>
            <radialGradient id="shade" cx="34%" cy="30%" r="80%">
              <stop offset="55%" stopColor="#000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.45" />
            </radialGradient>
          </defs>

          <g
            ref={mapRef}
            className="globe__map"
            transform={`translate(${cx} ${cy}) scale(${s0}) translate(${-cx} ${-cy})`}
          >
            {morph > 0.001 ? (
              <>
                <circle cx={cx} cy={cy} r={rDraw} fill={PAPER} opacity={landOpacity} />
                <circle cx={cx} cy={cy} r={rDraw} fill="none"
                        stroke="#d9dde1" strokeWidth="1" opacity={landOpacity} />

                {graticuleD ? (
                  <path
                    d={graticuleD}
                    fill="none"
                    stroke={GRID_STROKE}
                    strokeWidth={0.75}
                    strokeOpacity={landOpacity * 0.55}
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                  />
                ) : null}

                {showDiagram ? (
                  <g>
                    {paths.filter((c) => !c.isPacific).map((c) => (
                      <path
                        key={c.id}
                        d={c.d}
                        fill={fillFor(c.iso)}
                        opacity={landOpacity}
                        stroke={LAND_STROKE}
                        strokeOpacity={landOpacity * 0.9}
                        strokeWidth={0.5}
                      />
                    ))}
                    {paths.filter((c) => c.isPacific).map((c) => (
                      <path
                        key={c.id}
                        className="globe__island"
                        d={c.d}
                        fill={fillFor(c.iso)}
                        opacity={landOpacity}
                        stroke={ISLAND_STROKE}
                        strokeOpacity={landOpacity}
                        strokeWidth="1.4"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    ))}
                  </g>
                ) : null}

                {showDiagram && markers.length ? (
                  <g opacity={landOpacity}>
                    {markers.map((m) => (
                      <circle
                        key={m.id}
                        cx={m.x}
                        cy={m.y}
                        r="4"
                        fill={fillFor(m.iso)}
                        stroke={ISLAND_STROKE}
                        strokeWidth="1.1"
                      />
                    ))}
                  </g>
                ) : null}

                <circle cx={cx} cy={cy} r={rDraw} fill="url(#shade)"
                        opacity={1 - morph} pointerEvents="none" />
              </>
            ) : null}
          </g>

          {schema > 0.001 ? (
            <PlanetaryBoundaries
              progress={schema}
              cx={cx}
              cy={cy}
              fromR={rSchema}
              width={width}
              height={height}
            />
          ) : null}
        </svg>
      </div>

      {schema > 0.001 ? <SchemaLegend progress={schema} /> : null}

      {schema > 0.001 ? (
        <div className="globe__captions" aria-hidden="true">
          <GlobeCaption progress={schema} from={0.04} to={0.42}>
            Our earth is bounded.
          </GlobeCaption>
          <GlobeCaption progress={schema} from={0.44} to={0.68}>
            9 planetary boundaries define a safe operating space for humanity.
          </GlobeCaption>
          <GlobeCaption progress={schema} from={0.82} to={1.05}>
            Let's take a closer look at climate change.
          </GlobeCaption>
        </div>
      ) : null}
    </div>
  )
}

function GlobeCaption({ progress, from, to, children }) {
  const fade = 0.14 * (to - from)
  const inOpacity = slice(progress, from, from + fade)
  const outOpacity = 1 - slice(progress, to - fade, to)
  const opacity = Math.min(inOpacity, outOpacity)
  const y = (1 - easeOut(inOpacity)) * 18
  if (opacity <= 0.001) return null

  return (
    <p
      className="globe__caption"
      style={{ opacity, transform: `translate3d(0, ${y}px, 0)` }}
    >
      {children}
    </p>
  )
}

function OpeningTitle({ ref, opacity }) {
  return (
    <div
      ref={ref}
      className="globe__title"
      style={{ opacity }}
      aria-hidden={opacity < 0.5}
    >
      <h1>The climate change planetary boundary: the case of the Pacific</h1>
    </div>
  )
}
