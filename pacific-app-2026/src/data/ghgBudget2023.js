/**
 * What the world may emit each year, against what it actually emitted in 2023.
 *
 * BUDGET is the *steady-state* climate carrying capacity: the annual level of
 * greenhouse gases that could be sustained indefinitely without pushing global
 * warming past 2 °C. It is not a countdown and carries no target date: emit
 * this much every year, forever, and the climate settles at 2 °C.
 *   6.81 GtCO2-eq/yr, from Bjørn & Hauschild (2015), shipped in pyaesa as
 *   gwp100_lcia_cc_steady_state.csv (min_cc). Confirmed in de Bantel et al.,
 *   "UNCASExt" (arXiv:2606.21465) Fig. 2.
 *   The upper bound (max_cc) is 8.72 Gt, 128% of min_cc.
 *
 * SPENT is territorial greenhouse gases in 2023, all Kyoto gases in CO2-eq,
 * excluding land use, summed over the 198-country panel.
 *   Source: data_viz/contributions.json (meta.world_gt).
 *
 * Deliberately NOT the AR6 pathway budget. A 2 °C pathway allows 42.6 Gt in
 * 2023 (almost exactly what was emitted) because a pathway defers its cuts
 * to later decades. That answers "are we on the curve this year?"; this chart
 * answers "is this level survivable at all?".
 */

export const YEAR = 2023

/** Gigatonnes CO2-eq represented by one dot. Same unit on both swarms. */
export const DOT_GT = 0.1

/** 6.81e12 kg / 1e12. gwp100_lcia_cc_steady_state.csv, min_cc. */
export const BUDGET_GT = 6.81

/** Territorial GHG, 2023. contributions.json meta.world_gt. */
export const SPENT_GT = 43.26

/** How far over: 6.4x. */
export const OVERSHOOT = SPENT_GT / BUDGET_GT

/** The cut needed to reach the sustainable level: 84%. */
export const CUT_PCT = Math.round((1 - BUDGET_GT / SPENT_GT) * 100)

export const BUDGET_DOTS = Math.round(BUDGET_GT / DOT_GT)
export const SPENT_DOTS = Math.round(SPENT_GT / DOT_GT)

export const COLUMNS = [
  {
    id: 'budget',
    title: 'Sustainable each year',
    lead: 'What the world could emit indefinitely and hold at 2 °C.',
    gt: BUDGET_GT,
    dots: BUDGET_DOTS,
    tone: 'safe',
  },
  {
    id: 'spent',
    title: 'Emitted in 2023',
    lead: 'Actual global greenhouse gases that year.',
    gt: SPENT_GT,
    dots: SPENT_DOTS,
    tone: 'high',
  },
]
