import { useState, useEffect } from 'react'

const EMPTY = { path: null, data: null, error: null }

/**
 * Loads a JSON/CSV file from public/data (symlinked to ../data_viz).
 * Uses fetch, not d3-fetch: d3's loader is a rendering-era convenience and
 * is banned here. Parse with d3-dsv if a CSV needs it; that module is math.
 *
 * `loading` is derived during render rather than set in the effect, so a new
 * `path` reads as loading immediately instead of one render late.
 */
export function useData(path, parse) {
  const [result, setResult] = useState(EMPTY)

  useEffect(() => {
    let cancelled = false

    fetch(path)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${path}`)
        return parse ? res.text().then(parse) : res.json()
      })
      .then((data) => { if (!cancelled) setResult({ path, data, error: null }) })
      .catch((error) => { if (!cancelled) setResult({ path, data: null, error }) })

    return () => { cancelled = true }
  }, [path, parse])

  const settled = result.path === path
  return {
    data: settled ? result.data : null,
    error: settled ? result.error : null,
    loading: !settled,
  }
}
