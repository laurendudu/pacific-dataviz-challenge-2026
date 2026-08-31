import { useId, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { geoAzimuthalEqualArea, geoCentroid, geoOrthographic, geoPath } from 'd3-geo'
import { scaleLinear, scaleLog } from 'd3-scale'
import { feature as topoFeature } from 'topojson-client'
import { format } from 'd3-format'
import land110 from 'world-atlas/land-110m.json'
import { findCountryFeature } from '../../data/asr'

const WORLD_LAND = topoFeature(land110, land110.objects.land)

/**
 * Pixels from the well edge out to the red ASR = 1 ring. On the continuous
 * log scale this is log(1 / floor) decades, not a linear 0→1 span.
 */
export const ASR_RING_GAP = 20

/** Lowest ASR the radius can show. Below this the wash sits on the well edge.
 *  Marshall Islands (~0.12) stays a few pixels out; log(0) is undefined. */
export const ASR_FLOOR = 0.05

/**
 * Pixel growth from the well edge. Log: domain floor→1 maps onto `ringGap`
 * so the red ring is ASR 1; D3 extrapolates past 1. Linear: domain 0→1 onto
 * the same gap, so 1 ASR unit = `ringGap` px. Built per call; `asrRadii`
 * only reads it.
 */
function radiusScale(gap, floor, scale = 'log') {
  if (scale === 'linear') return scaleLinear().domain([0, 1]).range([0, gap])
  return scaleLog().domain([floor, 1]).range([0, gap])
}

const formatAsr = format('.2~f')

/** Spare tooltip copy: name, ASR, and which side of the ring. */
export function asrHoverCopy({ name, asr, hideFill = false }) {
  const asrLabel = !hideFill && Number.isFinite(asr) ? formatAsr(asr) : null
  let status = null
  if (asrLabel != null) {
    status = asr > 1
      ? 'past the fair share'
      : asr < 1
        ? 'within the fair share'
        : 'exactly the fair share'
  }
  return { name, asrLabel, status }
}

/** HTML tooltip, positioned by the parent against its box. Matches the
 *  scatter / ranking / map voice: paper, hairline, no chrome. */
export function AsrTooltip({ tip }) {
  if (!tip) return null
  return (
    <div
      className="asr-tooltip"
      style={{ left: tip.x, top: tip.y }}
      role="status"
    >
      <strong>{tip.name}</strong>
      {tip.asrLabel ? (
        <span>
          ASR {tip.asrLabel}
          {tip.status ? ` · ${tip.status}` : ''}
        </span>
      ) : null}
    </div>
  )
}

/** Mint: ASR ≤ 1. Gold: ASR > 1. Exported so legends stay on the same inks.
 *  These mirror --asr-* in tokens.css. Change both or the legends drift.
 *  Bright enough to survive the 0.26 disc wash; the -INK twins carry the
 *  legend words, which the pop fills are far too light to do. */
export const ASR_FILL_UNDER = '#23c29a'
export const ASR_FILL_OVER = '#ffb020'
export const ASR_INK_UNDER = '#0d8268'
export const ASR_INK_OVER = '#a36600'
const FILL_UNDER = ASR_FILL_UNDER
const FILL_OVER = ASR_FILL_OVER
const LAND_FILL = '#2c2545'
const LAND_STROKE = '#2c2545'

/**
 * Radii for the three concentric marks.
 *
 * Log₁₀ (default): from the well edge, radius is log(asr / floor) / log(1 /
 * floor) times `ringGap`. ASR = floor sits on the well; ASR = 1 lands on the
 * red dashed ring; everything past 1 continues on the same log: Palau at
 * ~100 is two decades past the ring, not ninety-nine linear pixels out.
 *
 * Linear: 1 ASR unit = `ringGap` px past the well, for every territory.
 * ASR 1 is `ringGap` px out; ASR 2 is 2 × `ringGap`; no per-country rescale.
 *
 * The ring is a labelled mark, not a scale break. Read a disc as under or
 * over that mark, not as a ratio of areas.
 *
 * `rAsr = rInner + grown`, never `rOne * asr`. D3 produces the grown length.
 */
export function asrRadii(size, asr, ringGap = ASR_RING_GAP, floor = ASR_FLOOR, scale = 'log') {
  const gap = Number.isFinite(ringGap) ? ringGap : ASR_RING_GAP
  const lo = Number.isFinite(floor) && floor > 0 ? floor : ASR_FLOOR
  const linear = scale === 'linear'
  const rInner = size / 2
  const rOne = rInner + gap
  const ratio = Number.isFinite(asr) ? Math.max(0, asr) : 0
  const grown = linear
    ? radiusScale(gap, lo, 'linear')(ratio)
    : (ratio <= lo ? 0 : radiusScale(gap, lo, 'log')(ratio))
  return { rInner, rOne, rAsr: rInner + grown }
}

function landPathString(feature, cx, cy, rInner) {
  if (!feature?.geometry) return null
  const pad = Math.max(3, rInner * 0.06)
  const centroid = geoCentroid(feature)
  const projection = geoAzimuthalEqualArea()
    .rotate([-centroid[0], -centroid[1]])
    .clipAngle(90)
    .fitExtent(
      [
        [cx - rInner + pad, cy - rInner + pad],
        [cx + rInner - pad, cy + rInner - pad],
      ],
      feature,
    )
  return geoPath(projection)(feature)
}

/** Orthographic land, clipped to the well: Earth, not a stand-in country. */
function worldLandPath(cx, cy, rInner) {
  if (!WORLD_LAND) return null
  const pad = Math.max(2, rInner * 0.06)
  const projection = geoOrthographic()
    .translate([cx, cy])
    .scale(rInner - pad)
    .clipAngle(90)
    .rotate([-20, -12])
  return geoPath(projection)(WORLD_LAND)
}

/**
 * Concentric ASR marks at an SVG point. D3 only produces the land `d` and
 * the radii; every mark is JSX. Used by `AsrCountry` and the Pacific map.
 *
 * The inner disc is the country well: paper, no shade. A red dashed ring
 * `ringGap` px out is ASR = 1, a mark on a continuous log₁₀ radius from
 * `ASR_FLOOR`. The emission wash is a ring from the well edge. `hideFill`
 * keeps the 1-ring and drops the wash.
 *
 * A transparent hit circle covers `max(rAsr, rOne)` so the well is not the
 * only target when the wash is a thin ring. Hover itself is JSX in the
 * parent. This only reports pointer events.
 */
export function AsrDisc({
  cx,
  cy,
  size,
  asr,
  ringGap = ASR_RING_GAP,
  scale = 'log',
  land = true,
  iso,
  name,
  feature,
  clipRadius,
  hideShare = false,
  hideFill = false,
  onHover,
  onLeave,
}) {
  const reduceMotion = useReducedMotion()
  const rawId = useId()
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, '')
  const wellClipId = `asr-well-${uid}`
  const frameClipId = `asr-frame-${uid}`

  const feat = land === true
    ? (feature ?? findCountryFeature(iso) ?? findCountryFeature(name))
    : null
  const ratio = Number(asr)

  const geom = useMemo(() => {
    const { rInner, rOne, rAsr } = asrRadii(size, ratio, ringGap, ASR_FLOOR, scale)
    const d = land === 'world'
      ? worldLandPath(cx, cy, rInner)
      : landPathString(feat, cx, cy, rInner)
    return { rInner, rOne, rAsr, d }
  }, [feat, land, size, ratio, ringGap, scale, cx, cy])

  const [hovered, setHovered] = useState(false)
  const over = ratio > 1
  const showFill = !hideShare && !hideFill
  const showRing = !hideShare
  /* Stroke is centred on the path, so this radius + width lands exactly
     on the well edge (inner) and rAsr (outer). */
  const ringR = (geom.rInner + geom.rAsr) / 2
  const ringW = Math.max(0, geom.rAsr - geom.rInner)
  const hitR = hideShare ? geom.rInner : Math.max(geom.rAsr, geom.rOne)

  const handleEnter = (event) => {
    setHovered(true)
    onHover?.(event)
  }
  const handleMove = (event) => {
    onHover?.(event)
  }
  const handleLeave = () => {
    setHovered(false)
    onLeave?.()
  }
  const shareTransition = reduceMotion
    ? { duration: 0 }
    : {
        r: { type: 'spring', visualDuration: 0.45, bounce: 0.12 },
        strokeWidth: { type: 'spring', visualDuration: 0.45, bounce: 0.12 },
        stroke: { duration: 0.28, ease: [0.4, 0, 0.2, 1] },
      }

  return (
    <g className={`asr-disc${hovered ? ' is-hovered' : ''}`}>
      <defs>
        <clipPath id={wellClipId}>
          <circle cx={cx} cy={cy} r={geom.rInner} />
        </clipPath>
        {clipRadius != null ? (
          <clipPath id={frameClipId}>
            <circle cx={cx} cy={cy} r={clipRadius} />
          </clipPath>
        ) : null}
      </defs>

      <AnimatePresence initial={false}>
        {showFill ? (
          <motion.circle
            key="share"
            className="asr-country__share"
            cx={cx}
            cy={cy}
            fill="none"
            initial={reduceMotion ? false : { r: geom.rInner, strokeWidth: 0, stroke: FILL_UNDER }}
            animate={{
              r: ringR,
              strokeWidth: ringW,
              stroke: over ? FILL_OVER : FILL_UNDER,
            }}
            exit={reduceMotion ? { strokeOpacity: 0 } : { r: geom.rInner, strokeWidth: 0 }}
            transition={shareTransition}
            clipPath={clipRadius != null ? `url(#${frameClipId})` : undefined}
          />
        ) : null}
      </AnimatePresence>

      {/* Well sits on top of the wash so gold/mint never paint the country core.
          The shade is only the ring from this black stroke outward. */}
      <circle
        className="asr-country__well"
        cx={cx}
        cy={cy}
        r={geom.rInner}
      />

      {geom.d ? (
        <path
          className="asr-country__land"
          d={geom.d}
          clipPath={`url(#${wellClipId})`}
          fill={LAND_FILL}
          stroke={LAND_STROKE}
        />
      ) : null}

      <circle
        className="asr-country__well-stroke"
        cx={cx}
        cy={cy}
        r={geom.rInner}
      />

      {showRing ? (
        <motion.circle
          className="asr-country__one"
          cx={cx}
          cy={cy}
          initial={false}
          animate={{ r: geom.rOne }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { r: { type: 'spring', visualDuration: 0.45, bounce: 0.12 } }
          }
        />
      ) : null}

      <circle
        className="asr-disc__hit"
        cx={cx}
        cy={cy}
        r={hitR}
        onMouseEnter={handleEnter}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
      />
    </g>
  )
}

/**
 * One country's allocated-share ratio, drawn as concentric circles.
 *
 * The inner disc is the country well (land clipped to the circle, outlined
 * by a black stroke): no emission colour inside it. A red dashed ring
 * `ringGap` px out is ASR = 1, a mark on a continuous log₁₀ radius from
 * `ASR_FLOOR`. The wash is a ring from the well edge.
 *
 * D3 only produces the land `d` string and the radii. Every mark is JSX.
 *
 * @param {object} props
 * @param {string} props.name
 * @param {number} props.asr            ratio; 1 = the red ring
 * @param {object} [props.feature]      GeoJSON Feature; else looked up via `iso`
 * @param {string} [props.iso]          ISO 3166-1 alpha-3 or numeric
 * @param {number} [props.size=126]     inner-circle diameter, px
 * @param {number} [props.ringGap=20]   px from well edge to the ASR = 1 ring
 * @param {number} [props.frameRadius]  SVG radius; defaults to max(rAsr, rOne)
 * @param {'cell'|'shared'} [props.fit='cell']
 *   `cell` sizes/clips the frame to the disc (fair-share scene).
 *   `shared` keeps a 1-ring viewBox and lets rAsr overflow: same pixel
 *   scale across a grid.
 * @param {boolean} [props.caption=true]
 * @param {boolean|'world'} [props.land=true]
 *   `true` looks up a country outline. `false` is a well with no land.
 *   `'world'` draws an orthographic Earth, not a fake ISO country.
 * @param {boolean} [props.hideFill=false]  wells + ASR = 1 ring, no shade
 */
export function AsrCountry({
  name,
  asr,
  feature,
  iso,
  size = 126,
  ringGap = ASR_RING_GAP,
  frameRadius,
  fit = 'cell',
  caption = true,
  land = true,
  hideFill = false,
}) {
  const boxRef = useRef(null)
  const [tip, setTip] = useState(null)
  const shared = fit === 'shared'
  const ratio = Number(asr)
  const asrLabel = Number.isFinite(ratio) ? formatAsr(ratio) : '–'
  const showAsr = !hideFill && Number.isFinite(ratio)
  const title = showAsr ? `${name}, allocated-share ratio ${asrLabel}` : name
  const copy = asrHoverCopy({ name, asr: ratio, hideFill })

  const frame = useMemo(() => {
    const { rOne, rAsr } = asrRadii(size, ratio, ringGap)
    const rFrame = shared
      ? (frameRadius ?? rOne)
      : (frameRadius ?? Math.max(rAsr, rOne))
    return { rFrame, svg: 2 * rFrame }
  }, [size, ratio, ringGap, frameRadius, shared])

  const moveTip = (event) => {
    const box = boxRef.current?.getBoundingClientRect()
    if (!box) return
    setTip({
      ...copy,
      x: event.clientX - box.left,
      y: event.clientY - box.top,
    })
  }

  return (
    <figure
      ref={boxRef}
      className={`asr-country${shared ? ' asr-country--shared' : ''}${tip ? ' is-hovered' : ''}`}
    >
      <svg
        className="asr-country__svg"
        width={frame.svg}
        height={frame.svg}
        viewBox={`0 0 ${frame.svg} ${frame.svg}`}
        role="img"
        aria-label={title}
      >
        <title>{title}</title>
        <AsrDisc
          cx={frame.rFrame}
          cy={frame.rFrame}
          size={size}
          asr={asr}
          ringGap={ringGap}
          land={land}
          iso={iso}
          name={name}
          feature={feature}
          clipRadius={shared ? undefined : frame.rFrame}
          hideFill={hideFill}
          onHover={moveTip}
          onLeave={() => setTip(null)}
        />
      </svg>

      {caption ? (
        <figcaption className="asr-country__caption">
          <span className="asr-country__name">{name}</span>
          {showAsr ? (
            <span className="asr-country__value">ASR {asrLabel}</span>
          ) : null}
        </figcaption>
      ) : null}

      <AsrTooltip tip={tip} />
    </figure>
  )
}
