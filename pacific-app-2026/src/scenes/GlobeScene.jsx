import { useMemo, useRef, useEffect, useState } from 'react'
import { useSpring } from 'motion/react'
import { geoOrthographic, geoPath, geoCentroid, geoGraticule } from 'd3-geo'
import { scalePow } from 'd3-scale'
import { interpolateNumber, interpolateLab, piecewise } from 'd3-interpolate'
import { feature } from 'topojson-client'
import world110 from 'world-atlas/countries-110m.json'
import pacificIslands from '../data/pacificIslands.json'
import { Scene } from '../components/scroll/Scene'
import { EarthGL } from './EarthGL'
import { useChartDimensions } from '../components/chart/useChartDimensions'
import {
  PlanetaryBoundaries,
  SchemaLegend,
  schemaEarthRadius,
  LIMITS_CAPTION,
  SOS_CAPTION,
  SEVEN_CROSSED,
  CLIMATE_LOOK,
} from '../components/chart/PlanetaryBoundaries'
import { slice, easeOut, easeInOutSmooth } from '../hooks/useScrollProgress'
import { useContributions } from '../data/contributions'

/* ── choreography ─────────────────────────────────────────────────────────
   Opening keeps its original scroll distance (7 of 16 pages). After the
   Pacific zoom: pull back, a short spin, then the earth becomes the
   planetary-boundaries schema.

     0 → 0.13      photograph left, title right; globe recentres into the
                   remaining-stage (sidebar gutter) so the panel can open later
                   without shoving the earth
     0.10 → 0.16   crossfade to the diagram (sidebar slides in invisible)
     0.16 → 0.44   turn onto the Pacific + zoom; sidebar / legend / sentence fade in
     0.46 → 0.58   zoom back out to full earth
     0.55 → 0.65   spin a tad
     0.56 → 1      earth becomes the schema
   ───────────────────────────────────────────────────────────────────────── */
const OPENING_PAGES = 7
const TOTAL_PAGES = 19
const T = OPENING_PAGES / TOTAL_PAGES
/* Pacific choropleth hold — timeline jump target and the `?p=` freeze mark.
   Sits in the short rest after zoom-in (at T) and before zoom-out (T+0.02). */
export const PACIFIC_ZOOM_PROGRESS = T + 0.01

const MORPH = [0.22 * T, 0.36 * T]
const ZOOM_IN = [0.38 * T, T]
const ZOOM_OUT = [T + 0.02, T + 0.14]
const RECENTER = [0, 0.30 * T]
const TURN = [0.36 * T, 0.88 * T]
const SPIN_TAD = [T + 0.11, T + 0.21]
const SCHEMA = [T + 0.19, 1]
const IDLE_UNTIL = 0.002
const SPIN_AMOUNT = 36
/* Wait this long after the damped morph ends before opening the sidebar. */
const SIDEBAR_DELAY_MS = 520
/* If scroll is already this far past morph, skip the delay (deep links / freeze). */
const SIDEBAR_SKIP_AFTER = 0.05

/** Opening title opacity (`dock`). Near 0 once the globe has recentred. */
export function openingTitleOpacity(progress) {
  return motion(progress, 0).dock
}

/** True once the photoreal → schematic crossfade has fully finished. */
export function openingMorphDone(progress) {
  return progress >= MORPH[1]
}

let openingGate = false
const openingGateListeners = new Set()

function setOpeningGate(next) {
  if (next === openingGate) return
  openingGate = next
  openingGateListeners.forEach((fn) => fn(next))
}

export function getOpeningGate() {
  return openingGate
}

export function subscribeOpeningGate(fn) {
  openingGateListeners.add(fn)
  fn(openingGate)
  return () => openingGateListeners.delete(fn)
}

/* Sidebar panel slides in after morph (layout), but stays invisible until the
   Pacific sentence / emissions legend fade in — same window as ZOOM_IN. */
let sidebarReveal = 0
const sidebarRevealListeners = new Set()

function setSidebarReveal(next) {
  const v = Math.round(Math.min(1, Math.max(0, next)) * 1000) / 1000
  if (v === sidebarReveal) return
  sidebarReveal = v
  sidebarRevealListeners.forEach((fn) => fn(v))
}

export function getSidebarReveal() {
  return sidebarReveal
}

export function subscribeSidebarReveal(fn) {
  sidebarRevealListeners.add(fn)
  fn(sidebarReveal)
  return () => sidebarRevealListeners.delete(fn)
}

function legendRevealOpacity(progress) {
  const fade = Math.min(0.04, 0.12 * (ZOOM_OUT[1] - ZOOM_IN[0]))
  return slice(progress, ZOOM_IN[0], ZOOM_IN[0] + fade)
}

function sidebarShouldOpen(progress, elapsedMs) {
  if (progress < MORPH[1]) return false
  if (progress >= MORPH[1] + SIDEBAR_SKIP_AFTER) return true
  return elapsedMs >= SIDEBAR_DELAY_MS
}

const PAPER = '#ffffff'
const LAND_STROKE = '#ffffff'
const ISLAND_STROKE = '#8a2350'
const GRID_STROKE = '#ded9ee'

const graticule = geoGraticule().step([15, 15])

const PACIFIC_ROTATION = [-173, 7]
const START_SCALE = 0.24
const PACIFIC_LON_SPAN = 77
const PACIFIC_LAT_SPAN = 28
const PACIFIC_PADDING = 0.92
/* Peak Pacific scale is 95% of the tight crop so French Polynesia stays in frame. */
const PACIFIC_ZOOM = 0.95
/* Opening dock: a tad right of the old left-third park, title 40px off the limb. */
const PARK_NUDGE = 0.04
const TITLE_GAP = 40
const SIDEBAR_REM = 16

let cachedSidebarPx = null

function sidebarPx() {
  if (cachedSidebarPx != null) return cachedSidebarPx
  if (typeof document === 'undefined') {
    cachedSidebarPx = SIDEBAR_REM * 16
    return cachedSidebarPx
  }
  const root = getComputedStyle(document.documentElement)
  const raw = root.getPropertyValue('--app-sidebar').trim()
  const fs = parseFloat(root.fontSize)
  const em = Number.isFinite(fs) ? fs : 16
  if (raw.endsWith('rem')) cachedSidebarPx = parseFloat(raw) * em
  else if (raw.endsWith('px')) cachedSidebarPx = parseFloat(raw)
  else cachedSidebarPx = SIDEBAR_REM * em
  if (!Number.isFinite(cachedSidebarPx)) cachedSidebarPx = SIDEBAR_REM * em
  return cachedSidebarPx
}

function invalidateSidebarPx() {
  cachedSidebarPx = null
}

function visibleGlobeWidth(width) {
  return Math.max(1, width - sidebarPx())
}

/* Fit the Pacific lon/lat box to the stage that remains beside the overlay
   sidebar. Canvas width stays the full viewport; only the crop shrinks. */
function pacificScale(width, height) {
  const visW = visibleGlobeWidth(width)
  const rad = (deg) => (deg * Math.PI / 180)
  return (
    PACIFIC_PADDING *
    PACIFIC_ZOOM *
    Math.min(
      visW / 2 / Math.sin(rad(PACIFIC_LON_SPAN / 2)),
      height / 2 / Math.sin(rad(PACIFIC_LAT_SPAN / 2)),
    )
  )
}

/* Park the globe left of centre so the title can sit immediately to its right.
   Visual size reads a bit larger than the camera radius, so we inflate it
   and keep a gap; a little of the left limb may clip, and that's fine. */
function parkOffset(width, radius, dock) {
  if (dock <= 0) return 0
  const visualR = radius * 1.25
  const leftPad = Math.max(8, width * 0.015)
  let center = visualR * 0.82 + leftPad
  center += (width / 2 - center) * 0.28
  center += width * PARK_NUDGE
  if (center > width * 0.48) center = width * 0.48
  return (center - width / 2) * dock
}

/* As the title docks away, land on the remaining-stage centre (half a sidebar
   to the right) so the morph / schema never jump when the panel slides in. */
function stageOffset(width, radius, dock) {
  return parkOffset(width, radius, dock) + (1 - dock) * (sidebarPx() / 2)
}

function titleLeftFromGlobe(width, radius, offset) {
  return width / 2 + offset + radius + TITLE_GAP
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

/* Natural Earth abbreviations → place names beside the Pacific zoom zones. */
const PLACE_LABEL = {
  'Marshall Is.': 'Marshall Islands',
  'Fr. Polynesia': 'French Polynesia',
  'Solomon Is.': 'Solomon Islands',
}

/* Split long place names onto two lines at the same font-size — never shrink. */
function wrapPlaceName(name) {
  const words = name.split(' ')
  if (words.length <= 1) return [name]
  if (words.length === 2 && name.length <= 14) return [name]
  const mid = Math.ceil(words.length / 2)
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
}

function formatSharePct(pct) {
  if (pct == null || Number.isNaN(pct)) return null
  if (Math.abs(pct) >= 10) return pct.toFixed(1)
  if (Math.abs(pct) >= 1) return pct.toFixed(2)
  return Number(pct).toPrecision(2)
}

/* Shared halo at Pacific zoom — same size as Papua New Guinea for every place. */
export const ZONE_R = 46
const ZONE_LABEL_GAP = 8
const ZONE_LINE_GAP = 7.4

const NO_MARGIN = { top: 0, right: 0, bottom: 0, left: 0 }

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

/* Continuous light->dark red over each country's share of world emissions:
   palest for the smallest contributor, darkest for the largest.

   Low end is a blush so tiny shares (the Pacific, most of Africa) read as a
   wash. The ramp warms through coral to a deep raspberry, so China and the US
   land on #8a2350 — hot rather than brick, and still the darkest thing on the
   map. Hue drifts peach → pink on purpose; lightness only ever falls, which is
   the part a choropleth actually has to get right.

   Shares are brutally skewed — China 31.3%, Nauru 0.000003%, seven orders of
   magnitude — so the ramp position is a POWER of the share, not the share
   itself. Linear paints every country but China and the United States white;
   log overcorrects and paints Chad the same red as Japan, which is the one
   thing this map must never say. Exponent 0.35 was picked against the actual
   distribution: the top three stay unmistakably dark, Europe reads mid, and
   159 of 198 countries — most of Africa, all fourteen Pacific islands — sit
   in the lightest fifth of the ramp. */
const PALETTE = [
  '#fff1ec', '#ffdcd2', '#ffc0b4', '#ff9e92', '#fa7a72', '#e85567', '#c43a62', '#8a2350',
]
const RAMP_EXPONENT = 0.35

const paletteRamp = piecewise(interpolateLab, PALETTE)

/* `position` is shared with the legend below, so the swatch a country wears
   and the tick it sits under can never drift apart. */
function makeRamp(maxShare) {
  const position = scalePow()
    .exponent(RAMP_EXPONENT)
    .domain([0, maxShare])
    .range([0, 1])
    .clamp(true)
  return { position, max: maxShare, color: (share) => paletteRamp(position(share)) }
}

/* CSS would interpolate the six anchors in sRGB and dull the middle, so the
   bar is sampled off the same Lab ramp the map uses. */
const LEGEND_GRADIENT = `linear-gradient(to right, ${
  Array.from({ length: 16 }, (_, i) => paletteRamp(i / 15)).join(', ')
})`
/* Four labels, not five: on a power ramp everything below a tenth of a per
   cent bunches into the first sixth of the bar, so 0.1% had nowhere to sit. */
const LEGEND_TICKS = [0.01, 1, 5]

const NO_DATA = '#f0ecf9'

export function GlobeScene() {
  return (
    <Scene id="globe" pages={TOTAL_PAGES} smooth={0.1}>
      {(progress, progressRef) => (
        <Globe progress={progress} progressRef={progressRef} />
      )}
    </Scene>
  )
}

/* Keep EarthGL width/height glued to the first viewport measure (and to
   window resizes). Overlaying the sidebar must not feed a new size into
   react-globe.gl — that remounts the WebGL canvas mid-crossfade. */
function useHandoffStableSize(measuredW, measuredH) {
  const [size, setSize] = useState({ width: 0, height: 0 })
  const pendingRef = useRef(true)

  useEffect(() => {
    const onResize = () => {
      pendingRef.current = true
      invalidateSidebarPx()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!measuredW || !measuredH || !pendingRef.current) return
    pendingRef.current = false
    setSize((prev) =>
      prev.width === measuredW && prev.height === measuredH
        ? prev
        : { width: measuredW, height: measuredH },
    )
  }, [measuredW, measuredH])

  if (size.width && size.height) return size
  return { width: measuredW, height: measuredH }
}

export function Globe({ progress, progressRef, frozen = false }) {
  const [ref, dms] = useChartDimensions(NO_MARGIN)
  const { width, height } = useHandoffStableSize(dms.width, dms.height)
  const { shares, meta, pacific } = useContributions()

  /* Fresh mount must not inherit a stuck sidebar gate from a prior HMR / scroll. */
  useEffect(() => {
    setOpeningGate(frozen ? progress >= MORPH[1] : false)
    setSidebarReveal(frozen ? legendRevealOpacity(progress) : 0)
    return () => {
      setOpeningGate(false)
      setSidebarReveal(0)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- mount/unmount only

  const pacificShare = useMemo(() => {
    if (pacific?.share_pct != null) return pacific.share_pct
    if (!shares) return null
    let sum = 0
    for (const c of diagramCountries) {
      if (!c.isPacific) continue
      const v = shares.get(c.iso)
      if (v != null) sum += v
    }
    return sum
  }, [shares, pacific])

  /* Anchor the dark end on the largest share actually in the file rather than
     a literal, so re-running notebook 04 for another year still lands China
     (or whoever leads it) on the darkest raspberry. */
  const ramp = useMemo(() => {
    if (!shares) return null
    return makeRamp(Math.max(...shares.values()))
  }, [shares])

  const fillFor = (iso) => {
    const v = shares?.get(iso)
    return v == null || !ramp ? NO_DATA : ramp.color(v)
  }

  const spinRef = useRef(0)
  const viewRef = useRef({ lon: 0, radius: 0 })
  const spinningRef = useRef(true)
  const opacityRef = useRef(1)
  const stageRef = useRef(null)
  const titleRef = useRef(null)
  const mapRef = useRef(null)
  const morphDoneAtRef = useRef(null)
  const [tip, setTip] = useState(null)
  const localProgress = useRef(progress)
  localProgress.current = progress
  const pRef = progressRef ?? localProgress

  const zoomSpring = useSpring(0, { stiffness: 90, damping: 22, mass: 0.85 })

  if (width && height && viewRef.current.radius === 0) {
    const r0 = Math.min(width, height) * START_SCALE
    viewRef.current = { lon: 0, radius: r0 }
  }

  const { morph, dock, lon, tilt, schema, land, zoom } = motion(progress, spinRef.current)
  const spinning = progress <= IDLE_UNTIL
  /* Keep the WebGL tree mounted through the morph — disposing Three.js at
     MORPH[1] was the hitch. Tear it down only once the schema owns the stage. */
  const keepPhoto = progress < SCHEMA[0]
  const landOpacity = morph * land
  const zoneOpacity = landOpacity * zoom
  const showZones = zoneOpacity > 0.01
  const [landMounted, setLandMounted] = useState(false)

  /* Mount the choropleth DOM on idle (or at the first morph tick) so the
     ~200 <path> createElement cost never lands on the crossfade frame. */
  useEffect(() => {
    if (landMounted || !width || !height) return
    if (morph > 0.001) {
      setLandMounted(true)
      return
    }
    let cancelled = false
    const warm = () => {
      if (!cancelled) setLandMounted(true)
    }
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(warm, { timeout: 700 })
      return () => {
        cancelled = true
        window.cancelIdleCallback(id)
      }
    }
    const t = window.setTimeout(warm, 180)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [landMounted, width, height, morph])

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
    const tick = (now) => {
      const p = pRef.current
      const m = motion(p, spinRef.current)
      zoomSpring.set(m.zoom)
      const z = zoomSpring.get()
      const rOpen = Math.min(width, height) * START_SCALE
      const rFar = schemaEarthRadius(width, height)
      const rNear = interpolateNumber(rOpen, rFar)(m.zoomOut)
      const r = interpolateNumber(rNear, rDraw)(z)
      const offsetX = stageOffset(width, r, m.dock)
      const offsetParked = parkOffset(width, rOpen, 1)
      viewRef.current = { lon: m.lon, radius: r }
      opacityRef.current = 1 - m.morph
      spinningRef.current = p <= IDLE_UNTIL

      if (frozen) {
        morphDoneAtRef.current = null
        setOpeningGate(p >= MORPH[1])
      } else if (p >= MORPH[1]) {
        if (morphDoneAtRef.current == null) morphDoneAtRef.current = now
        setOpeningGate(sidebarShouldOpen(p, now - morphDoneAtRef.current))
      } else {
        morphDoneAtRef.current = null
        setOpeningGate(false)
      }
      setSidebarReveal(legendRevealOpacity(p))

      if (stageRef.current) {
        stageRef.current.style.transform = `translate3d(${offsetX}px,0,0)`
      }
      if (titleRef.current) {
        titleRef.current.style.left = `${titleLeftFromGlobe(width, rOpen, offsetParked)}px`
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
  }, [width, height, pRef, zoomSpring, frozen])

  /* Project on first layout (and on turn), not on the first morph frame —
     building ~200 country paths mid-crossfade was a main-thread hitch. */
  const { paths, zones, cx, cy, graticuleD } = useMemo(() => {
    const empty = { paths: [], zones: [], cx: 0, cy: 0, graticuleD: null }
    if (!width || !height) return empty

    const rDraw = pacificScale(width, height)
    const cx0 = width / 2
    const cy0 = height / 2

    const projection = geoOrthographic()
      .scale(rDraw)
      .translate([cx0, cy0])
      .rotate(rotation)
      .clipAngle(90)
      .precision(0.4)
    const path = geoPath(projection)
    const graticuleD = path(graticule())

    const paths = []
    const zones = []

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

      const pt = projection(c.centroid)
      if (!pt || !Number.isFinite(pt[0]) || !Number.isFinite(pt[1])) continue

      const name = PLACE_LABEL[c.name] ?? c.name
      zones.push({
        id: `z${c.id}`,
        name,
        lines: wrapPlaceName(name),
        iso: c.iso,
        x: pt[0],
        y: pt[1],
        r: ZONE_R,
      })
    }

    if (zones.length) {
      const mx = zones.reduce((s, z) => s + z.x, 0) / zones.length
      const my = zones.reduce((s, z) => s + z.y, 0) / zones.length
      const labelW = 78
      const edge = 16
      const shift = sidebarPx() / 2
      const rightLimit = width - shift - edge
      const leftLimit = shift + edge
      for (const z of zones) {
        const dx = z.x - mx
        const dy = z.y - my
        const hx = dx < 0 ? -1 : 1
        const len = Math.hypot(dx, dy) || 1
        z.lx = z.x + hx * (z.r + ZONE_LABEL_GAP)
        z.ly = z.y + (dy / len) * (z.r * 0.28)
        z.anchor = hx < 0 ? 'end' : 'start'
        /* Remaining-stage edges (sidebar overlay + CSS rail shift), so limb
           islands stay labelled on canvas rather than under the panel or off
           the right. */
        if (z.anchor === 'start' && z.lx + labelW > rightLimit) {
          z.lx = z.x - (z.r + ZONE_LABEL_GAP)
          z.anchor = 'end'
        } else if (z.anchor === 'end' && z.lx - labelW < leftLimit) {
          z.lx = z.x + (z.r + ZONE_LABEL_GAP)
          z.anchor = 'start'
        }
      }
    }

    return { cx: cx0, cy: cy0, paths, zones, graticuleD }
  }, [width, height, rotation])

  if (!width || !height) return <div ref={ref} className="globe" />

  const rDraw = pacificScale(width, height)
  const rStart = Math.min(width, height) * START_SCALE
  const rSchema = schemaEarthRadius(width, height)
  const s0 = rDraw > 0 ? rStart / rDraw : 1
  const offset0 = stageOffset(width, rStart, dock)
  const titleLeft0 = titleLeftFromGlobe(width, rStart, parkOffset(width, rStart, 1))

  const moveTip = (event, name, iso) => {
    const box = ref.current?.getBoundingClientRect()
    if (!box) return
    const share = shares?.get(iso)
    setTip({
      name,
      share: share ?? null,
      x: event.clientX - box.left,
      y: event.clientY - box.top,
    })
  }

  const hideTip = (event) => {
    const next = event.relatedTarget
    if (next && typeof next.closest === 'function' && next.closest('.globe__hit')) return
    setTip(null)
  }

  return (
    <div ref={ref} className="globe">
      <OpeningTitle ref={titleRef} opacity={dock} left={titleLeft0} />

      <div className="globe__rail">
        <div
          ref={stageRef}
          className="globe__stage"
          style={{ transform: `translate3d(${offset0}px,0,0)` }}
        >
        {keepPhoto ? (
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
              {/* Plum rather than black, and lighter: pure black at 0.45 sucked
                  the chroma out of the ramp's warm end at the limb. */}
              <stop offset="55%" stopColor="#3a2a52" stopOpacity="0" />
              <stop offset="100%" stopColor="#3a2a52" stopOpacity="0.30" />
            </radialGradient>
          </defs>

          <g
            ref={mapRef}
            className="globe__map"
            transform={`translate(${cx} ${cy}) scale(${s0}) translate(${-cx} ${-cy})`}
          >
            {/* One opacity on the group — not per-country — so React is not
                rewriting ~200 attributes at 30fps through the crossfade. */}
            <g
              opacity={landOpacity}
              style={{ visibility: landOpacity < 0.01 ? 'hidden' : 'visible' }}
            >
              {landMounted ? (
                <>
              <circle cx={cx} cy={cy} r={rDraw} fill={PAPER} />
              <circle cx={cx} cy={cy} r={rDraw} fill="none"
                      stroke="var(--hairline)" strokeWidth="1" />

              {graticuleD ? (
                <path
                  d={graticuleD}
                  fill="none"
                  stroke={GRID_STROKE}
                  strokeWidth={0.75}
                  strokeOpacity={0.55}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
              ) : null}

              <g>
                {paths.filter((c) => !c.isPacific).map((c) => (
                  <path
                    key={c.id}
                    d={c.d}
                    fill={fillFor(c.iso)}
                    stroke={LAND_STROKE}
                    strokeOpacity={0.9}
                    strokeWidth={0.5}
                  />
                ))}
                {paths.filter((c) => c.isPacific).map((c) => (
                  <path
                    key={c.id}
                    className="globe__island globe__hit"
                    d={c.d}
                    fill={fillFor(c.iso)}
                    stroke={ISLAND_STROKE}
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    onMouseEnter={(e) => moveTip(e, PLACE_LABEL[c.name] ?? c.name, c.iso)}
                    onMouseMove={(e) => moveTip(e, PLACE_LABEL[c.name] ?? c.name, c.iso)}
                    onMouseLeave={hideTip}
                  />
                ))}
              </g>

              {zones.length > 0 && showZones ? (
                <g className="globe__zones" opacity={zoom}>
                  {zones.map((z) => (
                    <g
                      key={z.id}
                      className="globe__hit"
                      onMouseEnter={(e) => moveTip(e, z.name, z.iso)}
                      onMouseMove={(e) => moveTip(e, z.name, z.iso)}
                      onMouseLeave={hideTip}
                    >
                      <circle
                        className="globe__zone"
                        cx={z.x}
                        cy={z.y}
                        r={z.r}
                        fill={ISLAND_STROKE}
                        fillOpacity={0.16}
                        stroke={ISLAND_STROKE}
                        strokeOpacity={0.38}
                        strokeWidth={1}
                        vectorEffect="non-scaling-stroke"
                      />
                      <text
                        className="globe__label"
                        fill="var(--ink)"
                        fontWeight="400"
                        textAnchor={z.anchor}
                        x={z.lx}
                        y={z.ly - (z.lines.length - 1) * ZONE_LINE_GAP}
                      >
                        {z.lines.map((line, i) => (
                          <tspan key={i} x={z.lx} dy={i === 0 ? '0.35em' : '1.2em'}>
                            {line}
                          </tspan>
                        ))}
                      </text>
                    </g>
                  ))}
                </g>
              ) : null}
                </>
              ) : null}
            </g>

            {morph > 0.001 && morph < 0.999 ? (
              <circle cx={cx} cy={cy} r={rDraw} fill="url(#shade)"
                      opacity={1 - morph} pointerEvents="none" />
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
      </div>

      {tip ? (
        <div
          className="globe__tooltip"
          style={{ left: tip.x, top: tip.y }}
        >
          {tip.share == null
            ? `${tip.name} · no data`
            : `${tip.name} · ${formatSharePct(tip.share)}% of global emissions`}
        </div>
      ) : null}

      {ramp ? (
        <EmissionsLegend
          progress={progress}
          landOpacity={landOpacity}
          ramp={ramp}
          year={meta?.year}
          compact={width < 560}
        />
      ) : null}

      {pacificShare != null ? (
        <PacificStatement progress={progress} from={ZOOM_IN[0]} to={ZOOM_OUT[1]}>
          In {meta?.year ?? 2023}, the pacific region contributed to {formatSharePct(pacificShare)}% of global GHG<sup className="globe__statement-mark">*</sup> emissions.
        </PacificStatement>
      ) : null}

      {schema > 0.001 ? <SchemaLegend progress={schema} /> : null}

      {schema > 0.001 ? (
        <div className="globe__captions" aria-hidden="true">
          <GlobeCaption progress={schema} from={LIMITS_CAPTION.from} to={LIMITS_CAPTION.to}>
            The planet is bounded by biogeochemical limits.
          </GlobeCaption>
          <GlobeCaption progress={schema} from={SOS_CAPTION.from} to={SOS_CAPTION.to}>
            9 planetary boundaries define a safe operating space for humanity.
          </GlobeCaption>
          <GlobeCaption progress={schema} from={SEVEN_CROSSED.from} to={SEVEN_CROSSED.to}>
            As of 2025, 7 out of 9 are crossed
          </GlobeCaption>
          <GlobeCaption progress={schema} from={CLIMATE_LOOK.from} to={CLIMATE_LOOK.to}>
            Let's take a closer look at climate change.
          </GlobeCaption>
        </div>
      ) : null}
    </div>
  )
}

/* Fade in with the Pacific 2023 sentence (not the morph), so the sidebar can
   finish sliding first. Stay until the land itself goes, so the choropleth is
   never unexplained. Ticks sit on the ramp's power scale — the bunching at
   the light end is the skew in the data, drawn. */
function EmissionsLegend({ progress, landOpacity, ramp, year, compact }) {
  const inOpacity = legendRevealOpacity(progress)
  const opacity = inOpacity * landOpacity
  const y = (1 - easeOut(inOpacity)) * 10
  if (opacity <= 0.001) return null

  /* The bar shrinks with the viewport but the labels do not, so a narrow
     screen keeps only the two ends — the interior ticks would collide. */
  const scale = compact ? LEGEND_TICKS.slice(0, 1) : LEGEND_TICKS
  const ticks = [...scale.filter((t) => t < ramp.max), ramp.max]

  return (
    <aside
      className="globe__legend"
      style={{ opacity, transform: `translate3d(0, ${y}px, 0)` }}
      aria-hidden={opacity < 0.5}
    >
      <p className="globe__legend-title">
        Share of world emissions{year ? `, ${year}` : ''}
      </p>
      <div className="globe__legend-ramp" style={{ background: LEGEND_GRADIENT }} />
      <div className="globe__legend-ticks">
        {ticks.map((t) => {
          const p = ramp.position(t)
          return (
            <span
              key={t}
              className="globe__legend-tick"
              style={{ left: `${p * 100}%`, transform: `translateX(${-p * 100}%)` }}
            >
              {t >= 10 ? t.toFixed(1) : t}%
            </span>
          )
        })}
      </div>
    </aside>
  )
}

function PacificStatement({ progress, from, to, children }) {
  const fade = Math.min(0.04, 0.12 * (to - from))
  const inOpacity = slice(progress, from, from + fade)
  const outOpacity = 1 - slice(progress, to - fade, to)
  const opacity = Math.min(inOpacity, outOpacity)
  const y = (1 - easeOut(inOpacity)) * 10
  if (opacity <= 0.001) return null

  return (
    <div
      className="globe__statement"
      style={{ opacity, transform: `translate3d(0, ${y}px, 0)` }}
      aria-hidden={opacity < 0.5}
    >
      <p className="globe__statement-body">{children}</p>
      <p className="globe__statement-fn">* greenhouse gas emissions</p>
    </div>
  )
}

/* Short absolute fade — a fraction of a long window left two captions
   readable on top of each other. Cap so a handoff is a brief crossfade. */
const CAPTION_FADE = 0.022

function GlobeCaption({ progress, from, to, children }) {
  const fade = Math.min(CAPTION_FADE, (to - from) / 3)
  const inOpacity = slice(progress, from, from + fade)
  const opacity = Math.min(inOpacity, 1 - slice(progress, to - fade, to))
  const y = (1 - easeOut(inOpacity)) * -14
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

function OpeningTitle({ ref, opacity, left }) {
  return (
    <div
      ref={ref}
      className="globe__title"
      style={{ opacity, left: `${left}px` }}
      aria-hidden={opacity < 0.5}
    >
      <h1>
        <span className="globe__title-lead">
          The climate change
          <br />
          planetary boundary:
        </span>
        <span className="globe__title-kicker">the case of the Pacific</span>
      </h1>
    </div>
  )
}
