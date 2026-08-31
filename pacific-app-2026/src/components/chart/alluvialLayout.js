export const NODE_W = 10
export const MIN_H = 3
export const MAX_H = 52
export const SPINE_W = 2
export const SPINE_H = 1.65

const THICK = 3.4
const PACK_GAP = 1.2
const MIN_PACK = 0.5

export function thickness(asr) {
  return Math.max(MIN_H, Math.min(MAX_H, THICK * Math.sqrt(Math.max(0, asr))))
}

/**
 * Volume (ASR) layout: pack every visible country in rank order, lowest ASR
 * at the top, so ribbon thickness cannot overlap. Leftover height becomes
 * gap; if the stack is too tall, thicknesses scale down together.
 */
export function layoutAlluvial(items, x, height) {
  const nCol = x.length
  const byIso = Array.from({ length: nCol }, () => new Map())

  for (let c = 0; c < nCol; c += 1) {
    const present = items
      .map((item) => ({ item, rank: item.ranks[c], asr: item.values[c] }))
      .filter((d) => d.rank != null && Number.isFinite(d.asr) && d.asr >= 0)
      .sort((a, b) => a.rank - b.rank || a.item.iso.localeCompare(b.item.iso))

    const packed = packColumn(present, height)
    packed.forEach((node, i) => {
      const d = present[i]
      byIso[c].set(d.item.iso, {
        iso: d.item.iso,
        cx: x[c],
        x0: x[c] - NODE_W / 2,
        x1: x[c] + NODE_W / 2,
        y0: node.y0,
        y1: node.y1,
        yc: node.yc,
        asr: d.asr,
        rank: d.rank,
      })
    })
  }

  const rows = items.map((item) => {
    const nodes = byIso.map((col) => col.get(item.iso) ?? null)
    return { ...item, nodes, ribbon: ribbonPath(nodes) }
  })

  return { byIso, rows }
}

function packColumn(present, height) {
  const n = present.length
  if (!n) return []
  let heights = present.map((d) => thickness(d.asr))
  let used = heights.reduce((s, h) => s + h, 0)

  if (n === 1) {
    const h = Math.min(heights[0], height)
    const y0 = Math.max(0, (height - h) / 2)
    return [{ y0, y1: y0 + h, yc: y0 + h / 2 }]
  }

  let gap = PACK_GAP
  if (used + gap * (n - 1) > height) {
    const scale = height / (used + PACK_GAP * (n - 1))
    heights = heights.map((h) => Math.max(MIN_PACK, h * scale))
    used = heights.reduce((s, h) => s + h, 0)
    if (used >= height) {
      gap = 0
      const s = height / used
      heights = heights.map((h) => h * s)
      used = height
    } else {
      gap = (height - used) / (n - 1)
    }
  } else {
    gap = (height - used) / (n - 1)
  }

  const nodes = []
  let y0 = 0
  for (let i = 0; i < n; i += 1) {
    const h = heights[i]
    const y1 = i === n - 1 ? height : y0 + h
    nodes.push({ y0, y1, yc: (y0 + y1) / 2 })
    y0 = y1 + gap
  }
  return nodes
}

/**
 * Pixel y where ASR crosses `threshold` in a packed column.
 * Sits in the gap between the last country below and the first at or above.
 */
export function packedCutoffY(colMap, threshold, options = {}) {
  if (!colMap || colMap.size === 0) return null
  const nodes = [...colMap.values()].sort((a, b) => a.y0 - b.y0 || a.rank - b.rank)
  const lo = nodes[0]
  const hi = nodes[nodes.length - 1]
  if (lo.asr > threshold) {
    return options.fallback === 'end' ? lo.y0 : null
  }
  if (hi.asr < threshold) {
    return options.fallback === 'end' ? hi.y1 : null
  }
  if (lo.asr === threshold) return lo.yc
  let i = 0
  while (i < nodes.length && nodes[i].asr < threshold) i += 1
  if (i === 0) return nodes[0].yc
  if (i >= nodes.length) return options.fallback === 'end' ? hi.y1 : null
  const a = nodes[i - 1]
  const b = nodes[i]
  if (b.asr === threshold) return b.yc
  const span = b.asr - a.asr
  if (span === 0) return (a.y1 + b.y0) / 2
  const t = (threshold - a.asr) / span
  return a.y1 + t * (b.y0 - a.y1)
}

/** Thin ribbons on the rank centerline: same path commands as layoutAlluvial. */
export function layoutSpine(items, x, y) {
  const rows = items.map((item) => {
    const nodes = item.ranks.map((rank, c) => {
      const asr = item.values[c]
      if (rank == null || !Number.isFinite(asr) || asr < 0) return null
      const yc = y(rank)
      return {
        iso: item.iso,
        cx: x[c],
        x0: x[c] - SPINE_W / 2,
        x1: x[c] + SPINE_W / 2,
        y0: yc - SPINE_H / 2,
        y1: yc + SPINE_H / 2,
        yc,
        asr,
        rank,
      }
    })
    return { ...item, nodes, ribbon: ribbonPath(nodes) }
  })
  return { rows }
}

/** One closed path through every present column for a single country. */
export function ribbonPath(nodes) {
  const present = nodes.filter(Boolean)
  if (present.length < 2) return ''
  let d = `M${present[0].x1},${present[0].y0}`
  for (let i = 1; i < present.length; i += 1) {
    const a = present[i - 1]
    const b = present[i]
    const cx = a.x1 + 0.28 * (b.x0 - a.x1)
    d += ` C${cx},${a.y0} ${cx},${b.y0} ${b.x0},${b.y0}`
    d += ` L${b.x1},${b.y0}`
  }
  const last = present[present.length - 1]
  d += ` L${last.x1},${last.y1}`
  for (let i = present.length - 1; i > 0; i -= 1) {
    const b = present[i]
    const a = present[i - 1]
    d += ` L${b.x0},${b.y1}`
    const cx = a.x1 + 0.28 * (b.x0 - a.x1)
    d += ` C${cx},${b.y1} ${cx},${a.y1} ${a.x1},${a.y1}`
  }
  d += ' Z'
  return d
}
