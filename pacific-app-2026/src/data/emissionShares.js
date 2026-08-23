import { useState, useEffect } from 'react'

/**
 * Each country's share of world greenhouse gas emissions, as a percentage.
 * Built by the Python pipeline from Our World in Data + SPC .Stat and keyed
 * by zero-padded ISO 3166-1 numeric — the same ids world-atlas puts on its
 * map features, so the join needs no name matching.
 */
const URL = '/data/emissions_share.json'

/** Latest year with complete coverage. Bump as the pipeline is re-run. */
export const SHARE_YEAR = '2020'

export function useEmissionShares() {
  const [state, setState] = useState({ shares: null, meta: null, error: null })

  useEffect(() => {
    let cancelled = false
    fetch(URL)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText} — ${URL}`)
        return res.json()
      })
      .then((json) => {
        if (!cancelled) setState({ shares: json.shares, meta: json.meta, error: null })
      })
      .catch((error) => {
        if (!cancelled) setState({ shares: null, meta: null, error })
      })
    return () => { cancelled = true }
  }, [])

  return state
}
