import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { format } from 'd3-format'
import { Scene } from '../components/scroll/Scene'
import { AsrRanking } from '../components/chart/AsrRanking'
import { PRINCIPLES, PACIFIC_TERRITORIES } from '../data/allocation'
import { findCountryFeature, useAsrTables, YEAR } from '../data/asr'
import { useContributions } from '../data/contributions'
import { easeInOutSmooth, slice } from '../hooks/useScrollProgress'

const formatAsr = format('.2~f')

/** Pacific names first — every territory — then a few large emitters. */
const LABEL_EMITTERS = ['CHN', 'FRA', 'AUS', 'USA']

const EMITTERS = new Set(['FRA', 'USA', 'AUS', 'CHN', 'IND', 'GBR', 'DEU', 'QAT'])

const FADE = {
  duration: 0.38,
  ease: [0.4, 0, 0.2, 1],
}

const SPRING = { type: 'spring', visualDuration: 0.4, bounce: 0.08 }

/** Scroll windows inside `#ranking` (0–1). Grandfathering is on from 0. */
const EG_WIN = [0.18, 0.40]
const PR_WIN = [0.50, 0.72]

const CAPTIONS = [
  {
    from: 0,
    to: 0.38,
    text: 'Grandfathering ties all 198 countries on one rank — everyone holds the world’s overshoot.',
  },
  {
    from: 0.32,
    to: 0.68,
    text: 'Split the budget equally per person and most of the Pacific rises to the top — Palau falls with the large emitters.',
  },
  {
    from: 0.62,
    to: 1,
    text: 'Prioritarian weighting pulls the ranks further apart. Search any country to follow its line.',
  },
]

/**
 * Act 3 ranking. The same 198 countries under three ways of dividing one
 * budget, in the order the argument runs: grandfathering first — where every
 * country ties and the board looks level — then egalitarian and prioritarian,
 * which pull it apart.
 */
export function RankingScene() {
  const { eg, gf, pr, loading, error } = useAsrTables(YEAR)
  const { rows: contribRows } = useContributions()
  const [hoveredIso, setHoveredIso] = useState(null)
  const [pinnedIso, setPinnedIso] = useState(null)
  const reduceMotion = useReducedMotion()

  const model = useMemo(() => {
    if (!eg || !gf || !pr) return null

    const columns = ['gf', 'eg', 'pr'].map((id) => PRINCIPLES.find((p) => p.id === id))
    const tables = [gf, eg, pr]

    // Rank 1 = lowest ASR. Ties share the average rank, so grandfathering —
    // where every country holds the same ratio — lands as one mid-height point.
    const ranked = tables.map((table) => {
      const sorted = [...table.entries()].sort((a, b) => a[1] - b[1])
      const out = new Map()
      let i = 0
      while (i < sorted.length) {
        let j = i
        while (j + 1 < sorted.length && sorted[j + 1][1] === sorted[i][1]) j += 1
        const shared = (i + j) / 2 + 1
        for (let k = i; k <= j; k += 1) out.set(sorted[k][0], shared)
        i = j + 1
      }
      return out
    })

    const isos = [...eg.keys()]
    const maxRank = Math.max(...ranked.map((m) => Math.max(...m.values())))

    const items = isos.map((iso) => ({
      iso,
      name: countryName(iso, contribRows),
      group: PACIFIC.has(iso) ? 'pacific' : EMITTERS.has(iso) ? 'emitter' : 'other',
      ranks: ranked.map((m) => m.get(iso) ?? null),
      values: tables.map((t) => t.get(iso) ?? null),
    }))

    const order = { other: 0, emitter: 1, pacific: 2 }
    items.sort((a, b) => order[a.group] - order[b.group])

    const labelled = [
      ...PACIFIC_TERRITORIES.map((t) => items.find((row) => row.iso === t.iso)),
      ...LABEL_EMITTERS.map((iso) => items.find((row) => row.iso === iso)),
    ].filter(Boolean)

    return { columns, rows: { items, maxRank }, labelled }
  }, [eg, gf, pr, contribRows])

  return (
    <Scene id="ranking" pages={3}>
      {(progress) => {
        const revealEg = reduceMotion
          ? (progress >= mid(EG_WIN) ? 1 : 0)
          : easeInOutSmooth(slice(progress, EG_WIN[0], EG_WIN[1]))
        const revealPr = reduceMotion
          ? (progress >= mid(PR_WIN) ? 1 : 0)
          : easeInOutSmooth(slice(progress, PR_WIN[0], PR_WIN[1]))
        const searchReady = revealPr >= 0.85
        const liveCount = 1 + (revealEg > 0.45 ? 1 : 0) + (revealPr > 0.45 ? 1 : 0)
        const activeIso = hoveredIso ?? (searchReady ? pinnedIso : null)
        const hovered = model?.rows.items.find((row) => row.iso === activeIso) ?? null

        return (
          <RankingView
            progress={progress}
            revealEg={revealEg}
            revealPr={revealPr}
            searchReady={searchReady}
            liveCount={liveCount}
            model={model}
            loading={loading}
            error={error}
            activeIso={activeIso}
            pinnedIso={searchReady ? pinnedIso : null}
            onHover={setHoveredIso}
            onPin={setPinnedIso}
            hovered={hovered}
            reduceMotion={reduceMotion}
          />
        )
      }}
    </Scene>
  )
}

function RankingView({
  progress,
  revealEg,
  revealPr,
  searchReady,
  liveCount,
  model,
  loading,
  error,
  activeIso,
  pinnedIso,
  onHover,
  onPin,
  hovered,
  reduceMotion,
}) {
  useEffect(() => {
    if (!searchReady) onPin(null)
  }, [searchReady, onPin])

  return (
    <div className="rank">
      <div className="rank__captions">
        <p className="rank__caption">Ranking the Pacific and the world</p>
        <div className="rank__ledes">
          {CAPTIONS.map((cap) => {
            const opacity = captionOpacity(progress, cap.from, cap.to)
            return (
              <p
                key={cap.from}
                className="rank__lede"
                style={{ opacity }}
                aria-hidden={opacity < 0.5}
              >
                {cap.text}
              </p>
            )
          })}
        </div>
        <RankSearch
          enabled={searchReady}
          items={model?.rows.items ?? []}
          pinnedIso={pinnedIso}
          onPick={onPin}
          onPreview={onHover}
          reduceMotion={reduceMotion}
        />
      </div>

      <div className="rank__body">
        {error ? <p className="rank__state">Could not load the ASR tables.</p> : null}
        {loading || !model ? <p className="rank__state">Loading…</p> : null}
        {model ? (
          <AsrRanking
            columns={model.columns}
            rows={model.rows}
            labelled={model.labelled}
            hoveredIso={activeIso}
            onHover={onHover}
            revealEg={revealEg}
            revealPr={revealPr}
          />
        ) : null}
      </div>

      <div className="rank__legend">
        <p className="rank__legend-lead">
          Rank 1 is the lowest Absolute Sustainability Ratio, {YEAR}. The red
          dashed mark is ASR = 1. Hover any line
          {searchReady ? ', or search a country' : ''}.
        </p>
        <ul className="rank__legend-keys">
          <li>
            <span className="rank__legend-swatch rank__legend-swatch--pacific" aria-hidden="true" />
            Pacific
          </li>
          <li>
            <span className="rank__legend-swatch rank__legend-swatch--emitter" aria-hidden="true" />
            Large emitters
          </li>
          <li>
            <span className="rank__legend-swatch rank__legend-swatch--world" aria-hidden="true" />
            Rest of the world
          </li>
        </ul>
      </div>

      <AnimatePresence>
        {hovered ? (
          <motion.div
            key={hovered.iso}
            className="rank__tooltip"
            role="status"
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
            transition={FADE}
          >
            <strong>{hovered.name}</strong>
            <span>
              {hovered.group === 'pacific'
                ? 'Pacific'
                : hovered.group === 'emitter'
                  ? 'Large emitter'
                  : 'Rest of the world'}
              {pinnedIso === hovered.iso ? ' · pinned' : ''}
            </span>
            <span>
              {model.columns.slice(0, liveCount).map((col, i) => {
                const value = hovered.values[i]
                return `${col.title} ${value == null ? '—' : formatAsr(value)}`
              }).join(' · ')}
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function RankSearch({ enabled, items, pinnedIso, onPick, onPreview, reduceMotion }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [listOpen, setListOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const inputId = useId()
  const listId = useId()

  useEffect(() => {
    if (!enabled) {
      setOpen(false)
      setQuery('')
      setListOpen(false)
    }
  }, [enabled])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const matches = useMemo(() => filterCountries(items, query), [items, query])

  useEffect(() => {
    setActive(0)
  }, [query])

  const pick = (iso) => {
    onPick(iso)
    onPreview?.(null)
    const row = items.find((r) => r.iso === iso)
    setQuery(row?.name ?? '')
    setListOpen(false)
  }

  const preview = (iso) => {
    onPreview?.(iso)
  }

  const clear = () => {
    setQuery('')
    setListOpen(false)
    onPick(null)
    preview(null)
    inputRef.current?.focus()
  }

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (listOpen) {
        setListOpen(false)
        preview(null)
        return
      }
      if (query || pinnedIso) {
        clear()
        return
      }
      setOpen(false)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const row = matches[active] ?? matches[0]
      if (row) pick(row.iso)
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!matches.length) return
      setListOpen(true)
      setActive((i) => {
        const next = (i + 1) % matches.length
        preview(matches[next].iso)
        return next
      })
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!matches.length) return
      setListOpen(true)
      setActive((i) => {
        const next = (i - 1 + matches.length) % matches.length
        preview(matches[next].iso)
        return next
      })
    }
  }

  const transition = reduceMotion ? { duration: 0 } : SPRING
  const showList = open && listOpen && query.trim().length > 0

  if (!enabled) return null

  return (
    <div className="rank-search">
      <AnimatePresence initial={false}>
        {enabled && !open ? (
          <motion.button
            key="open"
            type="button"
            className="rank-search__btn"
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
            transition={transition}
            onClick={() => setOpen(true)}
          >
            <SearchIcon />
            Search a country
          </motion.button>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {enabled && open ? (
          <motion.div
            key="field"
            className="rank-search__panel"
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
            transition={transition}
          >
            <label className="rank-search__sr" htmlFor={inputId}>Search a country by name or ISO code</label>
            <input
              ref={inputRef}
              id={inputId}
              type="search"
              className="rank-search__input"
              placeholder="Country or ISO"
              value={query}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-autocomplete="list"
              aria-controls={listId}
              aria-expanded={showList}
              aria-activedescendant={showList && matches[active] ? `${listId}-${matches[active].iso}` : undefined}
              onChange={(event) => {
                const next = event.target.value
                setQuery(next)
                setListOpen(true)
                if (!next) {
                  onPick(null)
                  preview(null)
                }
              }}
              onKeyDown={onKeyDown}
            />
            {query || pinnedIso ? (
              <button
                type="button"
                className="rank-search__clear"
                onClick={clear}
              >
                Clear
              </button>
            ) : null}
            {showList ? (
              <ul className="rank-search__list" id={listId} role="listbox">
                {matches.length === 0 ? (
                  <li className="rank-search__empty">No matches</li>
                ) : (
                  matches.map((row, i) => (
                    <li key={row.iso} role="presentation">
                      <button
                        type="button"
                        id={`${listId}-${row.iso}`}
                        role="option"
                        aria-selected={i === active}
                        className={`rank-search__option${i === active ? ' is-active' : ''}${row.iso === pinnedIso ? ' is-pinned' : ''}`}
                        onMouseEnter={() => {
                          setActive(i)
                          preview(row.iso)
                        }}
                        onClick={() => pick(row.iso)}
                      >
                        <span>{row.name}</span>
                        <span className="rank-search__iso">{row.iso}</span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function SearchIcon() {
  return (
    <svg
      className="rank-search__icon"
      width="15"
      height="15"
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <circle cx="6.5" cy="6.5" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M10.2 10.2 L14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

function filterCountries(items, query) {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const scored = []
  for (const row of items) {
    const name = row.name.toLowerCase()
    const iso = row.iso.toLowerCase()
    let score = 0
    if (iso === q || name === q) score = 3
    else if (name.startsWith(q) || iso.startsWith(q)) score = 2
    else if (name.includes(q) || iso.includes(q)) score = 1
    if (score) scored.push({ row, score })
  }
  scored.sort((a, b) => b.score - a.score || a.row.name.localeCompare(b.row.name))
  return scored.slice(0, 8).map((s) => s.row)
}

function captionOpacity(progress, from, to) {
  const fade = 0.14 * (to - from)
  const inOp = from <= 0 ? 1 : slice(progress, from, from + fade)
  const outOp = to >= 1 ? 1 : 1 - slice(progress, to - fade, to)
  return Math.min(inOp, outOp)
}

function mid([a, b]) {
  return (a + b) / 2
}

const PACIFIC = new Set(PACIFIC_TERRITORIES.map((t) => t.iso))

const NAMES = {
  ...Object.fromEntries(PACIFIC_TERRITORIES.map((t) => [t.iso, t.name])),
  FRA: 'France', USA: 'United States', AUS: 'Australia', CHN: 'China',
  IND: 'India', GBR: 'United Kingdom', DEU: 'Germany', QAT: 'Qatar',
}

function countryName(iso, contribRows) {
  if (NAMES[iso]) return NAMES[iso]
  const fromPanel = contribRows?.get(iso)?.name
  if (fromPanel) return fromPanel
  const feat = findCountryFeature(iso)
  return feat?.properties?.name ?? iso
}
