import { useMemo } from 'react'
import { PACIFIC_TERRITORIES } from './allocation'
import { DOT_GT, SPENT_GT } from './ghgBudget2023'

/**
 * "What if every overshooter cut to exactly its fair share?"
 *
 * The reduction is one line of arithmetic - ASR = emissions / allocation, so
 * a country at ASR > 1 has to shed `emissions × (1 − 1/ASR)` to reach 1 - but
 * the answer depends entirely on which rule set the allocation, which is why
 * this runs against whichever of the three ASR tables is on screen.
 *
 * Two scopes are computed side by side because the whole point is their
 * ratio. Under the egalitarian rule the Pacific's entire overshoot is 11.6 Mt
 * and the world's is 36,764 Mt: 0.12 of one swarm dot against 368 of them.
 *
 * Undershooters are left exactly where they are. They do not expand to fill
 * an unused allowance, so "everyone at ASR 1" lands slightly *under* the
 * world budget rather than exactly on it. That is a deliberate reading of the
 * question ("who has to give something up"), and it is why the arithmetic in
 * the footnote does not close to 6.81 Gt.
 */

const PACIFIC_ISOS = PACIFIC_TERRITORIES.map((t) => t.iso)

/** Megatonnes represented by one swarm dot. The upstream unit, unchanged. */
export const DOT_MT = DOT_GT * 1000

/** Territorial GHG in the study year, megatonnes. */
const WORLD_MT = SPENT_GT * 1000

/** The 2023 field: one dot per 0.1 Gt. Constant, so the swarm never re-packs. */
export const TOTAL_DOTS = Math.round(WORLD_MT / DOT_MT)

/**
 * Scroll beats inside `#reduction`.
 * Each rule arrives as the live ASR map, then the same map with overshooters
 * clamped to 1. Hold hands both controls to the reader.
 */
export const REDUCTION_BEATS = {
  empty: 0,
  gf: 1,
  gfCut: 2,
  eg: 3,
  egCut: 4,
  pr: 5,
  prCut: 6,
  hold: 7,
}

export const REDUCTION_BEAT_COUNT = REDUCTION_BEATS.hold + 1

/** Method on screen, and whether the fair-share clamp is on, for a scroll beat. */
export function reductionBeatState(beat) {
  if (beat <= REDUCTION_BEATS.empty) return { methodId: null, reduced: false }
  if (beat <= REDUCTION_BEATS.gfCut) {
    return { methodId: 'gf', reduced: beat >= REDUCTION_BEATS.gfCut }
  }
  if (beat <= REDUCTION_BEATS.egCut) {
    return { methodId: 'eg', reduced: beat >= REDUCTION_BEATS.egCut }
  }
  return { methodId: 'pr', reduced: beat >= REDUCTION_BEATS.prCut }
}

/** What a country at ASR > 1 must shed to land on 1. Zero for everyone else. */
export function excessMt(emissionsMt, asr) {
  if (!Number.isFinite(emissionsMt) || !Number.isFinite(asr) || asr <= 1) return 0
  return emissionsMt * (1 - 1 / asr)
}

/**
 * The same ASR map with every overshoot pulled down to exactly 1.
 *
 * Returning a new Map rather than a flag means `AllocationMap` draws the
 * reduced world with no changes at all: it is still just plotting the ratios
 * it was handed. Undershooters keep their real value, so the islands already
 * inside their share visibly stay where they are.
 */
export function clampToFairShare(values) {
  if (!values) return null
  const out = new Map()
  for (const [iso, asr] of values) out.set(iso, Math.min(asr, 1))
  return out
}

/** Excess over one set of countries, plus who could not be scored. */
function scopeExcess(rows, values, isos) {
  let excess = 0
  let emittedMt = 0
  const over = []
  const unscored = []

  for (const iso of isos) {
    const row = rows.get(iso)
    if (!row) continue
    const asr = values.get(iso)
    if (!Number.isFinite(asr)) {
      /* No ratio under this rule - prioritarian has no PPP GDP for New
         Caledonia or French Polynesia. Such a country is not silently
         counted as compliant; the scene flags it. */
      unscored.push(iso)
      continue
    }
    emittedMt += row.emissions_mt
    const ex = excessMt(row.emissions_mt, asr)
    if (ex > 0) {
      excess += ex
      over.push(iso)
    }
  }

  return {
    excessMt: excess,
    emittedMt,
    overCount: over.length,
    over,
    unscored,
    dots: excess / DOT_MT,
    pctOfWorld: (excess / WORLD_MT) * 100,
  }
}

/**
 * @param {Map<string, object>} rows   iso3 → contributions.json country record
 * @param {Map<string, number>} values iso3 → ASR under the rule on screen
 */
export function reductionFigures(rows, values) {
  if (!rows || !values) return null
  return {
    worldMt: WORLD_MT,
    totalDots: TOTAL_DOTS,
    pacific: scopeExcess(rows, values, PACIFIC_ISOS),
    world: scopeExcess(rows, values, [...rows.keys()]),
  }
}

export function useReductionFigures(rows, values) {
  return useMemo(() => reductionFigures(rows, values), [rows, values])
}
