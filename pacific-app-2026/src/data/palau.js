import { useMemo } from 'react'
import { median } from 'd3-array'
import { useData } from './useData'
import { ASR_URL } from './asr'

/**
 * The Palau case file. Three hypotheses for why one island of 17,772 people
 * carries the highest ASR in the project, each with the evidence that tests it.
 *
 * Written by 05_tourism.ipynb and 06_energy.ipynb; the ASR series is the same
 * asr.json the ranking scenes read.
 */

const BASE = import.meta.env.BASE_URL

export const TOURISM_URL = `${BASE}data/tourism.json`
export const ENERGY_URL = `${BASE}data/energy.json`

export const ISO = 'PLW'
export const SNAPSHOT_YEAR = 2019 // last pre-COVID year, and the only world-rankable one
export const TEST_YEARS = [2018, 2019, 2020, 2021, 2022, 2023]
export const TEST_BASE_YEAR = 2019

export function usePalauCase() {
  const tourism = useData(TOURISM_URL)
  const energy = useData(ENERGY_URL)
  const asr = useData(ASR_URL)

  const loading = tourism.loading || energy.loading || asr.loading
  const error = tourism.error || energy.error || asr.error

  const visitors = useMemo(
    () => buildVisitors(tourism.data),
    [tourism.data],
  )
  const power = useMemo(() => buildPower(energy.data), [energy.data])
  const test = useMemo(
    () => buildTest(tourism.data, energy.data, asr.data),
    [tourism.data, energy.data, asr.data],
  )

  const headline = useMemo(
    () => buildHeadline(energy.data, asr.data),
    [energy.data, asr.data],
  )

  return { headline, visitors, power, test, loading, error }
}

/**
 * The two numbers in the title. Read from the data rather than typed in, so
 * re-running 03 or 06 cannot leave the headline saying something the charts
 * below it contradict.
 */
function buildHeadline(energy, asr) {
  if (!energy || !asr) return null

  const latest = energy.pacific_series
    .filter((d) => d.iso_code === ISO && d.population != null)
    .at(-1)
  const years = Object.keys(asr[ISO] ?? {}).map(Number)
  const year = Math.max(...years)

  return {
    population: latest.population,
    populationYear: latest.year,
    asr: asr[ISO][year],
    asrYear: year,
  }
}

/**
 * Hypothesis 1 — visitors. Every country's arrivals per resident in 2019, so
 * the chart can draw the distribution Palau sits inside rather than only its
 * rank. Values of zero are dropped: the axis is logarithmic.
 */
function buildVisitors(tourism) {
  if (!tourism) return null

  const values = tourism.ranking
    .map((d) => d.tourists_per_capita)
    .filter((v) => v > 0)

  const palau = tourism.snapshot.find((d) => d.iso_code === ISO)
  const pacific = tourism.snapshot
    .filter((d) => d.iso_code !== ISO)
    .map((d) => ({ iso: d.iso_code, name: d.name, value: d.tourists_per_capita }))
    .filter((d) => d.value > 0)

  return {
    values,
    pacific,
    palau: palau.tourists_per_capita,
    rank: palau.rank,
    count: tourism.meta.ranked_countries,
    median: median(values),
    year: tourism.meta.snapshot_year,
  }
}

/**
 * Hypothesis 2 — energy. Electricity per resident for every country in the
 * snapshot year, plus the oil share that says what it is made from.
 */
function buildPower(energy) {
  if (!energy) return null

  const rows = energy.snapshot.filter((d) => d.per_capita_electricity > 0)
  const palau = rows.find((d) => d.iso_code === ISO)

  return {
    values: rows.map((d) => d.per_capita_electricity),
    pacific: rows
      .filter((d) => d.is_pacific && d.iso_code !== ISO)
      .map((d) => ({ iso: d.iso_code, name: d.name, value: d.per_capita_electricity })),
    palau: palau.per_capita_electricity,
    oilShare: palau.oil_share_elec,
    renewablesShare: palau.renewables_share_elec,
    rankOil: palau.rank_oil,
    count: rows.length,
    median: energy.meta.world_medians.per_capita_electricity,
    oilMedian: energy.meta.world_medians.oil_share_elec,
    year: energy.meta.snapshot_year,
  }
}

/**
 * The test. Three quantities indexed to 2019 = 100, which is the only honest
 * way to put arrivals, emissions and generation on one axis.
 *
 * If visitors drove Palau's emissions, a 96% collapse in arrivals would pull
 * the other two lines down with it. Each series runs over the years its own
 * source covers — arrivals stop at 2021 — so the gap is visible rather than
 * interpolated.
 */
function buildTest(tourism, energy, asr) {
  if (!tourism || !energy || !asr) return null

  const arrivals = byYear(
    tourism.series.filter((d) => d.iso_code === ISO),
    'tourists',
  )
  const generation = byYear(
    energy.pacific_series.filter((d) => d.iso_code === ISO),
    'total_gwh',
  )
  const emissions = new Map(
    Object.entries(asr[ISO] ?? {}).map(([year, value]) => [Number(year), value]),
  )

  const series = [
    { id: 'arrivals', label: 'Tourist arrivals', values: arrivals },
    { id: 'emissions', label: 'Emissions (ASR)', values: emissions },
    { id: 'generation', label: 'Electricity generated', values: generation },
  ].map((s) => {
    const base = s.values.get(TEST_BASE_YEAR)
    return {
      ...s,
      /* Number.isFinite, not != null: a missing base year would make every
         point NaN, and NaN survives a null check all the way into the path. */
      points: TEST_YEARS.map((year) => ({
        year,
        value: (s.values.get(year) / base) * 100,
      })).filter((p) => Number.isFinite(p.value)),
    }
  })

  const drop = (id) => {
    const points = series.find((s) => s.id === id).points
    return points[points.length - 1]
  }

  return {
    series,
    baseYear: TEST_BASE_YEAR,
    arrivalsLow: Math.min(...series[0].points.map((p) => p.value)),
    emissionsEnd: drop('emissions'),
    generationEnd: drop('generation'),
  }
}

function byYear(rows, field) {
  return new Map(
    rows.filter((d) => d[field] != null).map((d) => [d.year, d[field]]),
  )
}
