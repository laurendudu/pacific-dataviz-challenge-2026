import { useEffect, useId, useMemo, useState } from 'react'
import { Delaunay } from 'd3-delaunay'
import { scaleLinear } from 'd3-scale'
import { motion, useReducedMotion } from 'motion/react'
import { asrCutoffRank } from '../../data/asrCutoff'
import { ChartFrame } from './ChartFrame'
import { layoutAlluvial, layoutSpine, MIN_H, NODE_W } from './alluvialLayout'

const MARGIN = { top: 52, right: 200, bottom: 20, left: 136 }
const COMPACT_MARGIN = { top: 56, right: 16, bottom: 16, left: 100 }
const HIT_R = 36
const LABEL_GAP = 14
const GREY_BATCHES = 4
const CUTOFF_TICK = 22
const CUTOFF_TICK_HI = 56

const SPRING = { type: 'spring', visualDuration: 0.45, bounce: 0.08 }
const SNAP = { duration: 0 }
const VOLUME = { duration: 0.45, ease: [0.4, 0, 0.2, 1] }

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
  volume = false,
  showRow = false,
  cutoffItems,
}) {
  const compact = useCompactChart()
  return (
    <ChartFrame
      margin={compact ? COMPACT_MARGIN : MARGIN}
      title="Country rank under three ways of dividing the same budget"
      desc="Grandfathering ties every country on one rank; egalitarian and prioritarian spread them apart. Red dashed marks sit at ASR = 1 and, on prioritarian, ASR = 100. With ASR values, ribbon thickness is each country’s ratio."
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
          volume={volume}
          showRow={showRow}
          cutoffItems={cutoffItems}
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
  volume,
  showRow,
  cutoffItems,
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

  const fat = useMemo(
    () => layoutAlluvial(rows.items, x, y, height),
    [rows.items, x, y, height],
  )
  const spine = useMemo(
    () => layoutSpine(rows.items, x, y),
    [rows.items, x, y],
  )
  const fatByIso = useMemo(
    () => new Map(fat.rows.map((row) => [row.iso, row])),
    [fat],
  )
  const spineByIso = useMemo(
    () => new Map(spine.rows.map((row) => [row.iso, row])),
    [spine],
  )

  const cutoffSource = cutoffItems ?? rows.items
  const labels = useMemo(() => {
    if (!livePr) return []
    return volume
      ? placeVolumeLabels(labelled, fat.byIso, lastCol, height)
      : placeLabels(labelled, lastCol, y, height)
  }, [labelled, lastCol, y, height, livePr, volume, fat.byIso])

  const cutoffs = useMemo(
    () => columns.map((_, i) => asrCutoffRank(cutoffSource, i, 1)),
    [columns, cutoffSource],
  )
  const cutoff100 = useMemo(
    () => asrCutoffRank(cutoffSource, lastCol, 100, {
      fallback: 'end',
      maxRank: rows.maxRank,
    }),
    [lastCol, cutoffSource, rows.maxRank],
  )

  const hits = useMemo(() => {
    const pts = []
    if (volume) {
      for (const row of fat.rows) {
        for (let c = 0; c < columns.length; c += 1) {
          if (c > lastLive) continue
          const node = row.nodes[c]
          if (!node) continue
          pts.push({ iso: row.iso, x: node.cx, y: node.yc })
          pts.push({ iso: row.iso, x: node.cx, y: node.y0 })
          pts.push({ iso: row.iso, x: node.cx, y: node.y1 })
        }
      }
      return pts
    }
    for (const row of paths) {
      for (let i = 0; i < row.ranks.length; i += 1) {
        if (i === tiedCol || row.ranks[i] == null) continue
        if (i > lastLive) continue
        pts.push({ iso: row.iso, x: x[i], y: y(row.ranks[i]) })
      }
    }
    return pts
  }, [volume, fat.rows, paths, x, y, tiedCol, lastLive, columns.length])

  const delaunay = useMemo(
    () => (hits.length ? Delaunay.from(hits, (d) => d.x, (d) => d.y) : null),
    [hits],
  )

  const morph = reduceMotion ? SNAP : VOLUME
  const dim = hoveredIso != null
  const hovered = paths.find((r) => r.iso === hoveredIso) ?? null
  const hoveredFat = hoveredIso ? fatByIso.get(hoveredIso) : null
  const rest = hovered ? paths.filter((r) => r.iso !== hoveredIso) : paths
  const others = rest.filter((r) => r.group === 'other')
  const named = rest.filter((r) => r.group !== 'other')
  const extras = showRow ? [] : others
  const worldGreys = showRow ? others : []

  const greyBatches = useMemo(() => {
    const drawn = worldGreys.filter((_, i) => i % 3 === 0)
    const batches = Array.from({ length: GREY_BATCHES }, () => [])
    drawn.forEach((row, i) => {
      if (row.dPr) batches[i % GREY_BATCHES].push(row.dPr)
    })
    return batches.map((ds) => ds.join(''))
  }, [worldGreys])

  const onMove = (event) => {
    if (!delaunay || !onHover) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const mx = event.clientX - bounds.left
    const my = event.clientY - bounds.top
    const pointer = { x: event.clientX, y: event.clientY }
    const i = delaunay.find(mx, my)
    const hit = hits[i]
    if (!hit) {
      onHover(null)
      return
    }
    const dist = Math.hypot(hit.x - mx, hit.y - my)
    onHover(dist <= HIT_R ? hit.iso : null, dist <= HIT_R ? pointer : undefined)
  }

  const tieRank = tiedCol >= 0 ? rows.items.find((r) => r.ranks[tiedCol] != null)?.ranks[tiedCol] : null
  const tieCount = tiedCol >= 0
    ? rows.items.reduce((n, r) => n + (r.ranks[tiedCol] != null ? 1 : 0), 0)
    : 0
  const tieY = tieRank != null ? y(tieRank) : 0
  const tieLabelBelow = tieY < 20

  return (
    <g className={`rank-marks${volume ? ' is-volume' : ''}`}>
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
        <text x={-6} y={-28} textAnchor="end">Rank</text>
        <ExtentNote y={0} label="lowest ASR" compact={compact} />
        <text x={-6} y={0} dy="0.32em" textAnchor="end">1</text>
        <ExtentNote y={height} label="highest ASR" compact={compact} />
        <text x={-6} y={height} dy="0.32em" textAnchor="end">{rows.maxRank}</text>
      </g>

      <g clipPath={`url(#${clipId})`}>
        <motion.g
          initial={false}
          animate={{ opacity: volume || !showRow ? 0 : 1 }}
          transition={morph}
          style={{ pointerEvents: 'none' }}
        >
          {greyBatches.map((d, i) => (
            d ? (
              <path
                key={`grey-${i}`}
                d={d}
                className={`rank__line rank__line--other${dim ? ' is-dim' : ''}`}
              />
            ) : null
          ))}
        </motion.g>

        {showRow && volume ? (
          <g className={`alluvial-world${dim ? ' is-dim' : ''}`}>
            {worldGreys.map((row) => {
              const fatRow = fatByIso.get(row.iso)
              return fatRow?.ribbon ? <path key={row.iso} d={fatRow.ribbon} /> : null
            })}
          </g>
        ) : null}

        <motion.g
          initial={false}
          animate={{ opacity: volume ? 0 : 1 }}
          transition={morph}
        >
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
          {extras.map((row) => (
            row.dFull ? (
              <path
                key={`ex-${row.iso}`}
                d={row.dFull}
                className={`rank__line rank__line--other${dim ? ' is-dim' : ''}`}
              />
            ) : null
          ))}
          {!volume && hovered?.dFull ? (
            <path d={hovered.dFull} className={`rank__line rank__line--${hovered.group} is-hover`} />
          ) : null}
        </motion.g>

        {named.map((row) => (
          <MorphRibbon
            key={`rib-${row.iso}`}
            group={row.group}
            thin={spineByIso.get(row.iso)}
            fat={fatByIso.get(row.iso)}
            volume={volume}
            dim={dim}
            transition={morph}
          />
        ))}
        {extras.map((row) => (
          <MorphRibbon
            key={`rib-ex-${row.iso}`}
            group="other"
            thin={spineByIso.get(row.iso)}
            fat={fatByIso.get(row.iso)}
            volume={volume}
            dim={dim}
            transition={morph}
          />
        ))}

        {volume && hovered && hoveredFat?.ribbon ? (
          <g className={`alluvial-flow alluvial-flow--${hovered.group} is-hover`}>
            <path d={hoveredFat.ribbon} />
            {hovered.group !== 'other'
              ? hoveredFat.nodes.map((node, i) => (
                  node && i <= lastLive ? (
                    <rect
                      key={`h-${i}`}
                      x={node.x0}
                      y={node.y0}
                      width={NODE_W}
                      height={Math.max(MIN_H, node.y1 - node.y0)}
                    />
                  ) : null
                ))
              : null}
          </g>
        ) : null}
      </g>

      <motion.g
        initial={false}
        animate={{ opacity: volume ? 0 : 1 }}
        transition={morph}
        style={{ pointerEvents: 'none' }}
      >
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
        {!volume && hovered
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
      </motion.g>

      <motion.g
        pointerEvents="none"
        initial={false}
        animate={{ opacity: livePr ? 1 : 0 }}
        transition={colTransition}
      >
        {labels.map((item) => {
          const row = item.row
          const px = x[lastCol]
          const py = item.py
          const ly = item.placed
          const lead = Math.abs(ly - py) > 6
          const faded = dim && hoveredIso !== row.iso
          const rankMark = formatRank(labelRank(row, lastLive))
          return (
            <g
              key={`lbl-${row.iso}`}
              className={`rank__label rank__label--${row.group}${faded ? ' is-dim' : ''}`}
            >
              {lead ? (
                <path
                  className="rank__leader"
                  d={`M${px + (volume ? NODE_W / 2 + 4 : 6)},${py} C${px + 14},${py} ${px + 14},${ly} ${px + 20},${ly}`}
                />
              ) : null}
              <text
                x={px + (lead ? 24 : volume ? NODE_W / 2 + 8 : 12)}
                y={ly}
                dy="0.32em"
                textAnchor="start"
              >
                {row.name}
                {rankMark ? (
                  <tspan className="rank__label-n">{`  ${rankMark}`}</tspan>
                ) : null}
              </text>
            </g>
          )
        })}
      </motion.g>

      {tiedCol >= 0 && tieRank != null ? (
        <motion.g
          className="rank__tie"
          pointerEvents="none"
          initial={false}
          animate={{ opacity: volume ? 0 : 1 }}
          transition={morph}
        >
          <circle cx={x[tiedCol]} cy={tieY} r={5.5} />
          {compact ? null : (
            <>
              <rect
                x={x[tiedCol] + 10}
                y={tieLabelBelow ? tieY + 4 : tieY - 18}
                width={78}
                height={14}
                rx={2}
              />
              <text
                x={x[tiedCol] + 14}
                y={tieLabelBelow ? tieY + 15 : tieY - 7}
              >
                {`all ${tieCount} tied`}
              </text>
            </>
          )}
        </motion.g>
      ) : null}

      <g className="rank__cutoffs" pointerEvents="none">
        <motion.g
          initial={false}
          animate={{ opacity: revealPr }}
          transition={colTransition}
        >
          <CutoffMark
            x={x[lastCol]}
            y={cutoff100 == null ? null : y(cutoff100)}
            height={height}
            compact={compact}
            anchor="end"
            kind="hi"
            label="ASR = 100"
            tick={CUTOFF_TICK_HI}
          />
        </motion.g>
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
                kind="one"
                label="ASR = 1"
              />
            </motion.g>
          )
        })}
        <g clipPath={`url(#${clipId})`}>
          <CutoffJoin
            cutoffs={cutoffs}
            x={x}
            y={y}
            height={height}
            kind="one"
            showEg={showEg}
            showPr={showPr}
            transition={colTransition}
          />
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

function MorphRibbon({ group, thin, fat, volume, dim, transition }) {
  const from = thin?.ribbon || ''
  const to = fat?.ribbon || ''
  const d = volume ? (to || from) : (from || to)
  if (!d) return null
  return (
    <g className={`alluvial-flow alluvial-flow--${group}${dim ? ' is-dim' : ''}`}>
      <motion.path
        d={d}
        initial={false}
        animate={{ d, opacity: volume ? 1 : 0 }}
        transition={transition}
      />
    </g>
  )
}

function CutoffMark({ x, y: py, height, compact, anchor, kind = 'one', label = 'ASR = 1', tick = CUTOFF_TICK }) {
  if (py == null) return null
  const yLine = Math.max(0.75, Math.min(height - 1.5, py))
  const labelX = compact ? x : (anchor === 'end' ? x - tick - 6 : x + tick + 6)
  const labelAnchor = compact ? 'middle' : (anchor === 'end' ? 'end' : 'start')
  const labelY = yLine < 14 ? yLine + 12 : yLine - 6
  return (
    <g className={`rank__cutoff${kind === 'hi' ? ' rank__cutoff--hi' : ''}`}>
      <line x1={x - tick} x2={x + tick} y1={yLine} y2={yLine} />
      <text x={labelX} y={labelY} textAnchor={labelAnchor}>{label}</text>
    </g>
  )
}

function CutoffJoin({ cutoffs, x, y, height, kind = 'one', showEg, showPr, transition }) {
  const pts = cutoffs
    .map((rank, i) => {
      const on = i === 0 || (i === 1 && showEg) || (i === 2 && showPr)
      if (!on || rank == null) return null
      return { x: x[i], y: Math.max(0.75, Math.min(height - 1.5, y(rank))) }
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
      className={`rank__cutoff-join${kind === 'hi' ? ' rank__cutoff-join--hi' : ''}`}
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

function placeVolumeLabels(labelled, byIso, col, height) {
  const colMap = byIso[col]
  if (!colMap) return []
  const items = labelled
    .map((row) => {
      const node = colMap.get(row.iso)
      if (!node) return null
      return { row, py: node.yc, placed: node.yc }
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

/** Pack right-side labels in pixel space, then pull the stack back into the plot. */
function placeLabels(labelled, col, y, height) {
  const items = labelled
    .map((row) => {
      const rank = row.ranks[col] ?? lastRank(row.ranks)
      if (rank == null) return null
      return { row, py: y(rank), placed: y(rank) }
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

function labelRank(row, lastLive) {
  for (let i = lastLive; i >= 0; i -= 1) {
    if (row.ranks[i] != null) return row.ranks[i]
  }
  return lastRank(row.ranks)
}

export function formatRank(rank) {
  if (rank == null || !Number.isFinite(rank)) return null
  return `#${Math.round(rank)}`
}

/** Quiet callout: a right-pointing tick from the label into 1 / maxRank. */
function ExtentNote({ y, label, compact }) {
  const labelX = compact ? -40 : -50
  const x0 = compact ? -36 : -46
  const tip = compact ? -28 : -32
  return (
    <g className="rank__extent">
      <text x={labelX} y={y} dy="0.32em" textAnchor="end">{label}</text>
      <path d={`M${x0},${y} H${tip} M${tip - 4},${y - 3} L${tip},${y} L${tip - 4},${y + 3}`} />
    </g>
  )
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
