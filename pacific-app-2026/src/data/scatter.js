import { useMemo } from 'react'
import { format } from 'd3-format'
import { PRINCIPLES } from './allocation'
import { useData } from './useData'

/**
 * The country panel behind the Pacific-vs-world scatters, written by
 * 07_exposure.ipynb: 198 countries at 2023, each with an ASR under the three
 * allocation rules and two x candidates.
 *
 * `exposure` is the ND-GAIN Country Index exposure score (0-1, higher is more
 * exposed) — the physical component of ND-GAIN's vulnerability index, not the
 * composite. The composite folds in sensitivity and adaptive capacity, which
 * are development indicators: it correlates -0.83 with log GDP per capita
 * against exposure's -0.50, so a chart built on it plots poverty and calls it
 * climate. ND-GAIN at all, rather than INFORM or the WorldRiskIndex, because
 * those score absolute humanitarian impact and so weight by population — both
 * rank Tuvalu among the *safest* countries on earth.
 *
 * `gdp` is World Bank GDP per capita, PPP in constant 2017 USD — the same GDP
 * the prioritarian rule allocates on.
 *
 * Either can be null: New Caledonia and French Polynesia have an ASR but appear
 * in neither source, being territories rather than countries.
 */
const BASE = import.meta.env.BASE_URL

export const SCATTER_URL = `${BASE}data/scatter.json`

export const SCATTER_PLOTS = PRINCIPLES.map((p) => ({
  id: p.id,
  title: p.title,
  rule: p.rule,
}))

const formatGdp = format('$.2~s')
const formatAsr = format('.2~f')
const formatExposure = format('.3~f')

/**
 * The two things the x axis can be. `key` is the field on a country row;
 * `scale` picks d3's linear or log constructor in the chart.
 *
 * Exposure is linear because ND-GAIN is already a bounded 0-1 index and the
 * whole world sits inside 0.26-0.72 — a log axis would compress the only range
 * that carries any signal. GDP per capita spans 125x and is log.
 */
export const X_VARS = [
  {
    id: 'exposure',
    key: 'exposure',
    scale: 'linear',
    label: 'Exposure',
    axisLabel: 'Climate exposure (ND-GAIN)',
    format: formatExposure,
    /** Low-to-high reading, drawn under the axis so the direction is explicit. */
    ends: ['less exposed', 'more exposed'],
    lede: 'Physical exposure rises to the right — sea level, heat, rainfall, crop yield, and how much of a country stands in their way. The Pacific gathers where the harm lands and the overshoot is smallest.',
  },
  {
    id: 'gdp',
    key: 'gdp',
    scale: 'log',
    label: 'Economic power',
    axisLabel: 'GDP per capita (PPP, 2017 USD)',
    format: formatGdp,
    ends: ['poorer', 'richer'],
    lede: 'Wealth rises to the right. The same cloud, sorted by the capacity to act rather than by the need to.',
  },
]

export const X_VAR_BY_ID = Object.fromEntries(X_VARS.map((v) => [v.id, v]))

/** The x value for one country under one axis choice, or null if unplottable. */
export function xOf(country, xVarId) {
  const value = country?.[X_VAR_BY_ID[xVarId]?.key]
  return Number.isFinite(value) ? value : null
}

export function asrOf(country, methodId) {
  const value = country?.asr?.[methodId]
  return Number.isFinite(value) ? value : null
}

/**
 * Fetches the panel. Returns an empty array while loading so callers can map
 * over it without a null guard; `loading` and `error` carry the real state.
 */
export function useScatterCountries() {
  const { data, loading, error } = useData(SCATTER_URL)

  const countries = useMemo(() => data?.countries ?? [], [data])

  return { countries, year: data?.year ?? null, loading, error }
}

export { formatGdp, formatAsr, formatExposure }
