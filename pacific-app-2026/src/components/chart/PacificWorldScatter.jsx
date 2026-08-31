import { useMemo } from 'react'
import { extent, max, min } from 'd3-array'
import { Delaunay } from 'd3-delaunay'
import { scaleLinear, scaleLog, scaleSqrt, scaleSymlog } from 'd3-scale'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { EMITTERS } from '../../data/emitters'
import { X_VAR_BY_ID, asrOf, formatAsr, xOf } from '../../data/scatter'
import { AxisBottom, AxisLeft } from './Axis'
import { ChartFrame } from './ChartFrame'

const MARGIN = { top: 12, right: 12, bottom: 86, left: 40 }
const WORLD_R = 4.6
const EMITTER_R = 6
const PACIFIC_R = 7
const HIT_R = 28

/** Pacific, then the large emitters, then everyone else. */
function groupOf(country) {
  if (country.pacific) return 'pacific'
  return EMITTERS.has(country.iso) ? 'emitter' : 'world'
}

const RADIUS_BY_GROUP = { world: WORLD_R, emitter: EMITTER_R, pacific: PACIFIC_R }

/** Grandfathering lands every country on the same ASR, so marks stack into
 *  a line. Pixel jitter unstacks the cloud without pretending the ratios
 *  differ. Y is the stacked axis; X is a smaller nudge for near-twin
 *  exposure/GDP scores. Offsets are hashed from ISO so hover and re-renders
 *  stay put. */
const GF_JITTER_Y = 9
const GF_JITTER_X = 2.5

/**
 * Stable unit in [-1, 1] from an ISO3 code. FNV-1a: not random, so the
 * cloud does not jump.
 */
function unitFromIso(iso, salt) {
  let h = 2166136261
  const s = `${iso}\0${salt}`
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) / 4294967296) * 2 - 1
}

const SCALE_BY_ID = {
  linear: scaleLinear,
  log: scaleLog,
  sqrt: scaleSqrt,
  symlog: scaleSymlog,
}

const DOT_EASE = [0.4, 0, 0.2, 1]
const DOT_MOVE = {
  cx: { duration: 0.7, ease: DOT_EASE },
  cy: { duration: 0.7, ease: DOT_EASE },
  opacity: { duration: 0.28, ease: DOT_EASE },
}
const DOT_SNAP = { duration: 0 }
const AXIS_FADE = { duration: 0.28, ease: DOT_EASE }

/**
 * One x × ASR scatter. D3 builds scales, ticks and the hit index; React draws
 * the SVG. The world cloud is drawn first, then the large emitters, then the
 * Pacific on top: the two groups the reader is being asked to compare.
 *
 * `xVarId` picks one of the five axes in `X_VARS`: exposure, disaster loss,
 * emissions share, fossil rents or GDP per capita. The y axis is always the
 * ASR under `methodId`.
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
      desc="Each circle is a country. Pacific territories are the larger blue marks."
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
  const reduceMotion = useReducedMotion()
  const x = useMemo(() => {
    const scale = SCALE_BY_ID[xVar.scale]().domain(xDomain).range([0, width]).clamp(true)
    /* Symlog's constant is where it stops behaving like a log and starts
       behaving like a line. Its default of 1 is above every value on the
       disaster-loss axis, which would render that axis linear. */
    if (xVar.constant != null) scale.constant(xVar.constant)
    return scale
  }, [xVar, xDomain, width])
  const y = useMemo(
    () => scaleLog().domain(yDomain).range([height, 0]).clamp(true),
    [yDomain, height],
  )

  /* Ticks the variable names win, filtered to the drawn domain so a fixed
     list cannot pile up against a clamped edge. Otherwise: powers of ten on a
     log axis, because d3's log scale returns its minor ticks whenever the
     domain is narrower than the requested count (two dozen labels along a
     340px axis on GDP per capita), and the scale's own choice everywhere
     else. Symlog's own ticks are linear, so those axes always name theirs. */
  const xTicks = useMemo(() => {
    const [lo, hi] = xDomain
    if (xVar.ticks) return xVar.ticks.filter((t) => t >= lo && t <= hi)
    if (xVar.scale !== 'log') return undefined
    return x.ticks().filter((t) => Number.isInteger(Math.log10(t)))
  }, [xVar, x, xDomain])

  const placed = useMemo(
    () => points.map((c) => {
      let cx = x(xOf(c, xVar.id))
      let cy = y(asrOf(c, methodId))
      if (methodId === 'gf') {
        cx += unitFromIso(c.iso, 'x') * GF_JITTER_X
        cy += unitFromIso(c.iso, 'y') * GF_JITTER_Y
      }
      return { ...c, value: asrOf(c, methodId), group: groupOf(c), cx, cy }
    }),
    [points, methodId, xVar, x, y],
  )

  const world = placed.filter((c) => c.group === 'world')
  const emitters = placed.filter((c) => c.group === 'emitter')
  const pacific = placed.filter((c) => c.group === 'pacific')
  const hovered = placed.find((c) => c.iso === hoveredIso) ?? null

  const delaunay = useMemo(
    () => (placed.length ? Delaunay.from(placed, (d) => d.cx, (d) => d.cy) : null),
    [placed],
  )

  const fairY = y(1)
  const hiY = y(100)
  const methodMax = max(points, (c) => asrOf(c, methodId))
  const showFair = fairY >= 0 && fairY <= height
  const showHi = methodMax >= 100 && hiY >= 0 && hiY <= height

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
    onHover(dist <= HIT_R ? hit : null, event)
  }

  const move = reduceMotion ? DOT_SNAP : DOT_MOVE

  return (
    <g className="scatter-marks">
      <AxisLeft
        scale={y}
        width={width}
        tickCount={4}
        tickFormat={formatAsr}
        label="ASR"
      />

      <AnimatePresence initial={false}>
        <motion.g
          key={xVar.id}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={AXIS_FADE}
        >
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
            <text x={0} y={height + 74} textAnchor="start">← {xVar.ends[0]}</text>
            <text x={width} y={height + 74} textAnchor="end">{xVar.ends[1]} →</text>
          </g>
        </motion.g>
      </AnimatePresence>

      <g className="scatter-marks__world">
        <AnimatePresence initial={false}>
          {world.map((c) => (
            <ScatterDot
              key={c.iso}
              c={c}
              hoveredIso={hoveredIso}
              r={WORLD_R}
              variant="world"
              transition={move}
            />
          ))}
        </AnimatePresence>
      </g>
      <g className="scatter-marks__emitters">
        <AnimatePresence initial={false}>
          {emitters.map((c) => (
            <ScatterDot
              key={c.iso}
              c={c}
              hoveredIso={hoveredIso}
              r={EMITTER_R}
              variant="emitter"
              transition={move}
            />
          ))}
        </AnimatePresence>
      </g>
      <g className="scatter-marks__pacific">
        <AnimatePresence initial={false}>
          {pacific.map((c) => (
            <ScatterDot
              key={c.iso}
              c={c}
              hoveredIso={hoveredIso}
              r={PACIFIC_R}
              variant="pacific"
              transition={move}
            />
          ))}
        </AnimatePresence>
      </g>

      {showFair ? (
        <FairMark y={fairY} width={width} height={height} label="ASR = 1" />
      ) : null}
      {showHi ? (
        <FairMark y={hiY} width={width} height={height} label="ASR = 100" kind="hi" />
      ) : null}

      {hovered ? (
        <motion.circle
          className="scatter-dot__halo"
          r={RADIUS_BY_GROUP[hovered.group] + 4.5}
          initial={false}
          animate={{ cx: hovered.cx, cy: hovered.cy }}
          transition={move}
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

/** Horizontal ASR cutoff. ASR = 100 is omitted by the caller when this
 *  method never reaches it: grandfathering and egalitarian stay below. */
function FairMark({ y: py, width, height, label, kind = 'one' }) {
  const hi = kind === 'hi'
  const labelY = py < 14 ? Math.min(py + 12, height - 2) : py - 5
  return (
    <g
      className={`scatter-marks__fair${hi ? ' scatter-marks__fair--hi' : ''}`}
      pointerEvents="none"
    >
      <line
        x1={0}
        x2={width}
        y1={py}
        y2={py}
        strokeLinecap="butt"
        strokeDasharray={hi ? '8 6' : '10 8'}
      />
      <text x={width} y={labelY} textAnchor="end">{label}</text>
    </g>
  )
}

function ScatterDot({ c, hoveredIso, r, variant, transition }) {
  return (
    <motion.circle
      className={`scatter-dot scatter-dot--${variant}${c.iso === hoveredIso ? ' is-hovered' : ''}`}
      r={r}
      initial={{ opacity: 0, cx: c.cx, cy: c.cy }}
      animate={{ opacity: 1, cx: c.cx, cy: c.cy }}
      exit={{ opacity: 0 }}
      transition={transition}
    />
  )
}

/**
 * Shared domains, so the three rule panels can be read against each other.
 *
 * How the x extent becomes a drawn domain belongs to the variable, not here:
 * an index scoring the world inside 0.26-0.66 wants padding rather than a zero
 * anchor, GDP per capita wants a floor, and the two axes with real zeros on
 * them want to start at zero.
 */
export function scatterDomains(countries, xVarId) {
  const xs = countries.map((c) => xOf(c, xVarId)).filter((v) => v != null)
  const asrs = countries.flatMap((c) => (
    Object.values(c.asr ?? {}).filter((v) => Number.isFinite(v))
  ))

  if (!xs.length || !asrs.length) return { xDomain: [0, 1], yDomain: [0.1, 10] }

  const [x0, x1] = extent(xs)

  return {
    xDomain: X_VAR_BY_ID[xVarId].domain(x0, x1),
    yDomain: [min(asrs) * 0.85, max(asrs) * 1.15],
  }
}
