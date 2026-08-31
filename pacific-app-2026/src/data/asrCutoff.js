/**
 * Interpolated rank where ASR crosses `threshold` (default 1).
 * `fallback: 'end'` places the mark at the top (all values above) or at
 * `maxRank` / the bottom of the scale (all values below) so a reference
 * like ASR = 100 still shows when nobody crosses it.
 */
export function asrCutoffRank(items, col, threshold = 1, options = {}) {
  const fallback = options.fallback ?? null
  const maxRank = options.maxRank
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
  if (lo > threshold) {
    if (fallback !== 'end') return null
    return pts[0].rank
  }
  if (hi < threshold) {
    if (fallback !== 'end') return null
    return maxRank ?? pts[pts.length - 1].rank
  }
  if (lo === threshold) return pts[0].rank
  let i = 0
  while (i < pts.length && pts[i].value < threshold) i += 1
  if (i === 0) return pts[0].rank
  if (i >= pts.length) return fallback === 'end' ? (maxRank ?? pts[pts.length - 1].rank) : null
  const a = pts[i - 1]
  const b = pts[i]
  const span = b.value - a.value
  if (span === 0) return a.rank
  return a.rank + ((threshold - a.value) / span) * (b.rank - a.rank)
}
