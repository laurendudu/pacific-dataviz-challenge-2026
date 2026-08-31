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
  if (pct == null || Number.isNaN(pct)) return '–'
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
  shift = 0,
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

  const geom = useMemo(
    () => layoutEquation(frame),
    [frame],
  )
  const stacked = (frame?.width ?? 0) < STACKED_AT
  const dx = stacked ? 0 : (geom?.shiftDx ?? 0) * shift
  const ratio = formatRatio(OVERSHOOT)
  const termOpacity = eqOpacity
  const pacificShare = formatSharePct(pacificPct)
  const asks = geom
    ? placeAsks({
        num: offsetCloud(geom.num, dx),
        den: offsetCloud(geom.den, dx),
        result: {
          x: geom.result.x + dx,
          y: geom.result.y,
          size: geom.result.size,
        },
        width: frame.width,
        height: frame.height,
        stacked,
      })
    : null

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
            const p = morphNode(n, morph, geom.spentRigid, dx)
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
            x1={geom.bar.x1 + dx}
            y1={geom.bar.y}
            x2={geom.bar.x2 + dx}
            y2={geom.bar.y}
            opacity={eqOpacity}
          />

          <text
            className="swarm-eq__term"
            x={geom.numLabel.x + dx}
            y={geom.numLabel.y}
            textAnchor={geom.numLabel.anchor}
            dominantBaseline={geom.numLabel.baseline}
            opacity={termOpacity}
          >
            emissions
          </text>
          <text
            className="swarm-eq__term"
            x={geom.denLabel.x + dx}
            y={geom.denLabel.y}
            textAnchor={geom.denLabel.anchor}
            dominantBaseline={geom.denLabel.baseline}
            opacity={termOpacity}
          >
            budget
          </text>

          <AskLeader ask={asks.num} opacity={qNumOpacity} />
          <AskLeader ask={asks.den} opacity={qDenOpacity} />

          <text
            className="swarm-eq__equals"
            x={geom.equals.x + dx}
            y={geom.equals.y}
            fontSize={geom.equals.size}
            dominantBaseline="middle"
            opacity={eqOpacity}
          >
            =
          </text>
          <text
            className="swarm-eq__result"
            x={geom.result.x + dx}
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
            left: stacked ? undefined : geom.note.x + dx,
            top: stacked ? undefined : geom.note.y,
          }}
          aria-hidden={noteOpacity < 0.5}
        >
          This is called an <strong>ASR</strong>, or <u>Absolute Sustainability Ratio</u>.
          It means the world overshot 6.4 times its 2023 budget.
        </p>
      ) : null}

      {asks ? (
        <AskNote box={asks.num.box} opacity={qNumOpacity} variant="side">
          The Pacific emits {pacificShare}% of 2023 GHG emissions
        </AskNote>
      ) : null}
      {asks ? (
        <AskNote
          box={asks.den.box}
          opacity={qDenOpacity}
          variant="side"
        >
          {PACIFIC_BUDGET_ASK}
        </AskNote>
      ) : null}
    </div>
  )
}

function AskNote({ box, opacity, children, variant }) {
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
  const x0 = line.x2
  const y0 = line.y2
  const x1 = line.x1
  const y1 = line.y1
  const span = x1 - x0
  const reach = Math.min(72, Math.max(28, Math.abs(span) * 0.4))
  const c1x = x0 + Math.sign(span || 1) * Math.min(56, Math.abs(span) * 0.35)
  const c1y = y0
  const c2x = x1 - reach
  const c2y = y1
  const d = `M${x0},${y0} C${c1x},${c1y} ${c2x},${c2y} ${x1},${y1}`
  return (
    <g className="swarm-eq__ask-g" opacity={opacity}>
      <path className="swarm-eq__ask-line" d={d} />
      <circle
        className="swarm-eq__ask-dot"
        cx={x0}
        cy={y0}
        r="2"
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
  const eqGap = stacked ? 10 : 16
  const equalsSize = stacked ? Math.min(40, height * 0.11) : Math.min(64, height * 0.12)
  const resultSize = stacked ? Math.min(56, height * 0.16) : Math.min(96, height * 0.2)
  const equalsX = bar.x2 + eqGap
  const resultX = equalsX + equalsSize * 0.78
  const resultW = resultSize * 1.72
  /* Gloss sits to the right of the result, vertically centred on the bar. */
  const noteX = stacked ? width / 2 : resultX + resultW + 14
  const noteY = stacked ? height - 4 : barY

  return {
    radius,
    nodes,
    spentRigid,
    shiftDx: slots.shiftDx,
    bar,
    equals: { x: equalsX, y: barY, size: equalsSize },
    result: { x: resultX, y: barY, size: resultSize },
    note: { x: noteX, y: noteY },
    num,
    den,
    numLabel: {
      x: (num.minX + num.maxX) / 2,
      y: num.minY - 10,
      anchor: 'middle',
      baseline: 'auto',
    },
    denLabel: {
      x: (den.minX + den.maxX) / 2,
      y: den.maxY + 16,
      anchor: 'middle',
      baseline: 'hanging',
    },
  }
}

function fractionSlots(width, height, stacked) {
  if (stacked) {
    const left = 8
    const top = 16
    const right = 8
    const bottom = 72
    const fracW = Math.max(48, width - right - left)
    const barY = height * 0.42
    const gap = 16
    return {
      num: { x: left, y: top, w: fracW, h: Math.max(48, barY - gap - top) },
      den: {
        x: left,
        y: barY + gap,
        w: fracW,
        h: Math.max(40, height - (barY + gap) - bottom),
      },
      shiftDx: 0,
    }
  }

  /* Vertical room above/below the blobs for the word labels, then the asks. */
  const top = 52
  const bottom = 68
  const barY = height * 0.52
  const gap = 14
  const numH = Math.max(48, barY - gap - top)
  const denH = Math.max(40, height - (barY + gap) - bottom)
  const resultRoom = 16 + 64 * 0.78 + 96 * 1.72
  const noteRoom = 220
  const packW = Math.min(
    460,
    width * 0.36,
    Math.max(200, Math.min(numH, denH) * 1.35),
  )

  const eqW = packW + resultRoom + noteRoom
  const centeredX = Math.max(24, (width - eqW) / 2)

  const leftX = Math.max(48, width * 0.055)

  /* Slot size is the centred pack: shift only translates, never re-packs. */
  return {
    num: { x: centeredX, y: top, w: packW, h: numH },
    den: { x: centeredX, y: barY + gap, w: packW, h: denH },
    shiftDx: leftX - centeredX,
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

/** Per-dot lerp for budget; rigid translate (+ optional uniform scale) for spent.
 *  `dx` slides the already-morphed fraction without re-packing. */
function morphNode(n, t, spentRigid, dx = 0) {
  if (n.kind === 'spent' && spentRigid) {
    const { c0x, c0y, c1x, c1y, scale } = spentRigid
    const s = 1 + t * (scale - 1)
    const cx = c0x + t * (c1x + dx - c0x)
    const cy = c0y + t * (c1y - c0y)
    return {
      cx: cx + (n.x0 - c0x) * s,
      cy: cy + (n.y0 - c0y) * s,
    }
  }
  return {
    cx: n.x0 + t * (n.x1 + dx - n.x0),
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

function offsetCloud(b, dx) {
  return {
    ...b,
    minX: b.minX + dx,
    maxX: b.maxX + dx,
    cx: b.cx + dx,
  }
}

function placeAsks({ num, den, result, width, height, stacked }) {
  const w = stacked
    ? Math.min(220, Math.max(160, width * 0.48))
    : Math.min(260, Math.max(200, result.size * 2.2))
  const x = stacked
    ? Math.max(8, (width - w) / 2)
    : Math.min(width - w - 12, result.x + 50)
  const numH = 52
  const denH = 68
  const fromSix = 150
  const numBox = {
    x,
    y: Math.max(4, result.y - result.size * 0.5 - 28 - fromSix - numH),
    w,
    h: numH,
  }
  const denBox = {
    x,
    y: Math.min(height - denH - 8, result.y + result.size * 0.52 + 10 + fromSix),
    w,
    h: denH,
  }
  const endX = x - 10
  const midY = (box) => box.y + 13

  return {
    num: {
      box: numBox,
      line: {
        x1: endX,
        y1: midY(numBox),
        x2: num.maxX + 4,
        y2: num.cy,
      },
    },
    den: {
      box: denBox,
      line: {
        x1: endX,
        y1: midY(denBox),
        x2: den.maxX + 4,
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
