import { useId, useMemo } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { geoAzimuthalEqualArea, geoCentroid, geoOrthographic, geoPath } from 'd3-geo'
import { feature as topoFeature } from 'topojson-client'
import { format } from 'd3-format'
import land110 from 'world-atlas/land-110m.json'
import { findCountryFeature } from '../../data/asr'

const WORLD_LAND = topoFeature(land110, land110.objects.land)

/** Pixel gap from the country well to the red ASR = 1 ring. */
export const ASR_RING_GAP = 1

const formatAsr = format('.2~f')

/** Sage: ASR ≤ 1. Gold: ASR > 1. Exported so legends stay on the same inks.
 *  Tuned for the 0.26 disc wash on white — enough chroma to stay sage / brass. */
export const ASR_FILL_UNDER = '#4e8b6e'
export const ASR_FILL_OVER = '#d4a530'
const FILL_UNDER = ASR_FILL_UNDER
const FILL_OVER = ASR_FILL_OVER
const LAND_FILL = '#12171c'
const LAND_STROKE = '#12171c'

/**
 * Radii for the three concentric marks. The ring gap is the unit:
 * shade grows from the country outline, and ASR 1 lands on the red ring.
 * `rAsr = rInner + gap * asr` — never `rOne * asr`. Default gap is 1px.
 */
export function asrRadii(size, asr, ringGap = ASR_RING_GAP) {
  const gap = Number.isFinite(ringGap) ? ringGap : ASR_RING_GAP
  const rInner = size / 2
  const rOne = rInner + gap
  const ratio = Number.isFinite(asr) ? Math.max(0, asr) : 0
  return { rInner, rOne, rAsr: rInner + gap * ratio }
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

/** Orthographic land, clipped to the well — Earth, not a stand-in country. */
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
 * The inner disc is the country well. A red dashed ring `ringGap` px out is
 * ASR = 1. The shade grows by `ringGap` px per unit of ASR.
 */
export function AsrDisc({
  cx,
  cy,
  size,
  asr,
  ringGap = ASR_RING_GAP,
  land = true,
  iso,
  name,
  feature,
  clipRadius,
  hideShare = false,
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
    const { rInner, rOne, rAsr } = asrRadii(size, ratio, ringGap)
    const d = land === 'world'
      ? worldLandPath(cx, cy, rInner)
      : landPathString(feat, cx, cy, rInner)
    return { rInner, rOne, rAsr, d }
  }, [feat, land, size, ratio, ringGap, cx, cy])

  const over = ratio > 1
  const shareTransition = reduceMotion
    ? { duration: 0 }
    : {
        r: { type: 'spring', visualDuration: 0.45, bounce: 0.12 },
        fill: { duration: 0.28, ease: [0.4, 0, 0.2, 1] },
      }

  return (
    <g className="asr-disc">
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

      <circle
        className="asr-country__well"
        cx={cx}
        cy={cy}
        r={geom.rInner}
      />

      {hideShare ? null : (
        <motion.circle
          className="asr-country__share"
          cx={cx}
          cy={cy}
          initial={false}
          animate={{
            r: geom.rAsr,
            fill: over ? FILL_OVER : FILL_UNDER,
          }}
          transition={shareTransition}
          clipPath={clipRadius != null ? `url(#${frameClipId})` : undefined}
        />
      )}

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

      {hideShare ? null : (
        <circle
          className="asr-country__one"
          cx={cx}
          cy={cy}
          r={geom.rOne}
        />
      )}
    </g>
  )
}

/**
 * One country's allocated-share ratio, drawn as concentric circles.
 *
 * The inner disc is the country well (land clipped to the circle, outlined
 * by a black stroke). A red dashed ring `ringGap` px out is ASR = 1. The
 * shade starts after that well and grows by `ringGap` px per unit of ASR,
 * so 1.0 lands on the red ring.
 *
 * D3 only produces the land `d` string and the radii. Every mark is JSX.
 *
 * @param {object} props
 * @param {string} props.name
 * @param {number} props.asr            ratio; 1 = the red ring
 * @param {object} [props.feature]      GeoJSON Feature; else looked up via `iso`
 * @param {string} [props.iso]          ISO 3166-1 alpha-3 or numeric
 * @param {number} [props.size=126]     inner-circle diameter, px
 * @param {number} [props.ringGap=1]    px from well edge to the ASR = 1 ring
 * @param {number} [props.frameRadius]  SVG radius; defaults to max(rAsr, rOne)
 * @param {'cell'|'shared'} [props.fit='cell']
 *   `cell` sizes/clips the frame to the disc (fair-share scene).
 *   `shared` keeps a 1-ring viewBox and lets rAsr overflow — same pixel
 *   scale across a grid.
 * @param {boolean} [props.caption=true]
 * @param {boolean|'world'} [props.land=true]
 *   `true` looks up a country outline. `false` is a well with no land.
 *   `'world'` draws an orthographic Earth — not a fake ISO country.
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
}) {
  const shared = fit === 'shared'
  const ratio = Number(asr)
  const asrLabel = Number.isFinite(ratio) ? formatAsr(ratio) : '—'
  const title = `${name}, allocated-share ratio ${asrLabel}`

  const frame = useMemo(() => {
    const { rOne, rAsr } = asrRadii(size, ratio, ringGap)
    const rFrame = shared
      ? (frameRadius ?? rOne)
      : (frameRadius ?? Math.max(rAsr, rOne))
    return { rFrame, svg: 2 * rFrame }
  }, [size, ratio, ringGap, frameRadius, shared])

  return (
    <figure className={`asr-country${shared ? ' asr-country--shared' : ''}`}>
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
        />
      </svg>

      {caption ? (
        <figcaption className="asr-country__caption">
          <span className="asr-country__name">{name}</span>
          <span className="asr-country__value">ASR {asrLabel}</span>
        </figcaption>
      ) : null}
    </figure>
  )
}
