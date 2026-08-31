import { useMemo } from 'react'
import { useData } from './useData'

/**
 * `palau_context.json`: the indicators on which Palau is an outlier among its
 * own neighbours, written by 06_palau_context.ipynb. Each record carries every
 * island's value plus Palau's rank, the peer median and a robust z.
 *
 * Ranks are Pacific-only: this file answers "does Palau stand out from the
 * islands around it", not "where is Palau in the world".
 */

const BASE = import.meta.env.BASE_URL

export const CONTEXT_URL = `${BASE}data/palau_context.json`

/**
 * The scene's script. Each row names a candidate explanation, the indicator
 * that shows where Palau stands on it, and what that reads as.
 *
 * The explanations that do not fit come first on purpose. A line-up where
 * every suspect is guilty is not a case. It is a chart of one country's
 * superlatives. The tourism row is what makes the four below it worth
 * believing.
 *
 * `verdict` is not printed anywhere: it only picks up the row's styling, so a
 * poor fit reads as struck through rather than as a graded score.
 */
export const HYPOTHESES = [
  {
    id: 'visitors_per_capita',
    claim: 'Is it tourism?',
    measure: 'Amount of tourists per resident per year.',
    verdict: 'ruled-out',
    reading: '',
  },
  {
    id: 'waste_per_capita',
    claim: 'Is it the waste?',
    measure: 'Generated waste, per person, per day.',
    verdict: 'partial',
    reading: '',
  },
  {
    id: 'electricity_per_capita',
    claim: 'Is it the grid?',
    measure: 'Electricity generated per person over a year.',
    verdict: 'holds',
    reading: '',
  },
  {
    id: 'capacity_per_capita',
    claim: 'Is it built oversized?',
    measure: 'Size of power plants per person.',
    verdict: 'holds',
    reading: '',
  },
  {
    id: 'energy_per_capita',
    claim: 'Is it energy consumption?',
    measure: 'Energy consumption per person.',
    verdict: 'holds',
    reading: '',
  },
  {
    id: 'energy_intensity',
    claim: 'Is it how the economy runs?',
    measure: 'Energy burned for every dollar the economy produces.',
    verdict: 'holds',
    reading: '',
  },
]

export function usePalauContext() {
  const { data, loading, error } = useData(CONTEXT_URL)

  const headline = useMemo(
    () => data?.indicators.find((d) => d.id === 'ghg_per_capita') ?? null,
    [data],
  )

  const rows = useMemo(() => {
    if (!data) return []
    return HYPOTHESES.map((h) => ({
      ...h,
      indicator: data.indicators.find((d) => d.id === h.id),
    })).filter((h) => h.indicator)
  }, [data])

  return { headline, rows, meta: data?.meta ?? null, loading, error }
}
