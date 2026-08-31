import { useMemo } from 'react'
import { format } from 'd3-format'
import { PRINCIPLES } from './allocation'
import { useData } from './useData'

/**
 * The country panel behind the Pacific-vs-world scatters, written by
 * 07_exposure.ipynb: 198 countries at 2023, each with an ASR under the three
 * allocation rules and six candidate x variables, five of which are plotted.
 *
 * The axes answer three different questions, and scroll is the argument:
 * who the harm lands on (`exposure`, `loss`), who caused it (`share`,
 * `rents`), and who can afford to act (`gdp`). After the last axis, the
 * same frames are reachable from the toggles.
 *
 * Any of them can be null. New Caledonia and French Polynesia are territories
 * rather than countries and appear in no global index, so they carry an ASR
 * and a position on `share` and `rents` alone; the World Bank has no rents row
 * for the Marshall Islands or Palau; and disaster loss exists only for the 149
 * countries that have ever reported under the Sendai Framework.
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
const formatIndex = format('.3~f')
/** Two significant digits, fixed notation: 0.000009%, 0.024%, 31%. */
const formatPercent = (v) => `${format('.2~r')(v)}%`

/** Linear axes are padded rather than snapped to zero — an index that scores
 *  the whole world inside 0.26-0.66 would sit in the right-hand third. */
const padded = (pad) => (x0, x1) => [x0 - (x1 - x0) * pad, x1 + (x1 - x0) * pad]

/**
 * The five things the x axis can be, in the order the argument runs: who the
 * harm lands on, who caused it, who can afford to act.
 *
 * The panel also carries ND-GAIN's composite `vuln`, and it is deliberately
 * not an axis here. It is the chart most climate entries draw, and the reason
 * this project does not is an argument about what the composite is made of —
 * which a reader cannot see in the picture, because on that axis the Pacific
 * lands hard right too and reads as confirmation. The case against it belongs
 * where it can be shown: 07_exposure.ipynb and the README.
 *
 * `key` is the field on a country row;
 * `scale` names the d3 constructor the chart builds it with; `domain` turns
 * the data extent into the drawn extent; `ticks`, where given, overrides the
 * scale's own, which is unusable on a symlog and too crowded on a log axis
 * spanning seven decades.
 */
export const X_VARS = [
  {
    id: 'exposure',
    key: 'exposure',
    scale: 'linear',
    domain: padded(0.06),
    label: 'Exposure',
    /** Names the value in the tooltip, where the button's label reads as a
     *  sentence fragment rather than a quantity. */
    short: 'exposure',
    axisLabel: 'Climate exposure (ND-GAIN)',
    format: formatIndex,
    /** Low-to-high reading, drawn under the axis so the direction is explicit. */
    ends: ['less exposed', 'more exposed'],
    lede: 'Physical exposure rises to the right — sea level, heat, rainfall, crop yield, and how much of a country stands in their way. The Pacific gathers where the harm lands and the overshoot is smallest.',
    note: 'New Caledonia and French Polynesia are territories and carry no score.',
  },
  {
    id: 'loss',
    key: 'loss',
    scale: 'symlog',
    /** Values run from 0 to 0.35% of GDP across four decades, and a real zero
     *  is a country that reported a year with no qualifying loss. Symlog is
     *  the only scale that takes both; the constant sets where it stops
     *  behaving like a log and starts behaving like a line. */
    constant: 0.001,
    domain: (x0, x1) => [0, x1 * 1.08],
    ticks: [0, 0.001, 0.01, 0.1],
    label: 'Disaster loss',
    short: 'disaster loss',
    axisLabel: 'Direct disaster loss (% of GDP, mean 2015-2024)',
    format: formatPercent,
    ends: ['lost less', 'lost more'],
    lede: 'Harm already paid for, in money: what disasters destroyed each year as a share of the economy. Vanuatu and Tuvalu lose a larger share than any country outside the poorest of Africa and Asia.',
    note: 'Reported loss under the Sendai Framework — a floor, not a measurement, and it understates small islands worst of all: Vanuatu’s largest filed year is 0.41% of GDP over a period containing Cyclone Pam. The Pacific ranks this high anyway; 49 countries have never filed.',
  },
  {
    id: 'share',
    key: 'share',
    scale: 'log',
    domain: (x0, x1) => [x0 * 0.6, x1 * 1.4],
    ticks: [0.00001, 0.001, 0.1, 10],
    label: 'Emissions share',
    short: 'share of world CO₂',
    axisLabel: 'Share of world CO₂ 2000-2023 (%)',
    format: formatPercent,
    ends: ['emitted less', 'emitted more'],
    lede: 'Responsibility rises to the right, across seven decades of it. Every Pacific country together is a rounding error on the emissions the budget was spent on; the countries that spent it sit three to seven decades further right.',
    note: 'Cumulative share rather than emissions per capita, which is the egalitarian ASR restated and would draw a straight line.',
  },
  {
    id: 'rents',
    key: 'rents',
    scale: 'sqrt',
    domain: (x0, x1) => [0, x1 * 1.04],
    ticks: [0, 1, 5, 10, 20, 40, 60],
    label: 'Fossil rents',
    short: 'fossil rents',
    axisLabel: 'Oil, coal and gas rents (% of GDP, mean 2015-2021)',
    format: formatPercent,
    ends: ['sells no carbon', 'sells the most carbon'],
    lede: 'Not who is rich, but who was paid for the overshoot: the share of GDP earned selling fossil fuels. The whole Pacific stands on zero except Papua New Guinea, and the petrostates run out to nearly half of GDP.',
    note: 'The World Bank publishes no rents row for the Marshall Islands or Palau; neither extracts fossil fuels.',
  },
  {
    id: 'gdp',
    key: 'gdp',
    scale: 'log',
    domain: (x0, x1) => [Math.max(400, x0 * 0.85), x1 * 1.1],
    label: 'Economic power',
    short: 'GDP per capita',
    axisLabel: 'GDP per capita (PPP, 2017 USD)',
    format: formatGdp,
    ends: ['poorer', 'richer'],
    lede: 'Wealth rises to the right. The same cloud, sorted by the capacity to act rather than by the need to.',
    note: 'The same GDP the prioritarian rule allocates on.',
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
 * `sources` is the notebook's provenance string per axis, keyed by var id.
 */
export function useScatterCountries() {
  const { data, loading, error } = useData(SCATTER_URL)

  const countries = useMemo(() => data?.countries ?? [], [data])

  return {
    countries,
    year: data?.year ?? null,
    sources: data?.source ?? {},
    loading,
    error,
  }
}

export { formatGdp, formatAsr, formatIndex, formatPercent }
