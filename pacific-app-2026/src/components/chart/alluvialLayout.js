export const NODE_W = 10
export const MIN_H = 3
export const MAX_H = 52
export const SPINE_W = 2
export const SPINE_H = 1.65

const THICK = 3.4
const TIE_GAP = 1.2

export function thickness(asr) {
  return Math.max(MIN_H, Math.min(MAX_H, THICK * Math.sqrt(Math.max(0, asr))))
}

/**
 * Place each country at its rank. Ties stack as a block centred on the
 * shared rank. Thickness is ASR (sqrt, clamped). Ribbons join the same
 * iso across columns.
 */
export function layoutAlluvial(items, x, y, height) {
  const nCol = x.length
  const byIso = Array.from({ length: nCol }, () => new Map())

  for (let c = 0; c < nCol; c += 1) {
    const present = items
      .map((item) => ({ item, rank: item.ranks[c], asr: item.values[c] }))
      .filter((d) => d.rank != null && Number.isFinite(d.asr) && d.asr >= 0)
      .sort((a, b) => a.rank - b.rank || a.item.iso.localeCompare(b.item.iso))

    const groups = []
    for (const d of present) {
      const last = groups[groups.length - 1]
      if (last && last.rank === d.rank) last.members.push(d)
      else groups.push({ rank: d.rank, members: [d] })
    }

    for (const group of groups) {
      let heights = group.members.map((d) => thickness(d.asr))
      let gap = TIE_GAP
      let totalH = heights.reduce((s, h) => s + h, 0) + gap * Math.max(0, heights.length - 1)
      if (totalH > height && totalH > 0) {
        const scale = height / totalH
        heights = heights.map((h) => Math.max(0.55, h * scale))
        totalH = heights.reduce((s, h) => s + h, 0) + gap * Math.max(0, heights.length - 1)
        if (totalH > height) {
          gap = 0
          const inner = height / group.members.length
          heights = heights.map(() => inner)
          totalH = height
        }
      }
      const cy = y(group.rank)
      let y0 = cy - totalH / 2
      if (y0 < 0) y0 = 0
      if (y0 + totalH > height) y0 = Math.max(0, height - totalH)

      group.members.forEach((d, i) => {
        const h = heights[i]
        const node = {
          iso: d.item.iso,
          cx: x[c],
          x0: x[c] - NODE_W / 2,
          x1: x[c] + NODE_W / 2,
          y0,
          y1: y0 + h,
          yc: y0 + h / 2,
          asr: d.asr,
          rank: d.rank,
        }
        byIso[c].set(d.item.iso, node)
        y0 += h + gap
      })
    }
  }

  const rows = items.map((item) => {
    const nodes = byIso.map((col) => col.get(item.iso) ?? null)
    return { ...item, nodes, ribbon: ribbonPath(nodes) }
  })

  return { byIso, rows }
}

/** Thin ribbons on the rank centerline — same path commands as layoutAlluvial. */
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
    const mid = (a.x1 + b.x0) / 2
    d += ` C${mid},${a.y0} ${mid},${b.y0} ${b.x0},${b.y0}`
    d += ` L${b.x1},${b.y0}`
  }
  const last = present[present.length - 1]
  d += ` L${last.x1},${last.y1}`
  for (let i = present.length - 1; i > 0; i -= 1) {
    const b = present[i]
    const a = present[i - 1]
    d += ` L${b.x0},${b.y1}`
    const mid = (a.x1 + b.x0) / 2
    d += ` C${mid},${b.y1} ${mid},${a.y1} ${a.x1},${a.y1}`
  }
  d += ' Z'
  return d
}
