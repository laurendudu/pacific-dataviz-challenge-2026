import { useState, useEffect, useMemo } from 'react'

/**
 * Each country's share of world greenhouse gas emissions in a single year,
 * as a percentage: notebook 04's `contributions.json`.
 *
 * Keyed for the map by `iso_n3`, ISO 3166-1 numeric, which is the id
 * world-atlas already puts on its features, so the join needs no name
 * matching. 206 countries; the eight map features with no entry (Antarctica,
 * Kosovo, Western Sahara, the Falklands and other dependencies) fall through
 * to the no-data grey.
 */
const URL = `${import.meta.env.BASE_URL}data/contributions.json`

export function useContributions() {
  const [state, setState] = useState({ data: null, error: null })

  useEffect(() => {
    let cancelled = false
    fetch(URL)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${URL}`)
        return res.json()
      })
      .then((data) => { if (!cancelled) setState({ data, error: null }) })
      .catch((error) => { if (!cancelled) setState({ data: null, error }) })
    return () => { cancelled = true }
  }, [])

  const { data, error } = state

  /* One pass into a Map keyed by iso_n3. The globe looks up ~180 features on
     every turn, so this must not be a find() over the array. */
  const shares = useMemo(() => {
    if (!data) return null
    return new Map(data.countries.map((c) => [c.iso_n3, c.share_pct]))
  }, [data])

  /* Full records keyed by iso3: the allocation metric needs emissions and
     population, not just the share the globe colours by. */
  const rows = useMemo(() => {
    if (!data) return null
    return new Map(data.countries.map((c) => [c.iso_code, c]))
  }, [data])

  return {
    shares,
    rows,
    meta: data?.meta ?? null,
    pacific: data?.pacific ?? null,
    error,
  }
}
