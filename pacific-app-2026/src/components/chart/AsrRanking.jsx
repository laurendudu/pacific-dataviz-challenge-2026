import { useEffect, useMemo, useState } from 'react'
import { Delaunay } from 'd3-delaunay'
import { scaleLinear } from 'd3-scale'
import { ChartFrame } from './ChartFrame'

const MARGIN = { top: 52, right: 158, bottom: 20, left: 44 }
const COMPACT_MARGIN = { top: 56, right: 16, bottom: 16, left: 28 }
const HIT_R = 36
const LABEL_GAP = 20

/**
 * Rank slopegraph across the three allocation principles, in the order the
 * piece argues them: grandfathering, egalitarian, prioritarian.
 *
 * Rank 1 (lowest ASR) sits at the top. Grandfathering gives every country the
 * same ratio, so that column is one shared node — the flat panel is the
 * argument, drawn rather than asserted. The grey mass lives between the two
 * columns that actually rank, so 198 strokes never knot on the origin.
 *
 * D3 supplies the scale and the hover index; every mark is JSX.
 */
export function AsrRanking({ columns, rows, labelled, hoveredIso, onHover }) {
  const compact = useCompactChart()
  return (
    <ChartFrame
      margin={compact ? COMPACT_MARGIN : MARGIN}
      title="Country rank under three ways of dividing the same budget"
      desc="Grandfathering ties every country on one rank; egalitarian and prioritarian spread them apart."
    >
      {(dms) => (
        <RankingMarks
          columns={columns}
          rows={rows}
          labelled={compact ? [] : labelled}
          compact={compact}
          hoveredIso={hoveredIso}
          onHover={onHover}
          width={dms.boundedWidth}
          height={dms.boundedHeight}
        />
      )}
    </ChartFrame>
  )
}

function RankingMarks({ columns, rows, labelled, compact, hoveredIso, onHover, width, height }) {
  const x = useMemo(
    () => columns.map((_, i) => (columns.length === 1 ? width / 2 : (i / (columns.length - 1)) * width)),
    [columns, width],
  )

  const y = useMemo(
    () => scaleLinear().domain([1, rows.maxRank]).range([0, height]),
    [rows.maxRank, height],
  )

  const tiedCol = useMemo(() => tiedColumn(rows.items), [rows.items])
  const lastCol = columns.length - 1

  const paths = useMemo(() => {
    const greyFrom = tiedCol >= 0 ? tiedCol + 1 : 0
    return rows.items.map((row) => ({
      ...row,
      d: curve(row.ranks, x, y, row.group === 'other' ? greyFrom : 0),
      dFull: curve(row.ranks, x, y, 0),
    }))
  }, [rows.items, x, y, tiedCol])

  const labels = useMemo(
    () => placeLabels(labelled, lastCol, y, height),
    [labelled, lastCol, y, height],
  )

  const hits = useMemo(() => {
    const pts = []
    for (const row of paths) {
      for (let i = 0; i < row.ranks.length; i += 1) {
        if (i === tiedCol || row.ranks[i] == null) continue
        pts.push({ iso: row.iso, x: x[i], y: y(row.ranks[i]) })
      }
    }
    return pts
  }, [paths, x, y, tiedCol])

  const delaunay = useMemo(
    () => (hits.length ? Delaunay.from(hits, (d) => d.x, (d) => d.y) : null),
    [hits],
  )

  const dim = hoveredIso != null
  const hovered = paths.find((r) => r.iso === hoveredIso) ?? null
  const rest = hovered ? paths.filter((r) => r.iso !== hoveredIso) : paths
  const others = rest.filter((r) => r.group === 'other')
  const named = rest.filter((r) => r.group !== 'other')

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
      {columns.map((col, i) => {
        const anchor = i === 0 ? 'start' : i === lastCol ? 'end' : 'middle'
        return (
          <g key={col.id} pointerEvents="none">
            <text x={x[i]} y={-28} className="rank__head" textAnchor={anchor}>{col.title}</text>
            {compact ? null : (
              <text x={x[i]} y={-12} className="rank__sub" textAnchor={anchor}>{col.rule}</text>
            )}
            <line x1={x[i]} x2={x[i]} y1={0} y2={height} className="rank__spine" />
          </g>
        )
      })}

      <g className="rank__axis" pointerEvents="none">
        <text x={-10} y={-28} textAnchor="end">Rank</text>
        <text x={-10} y={0} dy="0.32em" textAnchor="end">1</text>
        <text x={-10} y={height} dy="0.32em" textAnchor="end">{rows.maxRank}</text>
      </g>

      {/* Background: every third country. Hover still resolves any of the 198. */}
      {others.map((row, i) =>
        i % 3 ? null : (
          <path
            key={row.iso}
            d={row.d}
            className={`rank__line rank__line--other${dim ? ' is-dim' : ''}`}
          />
        ),
      )}
      {named.map((row) => (
        <path
          key={row.iso}
          d={row.d}
          className={`rank__line rank__line--${row.group}${dim ? ' is-dim' : ''}`}
        />
      ))}
      {hovered?.dFull ? (
        <path d={hovered.dFull} className={`rank__line rank__line--${hovered.group} is-hover`} />
      ) : null}

      {named.map((row) =>
        row.ranks.map((rank, i) =>
          rank == null || i === tiedCol ? null : (
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
            rank == null ? null : (
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
            pointerEvents="none"
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

function curve(ranks, x, y, fromCol) {
  let d = ''
  let open = false
  for (let i = fromCol; i < ranks.length; i += 1) {
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
