import { PACIFIC_TERRITORIES } from './allocation'

/**
 * Turning an ASR back into the entitlement it was measured against.
 *
 * ASR = emissions / allocated carrying capacity, so the allocation is just
 * `emissions / ASR`. Summed over the whole panel every table returns 6800 Mt
 * — the world min_cc — so the inversion is exact, not an estimate.
 *
 * Scale note: the budget swarm upstream draws 0.1 Gt to a dot, and the
 * Pacific's entire entitlement is a fraction of one of those dots. So this
 * chart keeps that unit and shows the fraction itself: one dot, drawn large,
 * with the allocation as a wedge of it.
 */

/** One dot of the world budget swarm, in megatonnes. 0.1 Gt. */
export const DOT_MT = 100

const PACIFIC_ISOS = PACIFIC_TERRITORIES.map((t) => t.iso)
const NAME_BY_ISO = new Map(PACIFIC_TERRITORIES.map((t) => [t.iso, t.name]))

/** `null` for a country the rule cannot score (no entry, or a zero ratio). */
export function allocatedMt(emissionsMt, asr) {
  if (!Number.isFinite(emissionsMt) || !Number.isFinite(asr) || asr <= 0) return null
  return emissionsMt / asr
}

/**
 * The Pacific total under one rule, plus the emissions of exactly the
 * territories that rule can score. Prioritarian has no PPP GDP for New
 * Caledonia or French Polynesia, so its coverage is 12 of the 14 — and its
 * percentage is measured against those same 12, never against all 14.
 *
 * @param {Map<string, object>} rows   iso3 → contributions.json country record
 * @param {Map<string, number>} values iso3 → ASR for the year, one rule
 */
export function pacificAllocation(rows, values) {
  if (!rows || !values) return null

  let mt = 0
  let emittedMt = 0
  let population = 0
  const covered = []
  const dropped = []

  for (const iso of PACIFIC_ISOS) {
    const row = rows.get(iso)
    const allocated = row ? allocatedMt(row.emissions_mt, values.get(iso)) : null
    if (allocated == null) {
      dropped.push({ iso, name: NAME_BY_ISO.get(iso) ?? iso })
      continue
    }
    mt += allocated
    emittedMt += row.emissions_mt
    population += row.population ?? 0
    covered.push(iso)
  }

  if (!covered.length) return null

  return {
    mt,
    emittedMt,
    population,
    /* How much of a single 0.1 Gt budget dot the entitlement fills. */
    dotFraction: mt / DOT_MT,
    /* What the rule hands the region, as a share of what it actually emits.
       Over 100 means the rule leaves headroom. */
    pctOfEmissions: emittedMt > 0 ? (mt / emittedMt) * 100 : null,
    tPerCapita: population > 0 ? (mt * 1e6) / population : null,
    covered,
    dropped,
  }
}

/**
 * The world budget the rule actually divides, in megatonnes — the sum of
 * every allocation it can score. Read off the table rather than assumed, so
 * prioritarian's renormalisation over its smaller panel stays exact.
 */
export function worldBudgetMt(rows, values) {
  if (!rows || !values) return null
  let total = 0
  for (const [iso, row] of rows) {
    const allocated = allocatedMt(row.emissions_mt, values.get(iso))
    if (allocated != null) total += allocated
  }
  return total > 0 ? total : null
}
