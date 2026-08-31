import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

const SPRING = { type: 'spring', visualDuration: 0.4, bounce: 0.08 }

/**
 * Compact country search: magnifying-glass button, then a name/ISO field
 * with arrow-key list, Enter to pin, Escape to clear. With `alwaysOpen` the
 * field skips the button and sits in the toolbar like any other control.
 */
export function RankSearch({ enabled, alwaysOpen = false, items, pinnedIso, onPick, onPreview, reduceMotion }) {
  const [open, setOpen] = useState(alwaysOpen)
  const [query, setQuery] = useState('')
  const [listOpen, setListOpen] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const inputId = useId()
  const listId = useId()

  useEffect(() => {
    if (!enabled) {
      setOpen(alwaysOpen)
      setQuery('')
      setListOpen(false)
    }
  }, [enabled, alwaysOpen])

  useEffect(() => {
    // Only pull focus when the reader opened the field themselves.
    if (open && !alwaysOpen) inputRef.current?.focus()
  }, [open, alwaysOpen])

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
      if (alwaysOpen) inputRef.current?.blur()
      else setOpen(false)
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

  return (
    <div
      className={`rank-search${enabled ? '' : ' is-reserved'}`}
      aria-hidden={!enabled}
    >
      <AnimatePresence initial={false}>
        {!open && !alwaysOpen ? (
          <motion.button
            key="open"
            type="button"
            className="rank-search__btn"
            initial={false}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
            transition={transition}
            disabled={!enabled}
            tabIndex={enabled ? 0 : -1}
            onClick={() => setOpen(true)}
          >
            <SearchIcon />
            Search a country
          </motion.button>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {open && (enabled || alwaysOpen) ? (
          <motion.div
            key="field"
            className="rank-search__panel"
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
            transition={transition}
          >
            <label className="rank-search__sr" htmlFor={inputId}>Search a country by name or ISO code</label>
            <span className="rank-search__glass" aria-hidden="true">
              <SearchIcon />
            </span>
            <input
              ref={inputRef}
              id={inputId}
              type="search"
              className="rank-search__input"
              placeholder="Country or ISO"
              disabled={!enabled}
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
