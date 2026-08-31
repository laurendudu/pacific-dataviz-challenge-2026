import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
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
 * The disc is a real one, rendered by the same `AsrDisc` it explains, so the
 * diagram cannot drift from the component. The wash is unrolled from the
 * black well stroke (`ASR_FLOOR`) out to the country's ASR. The country
 * inside the well is the glyph, not a length on the scale. Mint is that
 * stretch to ASR 1; gold is past the red dashed ring.
 *
 * `stage` lets the parent grow the wash: `well` is the well stroke and the
 * 1-ring, `mint` fills to the fair share, `gold` overshoots. `all` is the
 * finished diagram (the default).
 *
 * No D3 beyond `asrRadii` and `scaleLog` ticks; every mark is JSX.
 */

const WELL = 120
const VB_W = 480
const VB_H = 250

/* Disc centre, and the ruler's baseline: both on the same y so the eye
   carries the wash across. The unroll is magnified: the disc keeps the
   real 20px ring gap; the ruler stretches that log so the labels can sit. */
const CX = 96
const CY = 96
const RULER_X = 248
const RULER_MINT = 100
const RULER_RIGHT = VB_W - 56
const BAND_H = 20
const LABEL_Y = 148
const SCALE_Y = CY - BAND_H / 2 - 22

/* Log axis above the unrolled wash. 1 is the red ring. */
const SCALE_MARKS = [0.1, 1, 5]

const FADE = {
  duration: 0.38,
  ease: [0.4, 0, 0.2, 1],
}

const GROW = {
  type: 'spring',
  visualDuration: 0.45,
  bounce: 0.12,
}

export function AsrScaleGuide({
  name = 'World',
  iso,
  land = 'world',
  asr = 6.4,
  ringGap = ASR_RING_GAP,
  floor = ASR_FLOOR,
  stage = 'all',
  className,
}) {
  const reduceMotion = useReducedMotion()
  const boxRef = useRef(null)
  const [tip, setTip] = useState(null)
  const hideFill = stage === 'well'
  const showMint = stage === 'mint' || stage === 'gold' || stage === 'all'
  const showGold = stage === 'gold' || stage === 'all'
  const copy = asrHoverCopy({ name, asr, hideFill })
  const fade = reduceMotion ? { duration: 0 } : FADE
  const grow = reduceMotion ? { duration: 0 } : GROW

  const g = useMemo(() => {
    const lo = Number.isFinite(floor) && floor > 0 ? floor : ASR_FLOOR
    const { rInner, rOne, rAsr } = asrRadii(WELL, asr, ringGap, lo)
    const origin = RULER_X
    const mintPx = rOne - rInner
    const washPx = Math.max(mintPx, rAsr - rInner)
    const oneEnd = origin + RULER_MINT
    const asrEnd = Math.min(
      RULER_RIGHT,
      origin + (mintPx <= 0 ? 0 : RULER_MINT * (washPx / mintPx)),
    )
    const along = scaleLog().domain([lo, 1]).range([origin, oneEnd])
    const logTicks = SCALE_MARKS
      .map((t) => ({ t, x: t === 1 ? oneEnd : along(t) }))
      .filter(({ x }) => Number.isFinite(x) && x >= origin - 0.5 && x <= asrEnd + 0.5)
    return {
      rInner,
      rOne,
      rAsr,
      origin,
      oneEnd,
      asrEnd,
      logTicks,
      lo,
    }
  }, [asr, ringGap, floor])

  const top = CY - BAND_H / 2
  const bottom = CY + BAND_H / 2
  const asrLabel = round(asr)
  const floorLabel = g.lo < 0.1 ? g.lo.toString() : round(g.lo)
  const mintW = g.oneEnd - g.origin
  const goldW = Math.max(0, g.asrEnd - g.oneEnd)
  const washW = hideFill ? mintW : showGold ? mintW + goldW : mintW
  const rOut = hideFill ? g.rInner : g.rAsr

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
      aria-label={ariaForStage({
        stage,
        asrLabel,
        floorLabel,
        ringGap,
        hideFill,
      })}
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
        hideFill={hideFill}
        onHover={moveTip}
        onLeave={() => setTip(null)}
      />

      {/* the wash being measured: black well stroke outward, not through the core */}
      <g className="asr-guide__radius">
        {hideFill ? null : (
          <motion.line
            x1={CX + g.rInner}
            y1={CY}
            y2={CY}
            initial={false}
            animate={{ x2: CX + rOut }}
            transition={grow}
          />
        )}
        <line x1={CX + g.rInner} y1={CY - 5} x2={CX + g.rInner} y2={CY + 5} />
        <line x1={CX + g.rOne} y1={CY - 5} x2={CX + g.rOne} y2={CY + 5} />
        {hideFill ? null : (
          <motion.line
            key="asr-tick"
            y1={CY - 5}
            y2={CY + 5}
            initial={false}
            animate={{ x1: CX + g.rAsr, x2: CX + g.rAsr }}
            transition={grow}
          />
        )}
      </g>

      {hideFill ? null : (
        <text className="asr-guide__subject" x={CX} y={CY + g.rOne + 24} textAnchor="middle">
          {`ASR ${asrLabel}`}
        </text>
      )}

      {/* ── that radius, unrolled ── */}
      <AnimatePresence initial={false}>
        {showMint ? (
          <motion.g
            key="carry"
            className="asr-guide__carry"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0 }}
            transition={fade}
          >
            <line x1={CX + rOut + 8} y1={CY} x2={g.origin - 8} y2={CY} />
            <path d={`M${g.origin - 14},${CY - 4} L${g.origin - 8},${CY} L${g.origin - 14},${CY + 4}`} />
          </motion.g>
        ) : null}
      </AnimatePresence>

      <g className="asr-guide__bands">
        <motion.rect
          x={g.origin}
          y={top}
          height={BAND_H}
          fill={ASR_FILL_UNDER}
          fillOpacity={0.4}
          initial={false}
          animate={{ width: showMint ? mintW : 0 }}
          transition={grow}
        />
        <motion.rect
          x={g.oneEnd}
          y={top}
          height={BAND_H}
          fill={ASR_FILL_OVER}
          fillOpacity={0.4}
          initial={false}
          animate={{ width: showGold ? goldW : 0 }}
          transition={grow}
        />
        <motion.rect
          className="asr-guide__band-frame"
          x={g.origin}
          y={top}
          height={BAND_H}
          initial={false}
          animate={{ width: washW }}
          transition={grow}
        />
      </g>

      <g className="asr-guide__scale">
        <motion.line
          x1={g.origin}
          y1={SCALE_Y}
          y2={SCALE_Y}
          initial={false}
          animate={{ x2: g.origin + washW }}
          transition={grow}
        />
        <text
          className="asr-guide__carry-note"
          x={g.origin - 8}
          y={SCALE_Y}
          dy="0.32em"
          textAnchor="end"
        >
          log₁₀
        </text>
        {g.logTicks
          .filter(({ x }) => x <= g.origin + washW + 0.5)
          .map(({ t, x }) => (
            <g key={t} className="asr-guide__log-tick">
              <line x1={x} y1={SCALE_Y - 4} x2={x} y2={SCALE_Y + 4} />
              <text className="asr-guide__tick" x={x} y={SCALE_Y - 8} textAnchor="middle">
                {tickLabel(t)}
              </text>
            </g>
          ))}
      </g>

      {/* ASR = 1 is a mark on the log, same red dashed stroke as the ring */}
      <line
        className="asr-guide__one"
        x1={g.oneEnd}
        y1={SCALE_Y}
        x2={g.oneEnd}
        y2={bottom + 8}
      />

      {/* ── labels under each shade, no leaders to collide with ── */}
      <g className="asr-guide__brackets">
        <AnimatePresence initial={false}>
          {showMint ? (
            <motion.g
              key="mint-bracket"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fade}
            >
              <Bracket x1={g.origin} x2={g.oneEnd} y={bottom + 10} />
            </motion.g>
          ) : null}
        </AnimatePresence>
        <AnimatePresence initial={false}>
          {showGold ? (
            <motion.g
              key="gold-bracket"
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fade}
            >
              <Bracket x1={g.oneEnd} x2={g.asrEnd} y={bottom + 10} />
            </motion.g>
          ) : null}
        </AnimatePresence>
      </g>

      <g className="asr-guide__label">
        <AnimatePresence initial={false}>
          {showMint ? (
            <motion.text
              key="mint-copy"
              x={mid(g.origin, g.oneEnd)}
              y={LABEL_Y}
              textAnchor="middle"
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={fade}
            >
              <tspan className="asr-guide__key" fill={ASR_INK_UNDER}>within the share</tspan>
            </motion.text>
          ) : null}
        </AnimatePresence>
        <AnimatePresence initial={false}>
          {showGold ? (
            <motion.text
              key="gold-copy"
              x={mid(g.oneEnd, g.asrEnd)}
              y={LABEL_Y}
              textAnchor="middle"
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={fade}
            >
              <tspan className="asr-guide__key" fill={ASR_INK_OVER}>overshoot</tspan>
            </motion.text>
          ) : null}
        </AnimatePresence>
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
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : '–'
}

function tickLabel(t) {
  if (t >= 1) return String(t)
  return String(t)
}

function ariaForStage({ stage, asrLabel, floorLabel, ringGap, hideFill }) {
  if (hideFill || stage === 'well') {
    return `The black well edge to the red dashed ring is ASR 1, one fair share.`
  }
  if (stage === 'mint') {
    return `Mint shade grows from the black well edge to the red dashed ring at ASR 1, still within the fair share.`
  }
  return (
    `How to read an ASR disc. Mint shade runs from the black well edge to the red `
    + `dashed ring at ASR 1; gold is overshoot past that ring. The radius is log₁₀ `
    + `from ${floorLabel}; that ring is ${ringGap} pixels from the well. ASR is ${asrLabel}.`
  )
}
