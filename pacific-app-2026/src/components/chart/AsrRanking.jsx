import { useEffect, useId, useMemo, useState } from 'react'
import { Delaunay } from 'd3-delaunay'
import { scaleLinear } from 'd3-scale'
import { motion, useReducedMotion } from 'motion/react'
import { asrCutoffRank } from '../../data/asrCutoff'
import { ChartFrame } from './ChartFrame'
import { layoutAlluvial, layoutSpine, packedCutoffY, MIN_H, NODE_W } from './alluvialLayout'

const MARGIN = { top: 52, right: 200, bottom: 20, left: 136 }
const COMPACT_MARGIN = { top: 56, right: 88, bottom: 16, left: 100 }
const HIT_R = 36
const LABEL_GAP = 14
const CUTOFF_LABEL_GAP = 18
const GREY_BATCHES = 4
const CUTOFF_TICK = 28
const CUTOFF_DASH = '10 8'
const CUTOFF_DASH_HI = '8 6'

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
    () => layoutAlluvial(rows.items, x, height),
    [rows.items, x, height],
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
  const cutoffYs = useMemo(() => {
    if (volume) {
      return columns.map((_, i) => packedCutoffY(fat.byIso[i], 1))
    }
    return columns.map((_, i) => {
      const rank = asrCutoffRank(cutoffSource, i, 1)
      return rank == null ? null : y(rank)
    })
  }, [volume, columns, fat.byIso, cutoffSource, y])
  const cutoff100Y = useMemo(() => {
    if (volume) {
      return packedCutoffY(fat.byIso[lastCol], 100, { fallback: 'end' })
    }
    const rank = asrCutoffRank(cutoffSource, lastCol, 100, {
      fallback: 'end',
      maxRank: rows.maxRank,
    })
    return rank == null ? null : y(rank)
  }, [volume, fat.byIso, lastCol, cutoffSource, rows.maxRank, y])

  const labels = useMemo(() => {
    if (!livePr) return []
    const notes = []
    if (cutoffYs[lastCol] != null) {
      notes.push({ id: 'asr-1', label: 'ASR = 1', py: cutoffYs[lastCol], hi: false })
    }
    if (cutoff100Y != null) {
      notes.push({ id: 'asr-100', label: 'ASR = 100', py: cutoff100Y, hi: true })
    }
    const getPy = volume
      ? (row) => fat.byIso[lastCol]?.get(row.iso)?.yc ?? null
      : (row) => {
          const rank = row.ranks[lastCol] ?? lastRank(row.ranks)
          return rank == null ? null : y(rank)
        }
    return placeAllLabels(labelled, notes, getPy, height)
  }, [labelled, lastCol, y, height, livePr, volume, fat.byIso, cutoffYs, cutoff100Y])

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
        {volume ? null : (
          <text x={-6} y={0} dy="0.32em" textAnchor="end">1</text>
        )}
        <ExtentNote y={height} label="highest ASR" compact={compact} />
        {volume ? null : (
          <text x={-6} y={height} dy="0.32em" textAnchor="end">{rows.maxRank}</text>
        )}
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
              if (!fatRow) return null
              return (
                <g key={row.iso}>
                  {fatRow.ribbon ? <path d={fatRow.ribbon} /> : null}
                  {fatRow.nodes.map((node, i) => (
                    node && i <= lastLive ? (
                      <rect
                        key={i}
                        x={node.x0}
                        y={node.y0}
                        width={NODE_W}
                        height={Math.max(0.4, node.y1 - node.y0)}
                      />
                    ) : null
                  ))}
                </g>
              )
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
            lastLive={lastLive}
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
            lastLive={lastLive}
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
          const px = x[lastCol]
          const py = item.py
          const ly = item.placed
          const lead = Math.abs(ly - py) > 6
          const tx = px + (lead ? 24 : volume ? NODE_W / 2 + 8 : 12)
          if (item.kind === 'cutoff') {
            return (
              <g
                key={`cutlbl-${item.id}`}
                className={`rank__cutoff-label${item.hi ? ' rank__cutoff-label--hi' : ''}`}
              >
                {lead ? (
                  <path
                    className="rank__leader rank__leader--cutoff"
                    d={`M${px + (volume ? NODE_W / 2 + 4 : 6)},${py} C${px + 14},${py} ${px + 14},${ly} ${px + 20},${ly}`}
                  />
                ) : null}
                <text x={tx} y={ly} dy="0.32em" textAnchor="start">
                  {item.label}
                </text>
              </g>
            )
          }
          const row = item.row
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
              <text x={tx} y={ly} dy="0.32em" textAnchor="start">
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
                x={x[tiedCol] - 92}
                y={tieLabelBelow ? tieY + 4 : tieY - 8}
                width={82}
                height={14}
                rx={2}
              />
              <text
                x={x[tiedCol] - 10}
                y={tieLabelBelow ? tieY + 15 : tieY}
                dy={tieLabelBelow ? undefined : '0.32em'}
                textAnchor="end"
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
            y={cutoff100Y}
            height={height}
            kind="hi"
          />
        </motion.g>
        {columns.map((col, i) => {
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
                y={cutoffYs[i]}
                height={height}
                kind="one"
              />
            </motion.g>
          )
        })}
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

function MorphRibbon({ group, thin, fat, volume, dim, transition, lastLive = 2 }) {
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
      {volume
        ? fat?.nodes.map((node, i) => (
            node && i <= lastLive ? (
              <rect
                key={`n-${i}`}
                x={node.x0}
                y={node.y0}
                width={NODE_W}
                height={Math.max(0.4, node.y1 - node.y0)}
              />
            ) : null
          ))
        : null}
    </g>
  )
}

function CutoffMark({ x, y: py, height, kind = 'one', tick = CUTOFF_TICK }) {
  if (py == null) return null
  const yLine = Math.max(0.75, Math.min(height - 1.5, py))
  const hi = kind === 'hi'
  return (
    <g className={`rank__cutoff${hi ? ' rank__cutoff--hi' : ''}`}>
      <line
        x1={x - tick}
        x2={x + tick}
        y1={yLine}
        y2={yLine}
        strokeLinecap="butt"
        strokeDasharray={hi ? CUTOFF_DASH_HI : CUTOFF_DASH}
      />
    </g>
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

function placeAllLabels(labelled, notes, getPy, height) {
  const locked = packY(
    notes
      .filter((n) => n.py != null && Number.isFinite(n.py))
      .map((n) => ({
        kind: 'cutoff',
        id: n.id,
        label: n.label,
        hi: n.hi,
        py: n.py,
        placed: Math.max(0, Math.min(height, n.py)),
      })),
    height,
    CUTOFF_LABEL_GAP,
  )
  const countries = labelled
    .map((row) => {
      const py = getPy(row)
      if (py == null || !Number.isFinite(py)) return null
      return { kind: 'country', row, py, placed: py }
    })
    .filter(Boolean)
  const packed = dodgeBlockers(
    countries,
    locked.map((n) => n.placed),
    height,
    LABEL_GAP,
  )
  return [...locked, ...packed]
}

function packY(items, height, gap) {
  if (!items.length) return items
  const sorted = [...items].sort((a, b) => a.placed - b.placed)
  let prev = -Infinity
  for (const item of sorted) {
    item.placed = Math.max(item.placed, prev + gap)
    prev = item.placed
  }
  prev = height + gap
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    sorted[i].placed = Math.min(sorted[i].placed, prev - gap, height)
    prev = sorted[i].placed
  }
  prev = -gap
  for (const item of sorted) {
    item.placed = Math.max(item.placed, prev + gap, 0)
    prev = item.placed
  }
  return sorted
}

function dodgeBlockers(items, blockers, height, gap) {
  const occ = [...blockers].sort((a, b) => a - b)
  const dodgeUp = (value) => {
    let placed = value
    for (const b of occ) {
      if (placed > b - gap && placed < b + gap) placed = b + gap
    }
    return placed
  }
  const dodgeDown = (value) => {
    let placed = value
    for (let i = occ.length - 1; i >= 0; i -= 1) {
      const b = occ[i]
      if (placed > b - gap && placed < b + gap) placed = b - gap
    }
    return placed
  }
  const sorted = [...items].sort((a, b) => a.placed - b.placed)
  let prev = -Infinity
  for (const item of sorted) {
    item.placed = dodgeUp(Math.max(item.placed, prev + gap))
    prev = item.placed
  }
  prev = height + gap
  for (let i = sorted.length - 1; i >= 0; i -= 1) {
    sorted[i].placed = dodgeDown(Math.min(sorted[i].placed, prev - gap, height))
    prev = sorted[i].placed
  }
  prev = -gap
  for (const item of sorted) {
    item.placed = dodgeUp(Math.max(item.placed, prev + gap, 0))
    prev = item.placed
  }
  for (const item of sorted) {
    item.placed = Math.max(0, Math.min(height, item.placed))
  }
  return sorted
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
