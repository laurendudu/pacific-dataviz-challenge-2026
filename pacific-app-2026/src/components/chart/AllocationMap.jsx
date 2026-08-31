import { useMemo, useState } from 'react'
import { geoCentroid, geoEquirectangular, geoGraticule10, geoPath } from 'd3-geo'
import { feature as topoFeature } from 'topojson-client'
import land110 from 'world-atlas/land-110m.json'
import { PACIFIC_TERRITORIES } from '../../data/allocation'
import { findCountryFeature } from '../../data/asr'
import { AsrDisc, AsrTooltip, asrHoverCopy, asrRadii } from './AsrCountry'
import { useChartDimensions } from './useChartDimensions'

/** Well diameter, px. The red ASR = 1 ring sits `ringGap` out from this. */
const SIZE = 28
/** Pixel gap from the well edge to the ASR = 1 ring on the continuous log. */
export const MAP_ASR_RING_GAP = 20
/** Linear: 1 ASR unit = 5 px past the well, so ASR 1 is 5 px out. */
export const MAP_ASR_LINEAR_GAP = 5

const WORLD_LAND = topoFeature(land110, land110.objects.land)
const NO_MARGIN = { top: 0, right: 0, bottom: 0, left: 0 }
const PACIFIC_ROTATE = [-173, 7]
const PAD = 56
const LABEL_GAP = 8
const LABEL_LINE = 7.4

function wrapPlaceName(name) {
  const words = name.split(' ')
  if (words.length <= 1) return [name]
  if (words.length === 2 && name.length <= 14) return [name]
  const mid = Math.ceil(words.length / 2)
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
}

function ringGapFor(scale) {
  return scale === 'linear' ? MAP_ASR_LINEAR_GAP : MAP_ASR_RING_GAP
}

/** Centroids and island paths. Independent of ASR so the map never re-fits. */
function placeIslands(projection, path) {
  const marks = []
  for (const place of PACIFIC_TERRITORIES) {
    const feat = findCountryFeature(place.iso) ?? findCountryFeature(place.name)
    if (!feat?.geometry) continue
    const pt = projection(geoCentroid(feat))
    if (!pt || !Number.isFinite(pt[0]) || !Number.isFinite(pt[1])) continue
    marks.push({
      iso: place.iso,
      name: place.name,
      lines: wrapPlaceName(place.name),
      x: pt[0],
      y: pt[1],
      feat,
      d: path(feat),
    })
  }
  return marks
}

/** Labels sit on the ASR = 1 ring, which does not move when the fill does. */
function placeLabels(marks, rOne) {
  if (!marks.length) return marks
  const mx = marks.reduce((s, m) => s + m.x, 0) / marks.length
  const my = marks.reduce((s, m) => s + m.y, 0) / marks.length
  return marks.map((m) => {
    const dx = m.x - mx
    const dy = m.y - my
    const hx = dx < 0 ? -1 : 1
    return {
      ...m,
      lx: m.x + hx * (rOne + LABEL_GAP),
      ly: m.y + (dy / (Math.hypot(dx, dy) || 1)) * (rOne * 0.28),
      anchor: hx < 0 ? 'end' : 'start',
    }
  })
}

function withAsr(marks, values, loaded, scale) {
  const ringGap = ringGapFor(scale)
  return marks.map((m) => {
    const raw = values?.get(m.iso)
    const asr = raw == null ? undefined : Number(raw)
    const missing = loaded && !Number.isFinite(asr)
    const { rInner, rOne, rAsr } = asrRadii(
      SIZE,
      missing ? 0 : asr,
      ringGap,
      undefined,
      scale,
    )
    return { ...m, asr, missing, rInner, rOne, rAsr }
  })
}

/**
 * Pacific-centred map. D3 only projects; every mark is JSX.
 * Each territory is the same ASR disc as the grid: an empty well (stroke
 * and a translucent core so the map shows through), shade, and a red dashed
 * ring at ASR = 1. `hideFill` keeps the ring and drops the shade.
 * `scale` is `log` (default) or `linear`; every disc shares that mapping.
 */
export function AllocationMap({
  values,
  loaded,
  principle,
  year,
  hideFill = false,
  scale = 'log',
}) {
  const [ref, dms] = useChartDimensions(NO_MARGIN)
  const [tip, setTip] = useState(null)
  const width = dms.width
  const height = dms.height
  const ringGap = ringGapFor(scale)

  const base = useMemo(() => {
    if (!width || !height) return null

    const islands = PACIFIC_TERRITORIES
      .map((place) => findCountryFeature(place.iso) ?? findCountryFeature(place.name))
      .filter((feat) => feat?.geometry)

    const projection = geoEquirectangular()
      .rotate(PACIFIC_ROTATE)
      .precision(0.4)
      .fitExtent(
        [[PAD, PAD], [width - PAD, height - PAD]],
        { type: 'FeatureCollection', features: islands },
      )
    const path = geoPath(projection)
    const { rOne } = asrRadii(SIZE, 1, ringGap, undefined, scale)
    return {
      landD: path(WORLD_LAND),
      graticuleD: path(geoGraticule10()),
      islands: placeLabels(placeIslands(projection, path), rOne),
    }
  }, [width, height, ringGap, scale])

  const geom = useMemo(() => {
    if (!base) return null
    const marks = withAsr(base.islands, values, loaded, scale)
    const stacked = [...marks].sort((a, b) => b.rAsr - a.rAsr)
    return {
      landD: base.landD,
      graticuleD: base.graticuleD,
      marks,
      stacked,
    }
  }, [base, values, loaded, scale])

  const moveTip = (event, mark) => {
    const box = ref.current?.getBoundingClientRect()
    if (!box) return
    setTip({
      ...asrHoverCopy({ name: mark.name, asr: mark.asr, hideFill }),
      x: event.clientX - box.left,
      y: event.clientY - box.top,
    })
  }

  const title = principle
    ? `${principle.label ?? principle.title} Absolute Sustainability Ratios for Pacific territories, ${year}`
    : `Pacific territories and the ASR = 1 ring, ${year}`

  return (
    <div ref={ref} className="alloc-map">
      {width > 0 && height > 0 && geom ? (
        <svg
          className="alloc-map__svg"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={title}
        >
          <title>{title}</title>
          {geom.graticuleD ? (
            <path
              className="alloc-map__graticule"
              d={geom.graticuleD}
              fill="none"
            />
          ) : null}
          {geom.landD ? (
            <path className="alloc-map__land" d={geom.landD} />
          ) : null}
          {geom.marks.map((m) => (
            m.d ? (
              <path
                key={`land-${m.iso}`}
                className="alloc-map__island"
                d={m.d}
              />
            ) : null
          ))}

          <g className="alloc-map__zones">
            {geom.stacked.map((m) => {
              const copy = asrHoverCopy({ name: m.name, asr: m.asr, hideFill })
              const title = copy.asrLabel
                ? `${m.name}, allocated-share ratio ${copy.asrLabel}`
                : m.name
              return (
                <g
                  key={m.iso}
                  className={`alloc-map__place${m.missing ? ' is-missing' : ''}`}
                >
                  <AsrDisc
                    cx={m.x}
                    cy={m.y}
                    size={SIZE}
                    asr={m.missing ? 0 : m.asr}
                    ringGap={ringGap}
                    scale={scale}
                    land={false}
                    iso={m.iso}
                    name={m.name}
                    hideShare={m.missing}
                    hideFill={hideFill}
                    onHover={(e) => moveTip(e, m)}
                    onLeave={() => setTip(null)}
                  />
                  <title>{title}</title>
                </g>
              )
            })}
          </g>

          <g className="alloc-map__labels" pointerEvents="none">
            {geom.marks.map((m) => (
              <text
                key={`label-${m.iso}`}
                className={`alloc-map__label${m.missing ? ' is-missing' : ''}`}
                textAnchor={m.anchor}
                x={m.lx}
                y={m.ly - (m.lines.length - 1) * LABEL_LINE}
              >
                {m.lines.map((line, i) => (
                  <tspan key={line} x={m.lx} dy={i === 0 ? '0.35em' : '1.2em'}>
                    {line}
                  </tspan>
                ))}
              </text>
            ))}
          </g>
        </svg>
      ) : null}

      <AsrTooltip tip={tip} />
    </div>
  )
}
