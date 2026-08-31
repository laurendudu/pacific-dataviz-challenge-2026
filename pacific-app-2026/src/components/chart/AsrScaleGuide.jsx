import { useMemo, useRef, useState } from 'react'
import { scaleLog } from 'd3-scale'
import {
  ASR_FILL_OVER,
  ASR_FILL_UNDER,
  ASR_INK_OVER,
  ASR_INK_UNDER,
  ASR_FLOOR,
  ASR_RING_GAP,
  AsrDisc,
  AsrTooltip,
  asrHoverCopy,
  asrRadii,
} from './AsrCountry'

/**
 * How to read an ASR disc, drawn rather than described.
 *
 * The disc is a real one, rendered by the same `AsrDisc` it explains — so the
 * diagram cannot drift from the component. Its radius is unrolled into a
 * straight ruler: one continuous log₁₀ from the well edge (`ASR_FLOOR`) out
 * to the country's ASR. Mint is still the stretch to ASR 1, gold is still
 * past it; the spacing is log throughout. The red dashed ring is a labelled
 * mark on that log, not a scale break.
 *
 * The worked example is the world itself, at the same overshoot the fraction
 * on the previous page just produced — the first disc the reader ever meets.
 *
 * No D3 beyond `asrRadii` and `scaleLog` ticks; every mark is JSX.
 */

const WELL = 120
const VB_W = 440
const VB_H = 292

/* Disc centre, and the ruler's baseline — both on the same y so the eye
   carries the radius across. */
const CX = 96
const CY = 96
const RULER_X = 248
const BAND_H = 20

/* The two colour-keyed rows under the ruler, and where their text ends. */
const ROW_UNDER = 232
const ROW_OVER = 262
const ROW_END = 306

/* Nice log marks. 1 is the red ring, already labelled. 0.2 is too tight
   against 0.1/0.5 on the mint band, so it is left off. */
const LOG_TICKS = [0.1, 0.5, 2, 5, 10, 20, 50, 100]
const TICK_MIN_PX = 8

export function AsrScaleGuide({
  name = 'World',
  iso,
  land = 'world',
  asr = 6.4,
  ringGap = ASR_RING_GAP,
  floor = ASR_FLOOR,
  className,
}) {
  const boxRef = useRef(null)
  const [tip, setTip] = useState(null)
  const copy = asrHoverCopy({ name, asr })

  const g = useMemo(() => {
    const lo = Number.isFinite(floor) && floor > 0 ? floor : ASR_FLOOR
    const { rInner, rOne, rAsr } = asrRadii(WELL, asr, ringGap, lo)
    const wellEnd = RULER_X + rInner
    const oneEnd = RULER_X + rOne
    const asrEnd = RULER_X + rAsr
    /* Same mapping as `asrRadii`: floor→1 onto the mint band; D3 extrapolates. */
    const along = scaleLog().domain([lo, 1]).range([wellEnd, oneEnd])
    const logTicks = []
    for (const t of LOG_TICKS) {
      if (t <= lo || t >= asr * 0.9) continue
      const x = along(t)
      if (!Number.isFinite(x)) continue
      if (x - wellEnd < TICK_MIN_PX) continue
      const last = logTicks[logTicks.length - 1]
      if (last && x - last.x < TICK_MIN_PX) continue
      logTicks.push({ t, x })
    }
    return {
      rInner,
      rOne,
      rAsr,
      wellEnd,
      oneEnd,
      asrEnd,
      logTicks,
      lo,
    }
  }, [asr, ringGap, floor])

  const top = CY - BAND_H / 2
  const bottom = CY + BAND_H / 2
  const asrLabel = round(asr)
  const subject = land === 'world' ? 'the world' : 'the country'
  const floorLabel = g.lo < 0.1 ? g.lo.toString() : round(g.lo)

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
    <div ref={boxRef} className={className ? `asr-guide ${className}` : 'asr-guide'}>
    <svg
      className="asr-guide__svg"
      width={VB_W}
      height={VB_H}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      role="img"
      aria-label={
        `How to read an ASR disc. ${name} sits in the well; the shade around it is `
        + `mint inside the fair share and gold past it, with a red dashed ring at ASR 1 `
        + `— the share exactly spent. The radius is log₁₀ from ${floorLabel}; that ring `
        + `is ${ringGap} pixels from the well. ${name} is at ${asrLabel}.`
      }
    >
      {/* ── the disc itself, drawn by the component under explanation ── */}
      <AsrDisc
        cx={CX}
        cy={CY}
        size={WELL}
        asr={asr}
        ringGap={ringGap}
        land={land}
        iso={iso}
        name={name}
        onHover={moveTip}
        onLeave={() => setTip(null)}
      />

      {/* the radius being measured, marked on the disc */}
      <g className="asr-guide__radius">
        <line x1={CX} y1={CY} x2={CX + g.rAsr} y2={CY} />
        {[0, g.rInner, g.rOne, g.rAsr].map((r) => (
          <line key={r} x1={CX + r} y1={CY - 5} x2={CX + r} y2={CY + 5} />
        ))}
      </g>

      <text className="asr-guide__subject" x={CX} y={CY + g.rAsr + 24} textAnchor="middle">
        {name} · ASR {asrLabel}
      </text>

      {/* ── that radius, unrolled ── */}
      <g className="asr-guide__carry">
        <line x1={CX + g.rAsr + 8} y1={CY} x2={RULER_X - 8} y2={CY} />
        <path d={`M${RULER_X - 14},${CY - 4} L${RULER_X - 8},${CY} L${RULER_X - 14},${CY + 4}`} />
      </g>
      <text
        className="asr-guide__carry-note"
        x={(CX + g.rAsr + RULER_X) / 2}
        y={CY - 52}
        textAnchor="middle"
      >
        the radius, unrolled
      </text>

      <g className="asr-guide__bands">
        <rect
          className="asr-guide__band asr-guide__band--well"
          x={RULER_X}
          y={top}
          width={g.rInner}
          height={BAND_H}
        />
        <rect
          x={g.wellEnd}
          y={top}
          width={g.rOne - g.rInner}
          height={BAND_H}
          fill={ASR_FILL_UNDER}
          fillOpacity={0.4}
        />
        <rect
          x={g.oneEnd}
          y={top}
          width={Math.max(0, g.rAsr - g.rOne)}
          height={BAND_H}
          fill={ASR_FILL_OVER}
          fillOpacity={0.4}
        />
        <rect
          className="asr-guide__band-frame"
          x={RULER_X}
          y={top}
          width={g.rAsr}
          height={BAND_H}
        />
      </g>

      {/* ASR = 1 is a mark on the log, same red dashed stroke as the ring */}
      <line
        className="asr-guide__one"
        x1={g.oneEnd}
        y1={top - 24}
        x2={g.oneEnd}
        y2={bottom + 8}
      />
      <text className="asr-guide__tick" x={g.oneEnd} y={top - 30} textAnchor="middle">
        ASR 1 — the fair share
      </text>
      {g.logTicks.map(({ t, x }) => (
        <g key={t} className="asr-guide__log-tick">
          <line x1={x} y1={top} x2={x} y2={bottom} />
          <text className="asr-guide__tick" x={x} y={top - 8} textAnchor="middle">
            {tickLabel(t)}
          </text>
        </g>
      ))}
      <text className="asr-guide__tick" x={g.asrEnd + 8} y={CY} dy="0.32em" textAnchor="start">
        ASR {asrLabel}
      </text>

      {/* ── brackets under each zone ── */}
      <g className="asr-guide__brackets">
        <Bracket x1={RULER_X} x2={g.wellEnd} y={bottom + 12} />
        <Bracket x1={g.wellEnd} x2={g.oneEnd} y={bottom + 12} />
        <Bracket x1={g.oneEnd} x2={g.asrEnd} y={bottom + 12} />
      </g>

      <text
        className="asr-guide__label"
        x={(RULER_X + g.wellEnd) / 2}
        y={bottom + 40}
        textAnchor="middle"
      >
        {subject}
      </text>

      <g className="asr-guide__leaders">
        <path d={`M${mid(g.wellEnd, g.oneEnd)},${bottom + 26} V${ROW_UNDER} H${ROW_END + 6}`} />
        <path d={`M${mid(g.oneEnd, g.asrEnd)},${bottom + 26} V${ROW_OVER} H${ROW_END + 6}`} />
      </g>

      <g className="asr-guide__label">
        <text x={ROW_END} y={ROW_UNDER} dy="0.32em" textAnchor="end">
          <tspan className="asr-guide__key" fill={ASR_INK_UNDER}>mint</tspan>
          {' = within the share'}
        </text>
        <text x={ROW_END} y={ROW_OVER} dy="0.32em" textAnchor="end">
          <tspan className="asr-guide__key" fill={ASR_INK_OVER}>gold</tspan>
          {' = overshoot · log₁₀ from '}
          <tspan className="asr-guide__strong">{floorLabel}</tspan>
          {', ring at +'}
          <tspan className="asr-guide__strong">{ringGap} px</tspan>
        </text>
      </g>
    </svg>
    <AsrTooltip tip={tip} />
    </div>
  )
}

/** Squared bracket under a span, with a nub to hang a leader on. */
function Bracket({ x1, x2, y }) {
  const cx = mid(x1, x2)
  return (
    <path d={`M${x1},${y} V${y + 6} H${x2} V${y} M${cx},${y + 6} V${y + 14}`} />
  )
}

function mid(a, b) {
  return (a + b) / 2
}

function round(n) {
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : '—'
}

function tickLabel(t) {
  if (t >= 1) return String(t)
  return String(t)
}
