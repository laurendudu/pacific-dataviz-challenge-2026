import { useEffect, useMemo, useRef, useState } from 'react'
import { format } from 'd3-format'
import { DOT_GAP, layoutSwarm } from './swarmLayout'
import { STATUS_FILL, STATUS_STROKE } from '../../data/planetaryBoundaries'
import {
  COLUMNS,
  SPENT_DOTS,
  BUDGET_DOTS,
  DOT_GT,
  OVERSHOOT,
} from '../../data/ghgBudget2023'
import { PACIFIC_BUDGET_ASK } from '../../data/allocation'
import {
  AsrCountry,
  ASR_FILL_OVER,
  ASR_FILL_UNDER,
  asrRadii,
} from './AsrCountry'

const WORLD_WELL = 78
/** World glyph only — other AsrCountry instances keep the default 2px unit. */
const WORLD_RING_GAP = 5
/** Same one-decimal overshoot the fraction prints as 6.4. */
const WORLD_ASR = Math.round(OVERSHOOT * 10) / 10

const STACKED_AT = 640
/** Prefer translation-only when RMS scale is this close to 1. */
const RIGID_SCALE_EPS = 0.05
const formatGt = format('.2f')
const formatDot = format('.2~f')
const formatRatio = format('.1f')

/**
 * Two unit swarms that scroll-morph into a display fraction:
 * emissions (numerator) over budget (denominator) = ASR.
 * Spent (red) uses a rigid translate + optional uniform scale so the blob
 * slides without interior churn. Budget (green) still lerps per dot.
 * d3-force only computes x/y; React draws every circle.
 */
function formatSharePct(pct) {
  if (pct == null || Number.isNaN(pct)) return '—'
  if (Math.abs(pct) >= 10) return pct.toFixed(1)
  if (Math.abs(pct) >= 1) return pct.toFixed(2)
  return Number(pct).toPrecision(2)
}

export function EmissionSwarms({
  morph = 0,
  colOpacity = 1,
  eqOpacity = 0,
  resultOpacity = 0,
  noteOpacity = 0,
  worldOpacity = 0,
  qNumOpacity = 0,
  qDenOpacity = 0,
  pacificPct = 0.053,
}) {
  const stageRef = useRef(null)
  const plotRefs = useRef({})
  const [frame, setFrame] = useState(null)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const read = () => {
      const origin = stage.getBoundingClientRect()
      const plots = {}
      for (const col of COLUMNS) {
        const el = plotRefs.current[col.id]
        if (!el) continue
        const r = el.getBoundingClientRect()
        plots[col.id] = {
          x: r.left - origin.left,
          y: r.top - origin.top,
          w: r.width,
          h: r.height,
        }
      }
      const next = { width: origin.width, height: origin.height, plots }
      setFrame((prev) => (sameFrame(prev, next) ? prev : next))
    }

    const ro = new ResizeObserver(read)
    ro.observe(stage)
    for (const col of COLUMNS) {
      const el = plotRefs.current[col.id]
      if (el) ro.observe(el)
    }
    read()
    window.addEventListener('resize', read)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', read)
    }
  }, [])

  const geom = useMemo(() => layoutEquation(frame), [frame])
  const stacked = (frame?.width ?? 0) < STACKED_AT
  const ratio = formatRatio(OVERSHOOT)
  const termOpacity = eqOpacity * (1 - Math.max(qNumOpacity, qDenOpacity))
  const pacificShare = formatSharePct(pacificPct)

  return (
    <div ref={stageRef} className="swarms-stage">
      <div className="swarms" aria-hidden={colOpacity < 0.5}>
        {COLUMNS.map((col) => (
          <SwarmColumn
            key={col.id}
            column={col}
            plotRef={(el) => { plotRefs.current[col.id] = el }}
            chromeOpacity={colOpacity}
          />
        ))}
      </div>

      {geom ? (
        <svg
          className="swarms-stage__svg"
          width={frame.width}
          height={frame.height}
          role="img"
          aria-label={
            morph > 0.5
              ? `Absolute Sustainability Ratio: ${formatGt(COLUMNS[1].gt)} gigatonnes emitted over ${formatGt(COLUMNS[0].gt)} gigatonnes of annual budget equals ${ratio}. The Pacific emits ${pacificShare}% of 2023 greenhouse gases.`
              : `Two swarms. Sustainable each year: ${formatGt(COLUMNS[0].gt)} gigatonnes. Emitted in 2023: ${formatGt(COLUMNS[1].gt)} gigatonnes. Each dot is ${formatDot(DOT_GT)} gigatonnes.`
          }
        >
          {geom.nodes.map((n) => {
            const p = morphNode(n, morph, geom.spentRigid)
            return (
              <circle
                key={n.id}
                cx={p.cx}
                cy={p.cy}
                r={geom.radius}
                fill={n.fill}
                stroke={n.stroke}
                strokeWidth="0.6"
              />
            )
          })}

          <line
            className="swarm-eq__bar"
            x1={geom.bar.x1}
            y1={geom.bar.y}
            x2={geom.bar.x2}
            y2={geom.bar.y}
            opacity={eqOpacity}
          />

          <text
            className="swarm-eq__term"
            x={geom.numLabel.x}
            y={geom.numLabel.y}
            textAnchor={geom.numLabel.anchor}
            dominantBaseline={geom.numLabel.baseline}
            opacity={termOpacity}
          >
            emissions
          </text>
          <text
            className="swarm-eq__term"
            x={geom.denLabel.x}
            y={geom.denLabel.y}
            textAnchor={geom.denLabel.anchor}
            dominantBaseline={geom.denLabel.baseline}
            opacity={termOpacity}
          >
            budget
          </text>

          <AskLeader ask={geom.asks.num} opacity={qNumOpacity} />
          <AskLeader ask={geom.asks.den} opacity={qDenOpacity} />

          <text
            className="swarm-eq__equals"
            x={geom.equals.x}
            y={geom.equals.y}
            fontSize={geom.equals.size}
            dominantBaseline="middle"
            opacity={eqOpacity}
          >
            =
          </text>
          <text
            className="swarm-eq__result"
            x={geom.result.x}
            y={geom.result.y}
            fontSize={geom.result.size}
            dominantBaseline="middle"
            opacity={resultOpacity}
          >
            {ratio}
          </text>
        </svg>
      ) : null}

      {geom ? (
        <p
          className={`swarm-eq__note${stacked ? ' swarm-eq__note--stacked' : ''}`}
          style={{
            opacity: noteOpacity,
            left: stacked ? undefined : geom.note.x,
            top: stacked ? undefined : geom.note.y,
          }}
          aria-hidden={noteOpacity < 0.5}
        >
          This is called an ASR, or Absolute Sustainability Ratio
        </p>
      ) : null}

      {geom ? (
        <aside
          className={`swarm-world${stacked ? ' swarm-world--stacked' : ''}`}
          style={{
            opacity: worldOpacity,
            left: geom.world.x,
            top: geom.world.y,
            width: geom.world.w,
          }}
          aria-hidden={worldOpacity < 0.5}
        >
          <AsrCountry
            name="World"
            asr={WORLD_ASR}
            size={WORLD_WELL}
            land="world"
            ringGap={WORLD_RING_GAP}
          />
          <div className="swarm-world__legend">
            <ul className="swarm-world__legend-keys">
              <li>
                <svg
                  className="swarm-world__ring"
                  width="16"
                  height="8"
                  aria-hidden="true"
                >
                  <line x1="0" y1="4" x2="16" y2="4" />
                </svg>
                ASR = 1
              </li>
              <li>
                <span
                  className="swarm-world__swatch"
                  style={{ background: ASR_FILL_UNDER }}
                  aria-hidden="true"
                />
                Sage: inside the allocation
              </li>
              <li>
                <span
                  className="swarm-world__swatch"
                  style={{ background: ASR_FILL_OVER }}
                  aria-hidden="true"
                />
                Gold: past the allocation
              </li>
            </ul>
          </div>
        </aside>
      ) : null}

      {geom ? (
        <AskBox box={geom.asks.num.box} opacity={qNumOpacity}>
          The Pacific emits {pacificShare}% of 2023 GHG emissions
        </AskBox>
      ) : null}
      {geom ? (
        <AskBox
          box={geom.asks.den.box}
          opacity={qDenOpacity}
          variant="den"
        >
          {PACIFIC_BUDGET_ASK}
        </AskBox>
      ) : null}
    </div>
  )
}

function AskBox({ box, opacity, children, variant }) {
  if (opacity <= 0.001) return null
  return (
    <p
      className={`swarm-eq__ask${variant ? ` swarm-eq__ask--${variant}` : ''}`}
      style={{
        opacity,
        left: box.x,
        top: box.y,
        width: box.w,
      }}
      aria-hidden={opacity < 0.5}
    >
      {children}
    </p>
  )
}

function AskLeader({ ask, opacity }) {
  if (opacity <= 0.001) return null
  const { line } = ask
  return (
    <g className="swarm-eq__ask-g" opacity={opacity}>
      <line
        className="swarm-eq__ask-line"
        x1={line.x1}
        y1={line.y1}
        x2={line.x2}
        y2={line.y2}
      />
      <circle
        className="swarm-eq__ask-dot"
        cx={line.x2}
        cy={line.y2}
        r="2.4"
      />
    </g>
  )
}

function SwarmColumn({ column, plotRef, chromeOpacity }) {
  return (
    <figure className="swarm-col">
      <figcaption className="swarm-col__caption" style={{ opacity: chromeOpacity }}>
        <h2 className="swarm-col__title">{column.title}</h2>
        <p className="swarm-col__lead">{column.lead}</p>
      </figcaption>
      <div ref={plotRef} className="swarm-col__plot" />
      <p className="swarm-col__total" style={{ opacity: chromeOpacity }}>
        {formatGt(column.gt)} GtCO₂e
      </p>
    </figure>
  )
}

function layoutEquation(frame) {
  if (!frame?.plots?.budget || !frame.plots.spent) return null
  const { width, height, plots } = frame
  if (width <= 0 || height <= 0) return null
  if (plots.budget.w <= 0 || plots.spent.w <= 0) return null

  const stacked = width < STACKED_AT
  const slots = fractionSlots(width, height, stacked)
  const radius = Math.min(
    slotRadius(SPENT_DOTS, plots.spent.w, plots.spent.h),
    slotRadius(SPENT_DOTS, slots.num.w, slots.num.h),
    slotRadius(BUDGET_DOTS, plots.budget.w, plots.budget.h),
    slotRadius(BUDGET_DOTS, slots.den.w, slots.den.h),
  )
  if (radius <= 0) return null

  const spentCol = layoutSwarm({
    count: SPENT_DOTS,
    width: plots.spent.w,
    height: plots.spent.h,
    radius,
  })
  const budgetCol = layoutSwarm({
    count: BUDGET_DOTS,
    width: plots.budget.w,
    height: plots.budget.h,
    radius,
  })
  const spentFrac = layoutSwarm({
    count: SPENT_DOTS,
    width: slots.num.w,
    height: slots.num.h,
    radius,
  })
  const budgetFrac = layoutSwarm({
    count: BUDGET_DOTS,
    width: slots.den.w,
    height: slots.den.h,
    radius,
  })

  const spentFill = STATUS_FILL.high
  const spentStroke = STATUS_STROKE.high
  const budgetFill = STATUS_FILL.safe
  const budgetStroke = STATUS_STROKE.safe

  const spent0 = spentCol.map((n) => ({
    x: plots.spent.x + n.x,
    y: plots.spent.y + n.y,
  }))
  const spent1 = spentFrac.map((n) => ({
    x: slots.num.x + n.x,
    y: slots.num.y + n.y,
  }))
  const spentRigid = rigidCloud(spent0, spent1, slots.num, radius)

  const nodes = [
    ...spentCol.map((n, i) => ({
      id: `s${n.i}`,
      kind: 'spent',
      fill: spentFill,
      stroke: spentStroke,
      x0: spent0[i].x,
      y0: spent0[i].y,
    })),
    ...budgetCol.map((n, i) => ({
      id: `b${n.i}`,
      kind: 'budget',
      fill: budgetFill,
      stroke: budgetStroke,
      x0: plots.budget.x + n.x,
      y0: plots.budget.y + n.y,
      x1: slots.den.x + budgetFrac[i].x,
      y1: slots.den.y + budgetFrac[i].y,
    })),
  ]

  const num = rigidCloudBounds(spent0, spentRigid, radius)
  const den = cloudBounds(budgetFrac, slots.den.x, slots.den.y, radius)
  const barY = (num.maxY + den.minY) / 2
  const bar = {
    x1: num.minX - 8,
    x2: num.maxX + 8,
    y: barY,
  }
  const eqGap = stacked ? 10 : 14
  const equalsSize = stacked ? Math.min(40, height * 0.11) : Math.min(64, height * 0.12)
  const resultSize = stacked ? Math.min(50, height * 0.14) : Math.min(88, height * 0.18)
  const equalsX = bar.x2 + eqGap
  const resultX = equalsX + equalsSize * 0.78
  /* Gloss sits under the result so the world glyph can take the right. */
  const noteX = stacked ? width / 2 : equalsX
  const noteY = stacked ? height - 4 : barY + resultSize * 0.46

  return {
    radius,
    nodes,
    spentRigid,
    bar,
    equals: { x: equalsX, y: barY, size: equalsSize },
    result: { x: resultX, y: barY, size: resultSize },
    note: { x: noteX, y: noteY },
    numLabel: stacked
      ? { x: (num.minX + num.maxX) / 2, y: num.minY - 10, anchor: 'middle', baseline: 'auto' }
      : { x: Math.max(8, num.minX - 14), y: num.cy, anchor: 'end', baseline: 'middle' },
    denLabel: stacked
      ? { x: (den.minX + den.maxX) / 2, y: den.minY - 10, anchor: 'middle', baseline: 'auto' }
      : { x: Math.max(8, den.minX - 14), y: den.cy, anchor: 'end', baseline: 'middle' },
    world: placeWorldColumn({ slots, barY, stacked }),
    asks: placeAsks({ num, den, width, height, stacked }),
  }
}

function placeWorldColumn({ slots, barY, stacked }) {
  const { rAsr, rOne } = asrRadii(WORLD_WELL, WORLD_ASR, WORLD_RING_GAP)
  const glyphR = Math.max(rAsr, rOne)
  return {
    x: slots.world.x,
    y: stacked ? slots.world.y : barY - glyphR,
    w: slots.world.w,
  }
}

function fractionSlots(width, height, stacked) {
  const worldW = stacked
    ? Math.min(width - 16, 280)
    : Math.min(260, Math.max(200, width * 0.24))
  const left = stacked ? 8 : 72
  const top = stacked ? 16 : 8
  const right = stacked ? 8 : worldW + 8
  const bottom = stacked ? Math.min(176, height * 0.28) : 10
  const fracW = Math.max(48, width - right - left)
  const barY = stacked ? height * 0.42 : height * 0.54
  const gap = stacked ? 16 : 14
  return {
    num: { x: left, y: top, w: fracW, h: Math.max(48, barY - gap - top) },
    den: {
      x: left,
      y: barY + gap,
      w: fracW,
      h: Math.max(40, height - (barY + gap) - bottom),
    },
    world: {
      x: stacked ? Math.max(8, (width - worldW) / 2) : width - worldW - 2,
      y: stacked ? height - bottom + 4 : 0,
      w: worldW,
    },
  }
}

function slotRadius(n, width, height) {
  if (n <= 0 || width <= 0 || height <= 0) return 3
  const pack = Math.min(width, height) * 0.47
  return Math.max(2.2, Math.min(6.5, pack / Math.sqrt(n) - DOT_GAP))
}

function cloudBounds(nodes, ox, oy, radius) {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const n of nodes) {
    const x = ox + n.x
    const y = oy + n.y
    minX = Math.min(minX, x - radius)
    maxX = Math.max(maxX, x + radius)
    minY = Math.min(minY, y - radius)
    maxY = Math.max(maxY, y + radius)
  }
  return { minX, maxX, minY, maxY, cy: (minY + maxY) / 2, cx: (minX + maxX) / 2 }
}

/** Per-dot lerp for budget; rigid translate (+ optional uniform scale) for spent. */
function morphNode(n, t, spentRigid) {
  if (n.kind === 'spent' && spentRigid) {
    const { c0x, c0y, c1x, c1y, scale } = spentRigid
    const s = 1 + t * (scale - 1)
    const cx = c0x + t * (c1x - c0x)
    const cy = c0y + t * (c1y - c0y)
    return {
      cx: cx + (n.x0 - c0x) * s,
      cy: cy + (n.y0 - c0y) * s,
    }
  }
  return {
    cx: n.x0 + t * (n.x1 - n.x0),
    cy: n.y0 + t * (n.y1 - n.y0),
  }
}

function centroid(pts) {
  let sx = 0
  let sy = 0
  for (const p of pts) {
    sx += p.x
    sy += p.y
  }
  const n = pts.length || 1
  return { x: sx / n, y: sy / n }
}

function rmsRadius(pts, c) {
  let acc = 0
  for (const p of pts) {
    const dx = p.x - c.x
    const dy = p.y - c.y
    acc += dx * dx + dy * dy
  }
  return Math.sqrt(acc / (pts.length || 1))
}

/** Shrink uniform scale so the translated cloud stays inside the slot. */
function scaleToFitSlot(pts, c0, c1, desired, slot, radius) {
  let s = desired
  const pad = radius + 0.5
  const xLo = slot.x + pad
  const xHi = slot.x + slot.w - pad
  const yLo = slot.y + pad
  const yHi = slot.y + slot.h - pad
  for (const p of pts) {
    const dx = p.x - c0.x
    const dy = p.y - c0.y
    if (dx > 1e-6) s = Math.min(s, (xHi - c1.x) / dx)
    else if (dx < -1e-6) s = Math.min(s, (xLo - c1.x) / dx)
    if (dy > 1e-6) s = Math.min(s, (yHi - c1.y) / dy)
    else if (dy < -1e-6) s = Math.min(s, (yLo - c1.y) / dy)
  }
  return Math.max(0.05, s)
}

function rigidCloud(fromPts, toPts, slot, radius) {
  const c0 = centroid(fromPts)
  const c1 = centroid(toPts)
  const r0 = rmsRadius(fromPts, c0)
  const r1 = rmsRadius(toPts, c1)
  let scale = r0 > 1e-6 ? r1 / r0 : 1
  if (Math.abs(scale - 1) < RIGID_SCALE_EPS) scale = 1
  scale = scaleToFitSlot(fromPts, c0, c1, scale, slot, radius)
  return { c0x: c0.x, c0y: c0.y, c1x: c1.x, c1y: c1.y, scale }
}

function rigidCloudBounds(fromPts, rigid, radius) {
  const { c0x, c0y, c1x, c1y, scale } = rigid
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const p of fromPts) {
    const x = c1x + (p.x - c0x) * scale
    const y = c1y + (p.y - c0y) * scale
    minX = Math.min(minX, x - radius)
    maxX = Math.max(maxX, x + radius)
    minY = Math.min(minY, y - radius)
    maxY = Math.max(maxY, y + radius)
  }
  return { minX, maxX, minY, maxY, cy: (minY + maxY) / 2, cx: (minX + maxX) / 2 }
}

function placeAsks({ num, den, width, height, stacked }) {
  if (stacked) {
    const w = Math.min(240, Math.max(168, width * 0.44))
    const numBox = { x: Math.max(8, width - w - 8), y: 6, w, h: 72 }
    const denBox = { x: 8, y: Math.max(8, height - 96), w, h: 88 }
    return {
      num: {
        box: numBox,
        line: {
          x1: numBox.x + 16,
          y1: numBox.y + numBox.h,
          x2: num.cx,
          y2: num.minY + 6,
        },
      },
      den: {
        box: denBox,
        line: {
          x1: denBox.x + denBox.w * 0.7,
          y1: denBox.y,
          x2: den.cx,
          y2: den.maxY - 4,
        },
      },
    }
  }

  const leftEdge = Math.min(num.minX, den.minX)
  const w = Math.max(168, Math.min(260, leftEdge - 42))
  const numBox = {
    x: 10,
    y: Math.max(4, num.minY - 4),
    w,
    h: 76,
  }
  let denBox = {
    x: 10,
    y: Math.min(height - 96, den.maxY - 44),
    w,
    h: 88,
  }
  if (numBox.y + numBox.h + 14 > denBox.y) {
    denBox = { ...denBox, y: numBox.y + numBox.h + 16 }
  }

  return {
    num: {
      box: numBox,
      line: {
        x1: numBox.x + numBox.w,
        y1: numBox.y + numBox.h * 0.78,
        x2: num.minX + (num.maxX - num.minX) * 0.14,
        y2: num.cy,
      },
    },
    den: {
      box: denBox,
      line: {
        x1: denBox.x + denBox.w,
        y1: denBox.y + denBox.h * 0.22,
        x2: den.minX + (den.maxX - den.minX) * 0.14,
        y2: den.cy,
      },
    },
  }
}

function sameFrame(a, b) {
  if (!a) return false
  if (Math.abs(a.width - b.width) > 0.5 || Math.abs(a.height - b.height) > 0.5) return false
  for (const id of ['budget', 'spent']) {
    const p = a.plots[id]
    const q = b.plots[id]
    if (!p || !q) return false
    if (Math.abs(p.x - q.x) > 0.5 || Math.abs(p.y - q.y) > 0.5) return false
    if (Math.abs(p.w - q.w) > 0.5 || Math.abs(p.h - q.h) > 0.5) return false
  }
  return true
}
