import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { format } from 'd3-format'
import { Scene } from '../components/scroll/Scene'
import { AsrRanking } from '../components/chart/AsrRanking'
import { PRINCIPLES, PACIFIC_TERRITORIES } from '../data/allocation'
import { findCountryFeature, useAsrTables, YEAR } from '../data/asr'

const formatAsr = format('.2~f')

/** Named on the right column, where ranks actually differ. */
const LABEL_ISOS = ['MHL', 'TUV', 'PNG', 'FJI', 'PLW', 'CHN', 'FRA', 'AUS', 'USA']

const EMITTERS = new Set(['FRA', 'USA', 'AUS', 'CHN', 'IND', 'GBR', 'DEU', 'QAT'])

const FADE = {
  duration: 0.38,
  ease: [0.4, 0, 0.2, 1],
}

/**
 * Act 3 ranking. The same 198 countries under three ways of dividing one
 * budget, in the order the argument runs: grandfathering first — where every
 * country ties and the board looks level — then egalitarian and prioritarian,
 * which pull it apart.
 */
export function RankingScene() {
  const { eg, gf, pr, loading, error } = useAsrTables(YEAR)
  const [hoveredIso, setHoveredIso] = useState(null)
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
      name: countryName(iso),
      group: PACIFIC.has(iso) ? 'pacific' : EMITTERS.has(iso) ? 'emitter' : 'other',
      ranks: ranked.map((m) => m.get(iso) ?? null),
      values: tables.map((t) => t.get(iso) ?? null),
    }))

    const order = { other: 0, emitter: 1, pacific: 2 }
    items.sort((a, b) => order[a.group] - order[b.group])

    const labelled = LABEL_ISOS
      .map((iso) => items.find((row) => row.iso === iso))
      .filter(Boolean)

    return { columns, rows: { items, maxRank }, labelled }
  }, [eg, gf, pr])

  const hovered = model?.rows.items.find((row) => row.iso === hoveredIso) ?? null

  return (
    <Scene id="ranking" pages={2}>
      {() => (
        <div className="rank">
          <div className="rank__captions">
            <p className="rank__caption">Ranking the Pacific and the world</p>
            <p className="rank__lede">
              Grandfathering ties all 198 countries on one rank. The other two
              rules pull the board apart: most of the Pacific rises to the top
              — Palau falls with the large emitters.
            </p>
          </div>

          <div className="rank__body">
            {error ? <p className="rank__state">Could not load the ASR tables.</p> : null}
            {loading || !model ? <p className="rank__state">Loading…</p> : null}
            {model ? (
              <AsrRanking
                columns={model.columns}
                rows={model.rows}
                labelled={model.labelled}
                hoveredIso={hoveredIso}
                onHover={setHoveredIso}
              />
            ) : null}
          </div>

          <div className="rank__legend">
            <p className="rank__legend-lead">
              Rank 1 is the lowest Absolute Sustainability Ratio, {YEAR}. Hover any line.
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
                <span>{hovered.group === 'pacific' ? 'Pacific' : hovered.group === 'emitter' ? 'Large emitter' : 'Rest of the world'}</span>
                <span>
                  {model.columns.map((col, i) => {
                    const value = hovered.values[i]
                    return `${col.title} ${value == null ? '—' : formatAsr(value)}`
                  }).join(' · ')}
                </span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      )}
    </Scene>
  )
}

const PACIFIC = new Set(PACIFIC_TERRITORIES.map((t) => t.iso))

const NAMES = {
  ...Object.fromEntries(PACIFIC_TERRITORIES.map((t) => [t.iso, t.name])),
  FRA: 'France', USA: 'United States', AUS: 'Australia', CHN: 'China',
  IND: 'India', GBR: 'United Kingdom', DEU: 'Germany', QAT: 'Qatar',
}

function countryName(iso) {
  if (NAMES[iso]) return NAMES[iso]
  const feat = findCountryFeature(iso)
  return feat?.properties?.name ?? iso
}
