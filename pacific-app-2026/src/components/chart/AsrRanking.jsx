import { useEffect, useId, useMemo, useState } from 'react'
import { Delaunay } from 'd3-delaunay'
import { scaleLinear } from 'd3-scale'
import { motion, useReducedMotion } from 'motion/react'
import { ChartFrame } from './ChartFrame'

const MARGIN = { top: 52, right: 172, bottom: 20, left: 44 }
const COMPACT_MARGIN = { top: 56, right: 16, bottom: 16, left: 28 }
const HIT_R = 36
const LABEL_GAP = 16
const GREY_BATCHES = 4
const CUTOFF_TICK = 22

const SPRING = { type: 'spring', visualDuration: 0.45, bounce: 0.08 }
const SNAP = { duration: 0 }

/**
 * Rank slopegraph across the three allocation principles, in the order the
 * piece argues them: grandfathering, egalitarian, prioritarian.
 *
 * Rank 1 (lowest ASR) sits at the top. Grandfathering gives every country the
 * same ratio, so that column is one shared node — the flat panel is the
 * argument, drawn rather than asserted. The grey mass lives between the two
 * columns that actually rank, so 198 strokes never knot on the origin.
 *
 * Columns keep their final x from the first frame (left / centre / right).
 * Scroll `reveal` (0–1 per later column) grows a clip so cords draw rightward
 * into egalitarian, then prioritarian — the layout never recenters.
 * D3 supplies the scale and the hover index; every mark is JSX.
 */
export function AsrRanking({
  columns,
  rows,
  labelled,
  hoveredIso,
  onHover,
  revealEg = 1,
  revealPr = 1,
}) {
  const compact = useCompactChart()
  return (
    <ChartFrame
      margin={compact ? COMPACT_MARGIN : MARGIN}
      title="Country rank under three ways of dividing the same budget"
      desc="Grandfathering ties every country on one rank; egalitarian and prioritarian spread them apart. A red dashed mark sits at ASR = 1."
    >
      {(dms) => (
        <RankingMarks
          columns={columns}
          rows={rows}
          labelled={compact ? [] : labelled}
          compact={compact}
          hoveredIso={hoveredIso}
          onHover={onHover}
          revealEg={revealEg}
          revealPr={revealPr}
          width={dms.boundedWidth}
          height={dms.boundedHeight}
        />
      )}
    </ChartFrame>
  )
}

function RankingMarks({
  columns,
  rows,
  labelled,
  compact,
  hoveredIso,
  onHover,
  revealEg,
  revealPr,
  width,
  height,
}) {
  const reduceMotion = useReducedMotion()
  const colTransition = reduceMotion ? SNAP : SPRING
  const showEg = revealEg > 0.04
  const showPr = revealPr > 0.04
  const liveEg = revealEg > 0.45
  const livePr = revealPr > 0.45
  const lastLive = livePr ? 2 : liveEg ? 1 : 0
  const lastCol = columns.length - 1
  const clipId = `rank-reveal-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  const x = useMemo(
    () => columnXs(width, columns.length),
    [width, columns.length],
  )

  const y = useMemo(
    () => scaleLinear().domain([1, rows.maxRank]).range([0, height]),
    [rows.maxRank, height],
  )

  const tiedCol = useMemo(() => tiedColumn(rows.items), [rows.items])

  const clipRight = useMemo(() => {
    if (!x.length) return 0
    let right = x[0]
    if (x[1] != null) right += (x[1] - x[0]) * revealEg
    if (x[2] != null) right += (x[2] - x[1]) * revealPr
    return right + 6
  }, [x, revealEg, revealPr])

  const paths = useMemo(() => {
    return rows.items.map((row) => ({
      ...row,
      dEg: segmentCurve(row.ranks, x, y, 0, 1),
      dPr: segmentCurve(row.ranks, x, y, 1, 2),
      dFull: curveTo(row.ranks, x, y, 0, lastCol),
    }))
  }, [rows.items, x, y, lastCol])

  const labels = useMemo(
    () => (livePr ? placeLabels(labelled, lastCol, y, height) : []),
    [labelled, lastCol, y, height, livePr],
  )

  const cutoffs = useMemo(
    () => columns.map((_, i) => asrCutoffRank(rows.items, i)),
    [columns, rows.items],
  )

  const hits = useMemo(() => {
    const pts = []
    for (const row of paths) {
      for (let i = 0; i < row.ranks.length; i += 1) {
        if (i === tiedCol || row.ranks[i] == null) continue
        if (i > lastLive) continue
        pts.push({ iso: row.iso, x: x[i], y: y(row.ranks[i]) })
      }
    }
    return pts
  }, [paths, x, y, tiedCol, lastLive])

  const delaunay = useMemo(
    () => (hits.length ? Delaunay.from(hits, (d) => d.x, (d) => d.y) : null),
    [hits],
  )

  const dim = hoveredIso != null
  const hovered = paths.find((r) => r.iso === hoveredIso) ?? null
  const rest = hovered ? paths.filter((r) => r.iso !== hoveredIso) : paths
  const others = rest.filter((r) => r.group === 'other')
  const named = rest.filter((r) => r.group !== 'other')

  const greyBatches = useMemo(() => {
    const drawn = others.filter((_, i) => i % 3 === 0)
    const batches = Array.from({ length: GREY_BATCHES }, () => [])
    drawn.forEach((row, i) => {
      if (row.dPr) batches[i % GREY_BATCHES].push(row.dPr)
    })
    return batches.map((ds) => ds.join(''))
  }, [others])

  const onMove = (event) => {
    if (!delaunay || !onHover) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const mx = event.clientX - bounds.left
    const my = event.clientY - bounds.top
    const i = delaunay.find(mx, my)
    const hit = hits[i]
    if (!hit) {
      onHover(null)
      return
    }
    const dist = Math.hypot(hit.x - mx, hit.y - my)
    onHover(dist <= HIT_R ? hit.iso : null)
  }

  const tieRank = tiedCol >= 0 ? rows.items.find((r) => r.ranks[tiedCol] != null)?.ranks[tiedCol] : null

  return (
    <g className="rank-marks">
      <defs>
        <clipPath id={clipId}>
          <rect x={-8} y={-12} width={Math.max(0, clipRight + 8)} height={height + 24} />
        </clipPath>
      </defs>

      {columns.map((col, i) => {
        const anchor = i === 0 ? 'start' : i === lastCol ? 'end' : 'middle'
        const on = i === 0 ? 1 : i === 1 ? revealEg : revealPr
        return (
          <motion.g
            key={col.id}
            pointerEvents="none"
            initial={false}
            animate={{ opacity: on }}
            transition={colTransition}
          >
            <text x={x[i]} y={-28} className="rank__head" textAnchor={anchor}>{col.title}</text>
            {compact ? null : (
              <text x={x[i]} y={-12} className="rank__sub" textAnchor={anchor}>{col.rule}</text>
            )}
            <line x1={x[i]} x2={x[i]} y1={0} y2={height} className="rank__spine" />
          </motion.g>
        )
      })}

      <g className="rank__axis" pointerEvents="none">
        <text x={-10} y={-28} textAnchor="end">Rank</text>
        <text x={-10} y={0} dy="0.32em" textAnchor="end">1</text>
        <text x={-10} y={height} dy="0.32em" textAnchor="end">{rows.maxRank}</text>
      </g>

      <g clipPath={`url(#${clipId})`}>
        {greyBatches.map((d, i) => (
          d ? (
            <path
              key={`grey-${i}`}
              d={d}
              className={`rank__line rank__line--other${dim ? ' is-dim' : ''}`}
            />
          ) : null
        ))}

        {named.map((row) => (
          row.dEg ? (
            <path
              key={`eg-${row.iso}`}
              d={row.dEg}
              className={`rank__line rank__line--${row.group}${dim ? ' is-dim' : ''}`}
            />
          ) : null
        ))}
        {named.map((row) => (
          row.dPr ? (
            <path
              key={`pr-${row.iso}`}
              d={row.dPr}
              className={`rank__line rank__line--${row.group}${dim ? ' is-dim' : ''}`}
            />
          ) : null
        ))}

        {hovered?.dFull ? (
          <path d={hovered.dFull} className={`rank__line rank__line--${hovered.group} is-hover`} />
        ) : null}
      </g>

      {named.map((row) =>
        row.ranks.map((rank, i) =>
          rank == null || i === tiedCol || i > lastLive ? null : (
            <circle
              key={`${row.iso}-${i}`}
              cx={x[i]}
              cy={y(rank)}
              r={3.2}
              className={`rank__dot rank__dot--${row.group}${dim ? ' is-dim' : ''}`}
            />
          ),
        ),
      )}
      {hovered
        ? hovered.ranks.map((rank, i) =>
            rank == null || i > lastLive ? null : (
              <circle
                key={`h-${hovered.iso}-${i}`}
                cx={x[i]}
                cy={y(rank)}
                r={i === tiedCol ? 5 : 4.2}
                className={`rank__dot rank__dot--${hovered.group} is-hover`}
              />
            ),
          )
        : null}

      <motion.g
        pointerEvents="none"
        initial={false}
        animate={{ opacity: livePr ? 1 : 0 }}
        transition={colTransition}
      >
        {labels.map((item) => {
          const { row, rank, placed } = item
          const px = x[lastCol]
          const py = y(rank)
          const ly = placed
          const lead = Math.abs(ly - py) > 6
          const faded = dim && hoveredIso !== row.iso
          return (
            <g
              key={`lbl-${row.iso}`}
              className={`rank__label rank__label--${row.group}${faded ? ' is-dim' : ''}`}
            >
              {lead ? (
                <path
                  className="rank__leader"
                  d={`M${px + 6},${py} C${px + 14},${py} ${px + 14},${ly} ${px + 20},${ly}`}
                />
              ) : null}
              <text
                x={px + (lead ? 24 : 12)}
                y={ly}
                dy="0.32em"
                textAnchor="start"
              >
                {row.name}
              </text>
            </g>
          )
        })}
      </motion.g>

      {tiedCol >= 0 && tieRank != null ? (
        <g className="rank__tie" pointerEvents="none">
          <circle cx={x[tiedCol]} cy={y(tieRank)} r={5.5} />
          {compact ? null : (
            <>
              <rect x={x[tiedCol] + 10} y={y(tieRank) - 18} width={78} height={14} rx={2} />
              <text x={x[tiedCol] + 14} y={y(tieRank) - 7}>all 198 tied</text>
            </>
          )}
        </g>
      ) : null}

      <g className="rank__cutoffs" pointerEvents="none">
        {columns.map((col, i) => {
          const anchor = i === 0 ? 'start' : i === lastCol ? 'end' : 'middle'
          const on = i === 0 ? 1 : i === 1 ? revealEg : revealPr
          return (
            <motion.g
              key={`cut-${col.id}`}
              initial={false}
              animate={{ opacity: on }}
              transition={colTransition}
            >
              <CutoffMark
                x={x[i]}
                y={cutoffs[i] == null ? null : y(cutoffs[i])}
                height={height}
                compact={compact}
                anchor={anchor}
              />
            </motion.g>
          )
        })}
        <g clipPath={`url(#${clipId})`}>
          <CutoffJoin cutoffs={cutoffs} x={x} y={y} showEg={showEg} showPr={showPr} transition={colTransition} />
        </g>
      </g>

      <rect
        className="rank-marks__hit"
        width={width}
        height={height}
        fill="transparent"
        onPointerMove={onMove}
        onPointerLeave={() => onHover?.(null)}
      />
    </g>
  )
}

function CutoffMark({ x, y: py, height, compact, anchor }) {
  if (py == null || py < 0 || py > height) return null
  const labelX = anchor === 'end' ? x - CUTOFF_TICK - 6 : x + CUTOFF_TICK + 6
  const labelAnchor = anchor === 'end' ? 'end' : 'start'
  return (
    <g className="rank__cutoff">
      <line
        x1={x - CUTOFF_TICK}
        x2={x + CUTOFF_TICK}
        y1={py}
        y2={py}
      />
      {compact ? null : (
        <text x={labelX} y={py - 5} textAnchor={labelAnchor}>ASR = 1</text>
      )}
    </g>
  )
}

function CutoffJoin({ cutoffs, x, y, showEg, showPr, transition }) {
  const pts = cutoffs
    .map((rank, i) => {
      const on = i === 0 || (i === 1 && showEg) || (i === 2 && showPr)
      if (!on || rank == null) return null
      return { x: x[i], y: y(rank) }
    })
    .filter(Boolean)
  if (pts.length < 2) return null
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 1; i < pts.length; i += 1) {
    const prev = pts[i - 1]
    const cur = pts[i]
    const mid = (prev.x + cur.x) / 2
    d += ` C${mid},${prev.y} ${mid},${cur.y} ${cur.x},${cur.y}`
  }
  return (
    <motion.path
      className="rank__cutoff-join"
      d={d}
      pointerEvents="none"
      initial={false}
      animate={{ opacity: 1 }}
      transition={transition}
    />
  )
}

/** Final three-column x: left, centre, right. Never recenters during reveal. */
function columnXs(width, n) {
  if (n <= 1) return [width / 2]
  return Array.from({ length: n }, (_, i) => (i / (n - 1)) * width)
}

/** Interpolated rank where ASR crosses 1. Null if every value sits on one side. */
function asrCutoffRank(items, col) {
  const pts = []
  for (const row of items) {
    const rank = row.ranks[col]
    const value = row.values[col]
    if (rank == null || !Number.isFinite(value)) continue
    pts.push({ rank, value })
  }
  if (!pts.length) return null
  pts.sort((a, b) => a.value - b.value || a.rank - b.rank)
  const lo = pts[0].value
  const hi = pts[pts.length - 1].value
  if (lo > 1 || hi < 1) return null
  if (lo === 1) return pts[0].rank
  let i = 0
  while (i < pts.length && pts[i].value < 1) i += 1
  if (i === 0) return pts[0].rank
  if (i >= pts.length) return null
  const a = pts[i - 1]
  const b = pts[i]
  const span = b.value - a.value
  if (span === 0) return a.rank
  return a.rank + ((1 - a.value) / span) * (b.rank - a.rank)
}

function segmentCurve(ranks, x, y, fromCol, toCol) {
  if (fromCol < 0 || toCol >= ranks.length) return ''
  const a = ranks[fromCol]
  const b = ranks[toCol]
  if (a == null || b == null) return ''
  const x0 = x[fromCol]
  const y0 = y(a)
  const x1 = x[toCol]
  const y1 = y(b)
  const mid = (x0 + x1) / 2
  return `M${x0},${y0} C${mid},${y0} ${mid},${y1} ${x1},${y1}`
}

function curveTo(ranks, x, y, fromCol, toCol) {
  let d = ''
  let open = false
  const last = Math.min(toCol, ranks.length - 1)
  for (let i = fromCol; i <= last; i += 1) {
    const rank = ranks[i]
    if (rank == null) {
      open = false
      continue
    }
    const px = x[i]
    const py = y(rank)
    if (!open) {
      d += `M${px},${py}`
      open = true
      continue
    }
    const prevX = x[i - 1]
    const prevY = y(ranks[i - 1])
    const mid = (prevX + px) / 2
    d += ` C${mid},${prevY} ${mid},${py} ${px},${py}`
  }
  return d
}

function tiedColumn(items) {
  if (!items.length) return -1
  const n = items[0].ranks.length
  for (let i = 0; i < n; i += 1) {
    let first = null
    let count = 0
    let same = true
    for (const row of items) {
      const rank = row.ranks[i]
      if (rank == null) continue
      count += 1
      if (first == null) first = rank
      else if (rank !== first) {
        same = false
        break
      }
    }
    if (same && count > 1) return i
  }
  return -1
}

/** Pack right-side labels in pixel space, then pull the stack back into the plot. */
function placeLabels(labelled, col, y, height) {
  const items = labelled
    .map((row) => {
      const rank = row.ranks[col] ?? lastRank(row.ranks)
      if (rank == null) return null
      return { row, rank, placed: y(rank) }
    })
    .filter(Boolean)
    .sort((a, b) => a.placed - b.placed)

  let prev = -Infinity
  for (const item of items) {
    item.placed = Math.max(item.placed, prev + LABEL_GAP)
    prev = item.placed
  }
  prev = height + LABEL_GAP
  for (let i = items.length - 1; i >= 0; i -= 1) {
    items[i].placed = Math.min(items[i].placed, prev - LABEL_GAP, height)
    prev = items[i].placed
  }
  prev = -LABEL_GAP
  for (const item of items) {
    item.placed = Math.max(item.placed, prev + LABEL_GAP, 0)
    prev = item.placed
  }
  return items
}

function lastRank(ranks) {
  for (let i = ranks.length - 1; i >= 0; i -= 1) {
    if (ranks[i] != null) return ranks[i]
  }
  return null
}

function useCompactChart() {
  const [compact, setCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 60rem)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 60rem)')
    const sync = () => setCompact(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return compact
}
