import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { format } from 'd3-format'
import { Scene } from '../components/scroll/Scene'
import { AsrRanking, formatRank } from '../components/chart/AsrRanking'
import { RankSearch } from '../components/chart/RankSearch'
import { PRINCIPLES, PACIFIC_TERRITORIES } from '../data/allocation'
import { findCountryFeature, useAsrTables, YEAR } from '../data/asr'
import { useContributions } from '../data/contributions'
import { EMITTERS, EMITTER_LIST } from '../data/emitters'
import { beatIndex } from '../hooks/useScrollProgress'
import { useAnimatedValues } from '../hooks/useAnimatedValues'

const formatAsr = format('.2~f')

const FADE = {
  duration: 0.38,
  ease: [0.4, 0, 0.2, 1],
}

const TIP_OFFSET = 12

const RANK_REVEAL = [
  { revealEg: 0, revealPr: 0 },
  { revealEg: 1, revealPr: 0 },
  { revealEg: 1, revealPr: 1 },
]

const CAPTIONS = [
  'Grandfathering ties all 198 countries on one rank: everyone holds the world’s overshoot.',
  'If we split the budget equally per person, most of the Pacific rises to the top, except for Palau, which falls with the large emitters.',
  'Using a prioritarian approach, the Pacific rises even higher, with the Marshall Islands ranking #7.',
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
  const [showRow, setShowRow] = useState(false)
  const [volume, setVolume] = useState(false)
  const reduceMotion = useReducedMotion()

  const model = useMemo(() => {
    if (!eg || !gf || !pr) return null

    const columns = ['gf', 'eg', 'pr'].map((id) => PRINCIPLES.find((p) => p.id === id))
    const tables = [gf, eg, pr]

    // Rank 1 = lowest ASR. Standard competition ranks (1, 2, 2, 4): a tie
    // shares the best integer of the block, then the next country skips.
    const ranked = tables.map((table) => competitionRanks(table))

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
      /* Pacific names first — every territory — then the large emitters. */
      ...EMITTER_LIST.map((iso) => items.find((row) => row.iso === iso)),
    ].filter(Boolean)

    return { columns, rows: { items, maxRank }, labelled }
  }, [eg, gf, pr, contribRows])

  return (
    <Scene id="ranking" pages={RANK_REVEAL.length} smooth={1}>
      {(progress) => (
        <RankingBeats
          beat={beatIndex(progress, RANK_REVEAL.length)}
          model={model}
          loading={loading}
          error={error}
          hoveredIso={hoveredIso}
          pinnedIso={pinnedIso}
          showRow={showRow}
          volume={volume}
          onHover={setHoveredIso}
          onPin={setPinnedIso}
          onShowRow={setShowRow}
          onVolume={setVolume}
          reduceMotion={reduceMotion}
        />
      )}
    </Scene>
  )
}

function RankingBeats({
  beat,
  model,
  loading,
  error,
  hoveredIso,
  pinnedIso,
  showRow,
  volume,
  onHover,
  onPin,
  onShowRow,
  onVolume,
  reduceMotion,
}) {
  const { revealEg, revealPr } = useAnimatedValues(RANK_REVEAL[beat] ?? RANK_REVEAL[0], {
    duration: 0.7,
    reduceMotion,
  })
  const searchReady = revealPr >= 0.85
  const liveCount = 1 + (revealEg > 0.45 ? 1 : 0) + (revealPr > 0.45 ? 1 : 0)
  const activeIso = hoveredIso ?? (searchReady ? pinnedIso : null)
  const hovered = model?.rows.items.find((row) => row.iso === activeIso) ?? null

  return (
    <RankingView
      beat={beat}
      revealEg={revealEg}
      revealPr={revealPr}
      searchReady={searchReady}
      liveCount={liveCount}
      model={model}
      loading={loading}
      error={error}
      activeIso={activeIso}
      pinnedIso={searchReady ? pinnedIso : null}
      showRow={showRow}
      volume={volume}
      onHover={onHover}
      onPin={onPin}
      onShowRow={onShowRow}
      onVolume={onVolume}
      hovered={hovered}
      reduceMotion={reduceMotion}
    />
  )
}

function RankingView({
  beat,
  revealEg,
  revealPr,
  searchReady,
  liveCount,
  model,
  loading,
  error,
  activeIso,
  pinnedIso,
  showRow,
  volume,
  onHover,
  onPin,
  onShowRow,
  onVolume,
  hovered,
  reduceMotion,
}) {
  const rankRef = useRef(null)
  const tipRef = useRef(null)
  const pointerRef = useRef(null)
  const tipSizeRef = useRef({ w: 240, h: 92 })

  const placeTip = (client) => {
    pointerRef.current = client ?? null
    const el = tipRef.current
    if (!el || !client || !rankRef.current) return
    const { left, top } = tooltipStyle(client, rankRef.current, tipSizeRef.current)
    el.style.left = `${left}px`
    el.style.top = `${top}px`
  }

  const handleHover = (iso, client) => {
    if (iso && client) placeTip(client)
    else pointerRef.current = null
    onHover(iso ?? null)
  }

  useEffect(() => {
    if (!searchReady) onPin(null)
  }, [searchReady, onPin])

  useLayoutEffect(() => {
    if (!hovered || !pointerRef.current) return
    placeTip(pointerRef.current)
    const el = tipRef.current
    if (el) tipSizeRef.current = { w: el.offsetWidth, h: el.offsetHeight }
  }, [hovered, liveCount])

  const display = useMemo(() => {
    if (!model) return null
    const extras = []
    const takeExtra = (iso) => {
      if (!iso) return
      const row = model.rows.items.find((item) => item.iso === iso)
      if (row && row.group === 'other' && !extras.some((item) => item.iso === row.iso)) {
        extras.push(row)
      }
    }
    takeExtra(pinnedIso)
    takeExtra(activeIso)

    const items = showRow
      ? model.rows.items
      : [
          ...model.rows.items.filter((row) => row.group !== 'other'),
          ...extras,
        ]

    const labelled = [...model.labelled]
    if (!showRow) {
      for (const row of extras) labelled.push(row)
    }

    return { rows: { items, maxRank: model.rows.maxRank }, labelled }
  }, [model, showRow, pinnedIso, activeIso])

  const setRowVisible = (on) => {
    onShowRow(on)
    handleHover(null)
  }

  const tipOn = Boolean(hovered && pointerRef.current)

  return (
    <div
      ref={rankRef}
      className={`rank${volume ? ' alluvial is-volume' : ''}${showRow ? ' is-row-on' : ' is-row-off'}`}
    >
      <div className="rank__captions">
        <p className="rank__caption">Who gets a fair share?</p>
        <div className="rank__ledes">
          {CAPTIONS.map((text, i) => {
            const on = i === beat
            return (
              <p
                key={text}
                className="rank__lede"
                style={{ opacity: on ? 1 : 0 }}
                aria-hidden={!on}
              >
                {text}
              </p>
            )
          })}
        </div>
        <div className="alluvial-tools">
          <RankSearch
            enabled={searchReady}
            items={model?.rows.items ?? []}
            pinnedIso={pinnedIso}
            onPick={onPin}
            onPreview={handleHover}
            reduceMotion={reduceMotion}
          />
          <button
            type="button"
            className="alluvial-switch"
            role="switch"
            aria-checked={showRow}
            onClick={() => setRowVisible(!showRow)}
          >
            <span className="alluvial-switch__track" aria-hidden="true">
              <span className="alluvial-switch__thumb" />
            </span>
            Rest of the world
          </button>
          <div className="rank-mode" role="group" aria-label="Ranking display">
            <button
              type="button"
              className={`rank-mode__btn${!volume ? ' is-active' : ''}`}
              aria-pressed={!volume}
              onClick={() => onVolume(false)}
            >
              Only ASR ranking
            </button>
            <button
              type="button"
              className={`rank-mode__btn${volume ? ' is-active' : ''}`}
              aria-pressed={volume}
              onClick={() => onVolume(true)}
            >
              Scaled with actual ASR value
            </button>
          </div>
        </div>
      </div>

      <div className="rank__body">
        {error ? <p className="rank__state">Could not load the ASR tables.</p> : null}
        {loading || !display ? <p className="rank__state">Loading…</p> : null}
        {display ? (
          <AsrRanking
            columns={model.columns}
            rows={display.rows}
            labelled={display.labelled}
            hoveredIso={activeIso}
            onHover={handleHover}
            revealEg={revealEg}
            revealPr={revealPr}
            volume={volume}
            showRow={showRow}
            cutoffItems={model.rows.items}
          />
        ) : null}
      </div>

      <div className="rank__legend">
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
        {tipOn ? (
          <motion.div
            key="rank-tip"
            ref={tipRef}
            className="rank__tooltip"
            role="status"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
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
            {model.columns.slice(0, liveCount).map((col, i) => {
              const value = hovered.values[i]
              const rankText = formatRank(hovered.ranks[i]) ?? '—'
              const asrText = value == null ? '—' : formatAsr(value)
              const tied = tiePhrase(hovered, i, model.rows.items)
              return (
                <span key={col.id}>
                  {`${col.title} ${rankText} · ${asrText}`}
                  {tied ? ` · ${tied}` : ''}
                </span>
              )
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
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

/** Standard competition ranking: tied values share `i + 1`, next rank skips. */
function competitionRanks(table) {
  const sorted = [...table.entries()].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
  const out = new Map()
  let i = 0
  while (i < sorted.length) {
    let j = i
    while (j + 1 < sorted.length && sorted[j + 1][1] === sorted[i][1]) j += 1
    const rank = i + 1
    for (let k = i; k <= j; k += 1) out.set(sorted[k][0], rank)
    i = j + 1
  }
  return out
}

function tiePhrase(row, col, items) {
  const rank = row.ranks[col]
  if (rank == null) return null
  const present = items.filter((item) => item.ranks[col] != null)
  const same = present.filter((item) => item.ranks[col] === rank)
  if (same.length < 2) return null
  if (same.length === present.length) return `all ${present.length} tied`
  const others = same
    .filter((item) => item.iso !== row.iso)
    .sort((a, b) => a.name.localeCompare(b.name))
  if (others.length === 1) return `tied with ${others[0].name}`
  const rest = others.length - 1
  return `tied with ${others[0].name} and ${rest} other${rest === 1 ? '' : 's'}`
}

function tooltipStyle(pointer, container, size) {
  if (!pointer || !container) return { left: 0, top: 0 }
  const box = container.getBoundingClientRect()
  const pad = 8
  let left = pointer.x - box.left + TIP_OFFSET
  let top = pointer.y - box.top + TIP_OFFSET
  if (left + size.w > box.width - pad) left = pointer.x - box.left - TIP_OFFSET - size.w
  if (top + size.h > box.height - pad) top = pointer.y - box.top - TIP_OFFSET - size.h
  left = Math.max(pad, Math.min(left, Math.max(pad, box.width - size.w - pad)))
  top = Math.max(pad, Math.min(top, Math.max(pad, box.height - size.h - pad)))
  return { left, top }
}
