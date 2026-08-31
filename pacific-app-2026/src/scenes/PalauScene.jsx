import { useMemo, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { HypothesisRow } from '../components/chart/HypothesisRow'
import { RankSearch } from '../components/chart/RankSearch'
import { Scene } from '../components/scroll/Scene'
import { usePalauContext } from '../data/palau'

/**
 * The case of Palau, as a line-up of suspects.
 *
 * One question per row, one repeated chart form, all six sharing the same
 * population of islands. The reader learns the row once and then reads the
 * pattern: Palau against the right edge on every energy measure, mid-pack on
 * the one everybody assumes is the answer.
 *
 * Rows arrive with scroll and stay, so the case is whole by the end.
 */
export function PalauScene() {
  const [hover, setHover] = useState(null)
  const [pinnedIso, setPinnedIso] = useState(null)
  const [previewIso, setPreviewIso] = useState(null)

  return (
    <Scene id="palau" pages={5} smooth={1}>
      {(progress) => (
        <Lineup
          progress={progress}
          hover={hover}
          onHover={setHover}
          pinnedIso={pinnedIso}
          onPin={setPinnedIso}
          previewIso={previewIso}
          onPreview={setPreviewIso}
        />
      )}
    </Scene>
  )
}

function Lineup({
  progress,
  hover,
  onHover,
  pinnedIso,
  onPin,
  previewIso,
  onPreview,
}) {
  const { headline, rows, loading, error } = usePalauContext()
  const reduceMotion = useReducedMotion()

  /* Rows reveal across the first three-quarters of the scene; the closing
     paragraph waits until the last one has landed. */
  const shownCount = rows.length
    ? Math.round(clamp((progress - 0.05) / 0.62, 0, 1) * rows.length)
    : 0

  /* Union of islands actually drawn: Pacific-only, same set as the strips. */
  const searchItems = useMemo(() => islandsFromRows(rows), [rows])
  const pictByIso = useMemo(
    () => new Map(searchItems.map((d) => [d.iso, d.pict])),
    [searchItems],
  )
  const searchPict = pictByIso.get(previewIso ?? pinnedIso) ?? null
  const highlightedPict = hover?.pict ?? searchPict

  return (
    <div className="palau">
      <header className="palau__head">
        <h2 className="palau__title">
          {headline ? (
            <>
              The case of Palau, the biggest overshooter in the Pacific
            </>
          ) : (
            'Why?'
          )}
        </h2>
        <p className="palau__lede">
          Six hypotheses, each plotted against Pacific islands.
        </p>
        <p className="palau__legend">
          <span className="palau__key palau__key--peer" aria-hidden="true" />
          Pacific territories and countries
          <span className="palau__key palau__key--subject" aria-hidden="true" />
          Palau
        </p>
        {rows.length > 0 ? (
          <div className="palau__search">
            <RankSearch
              enabled
              items={searchItems}
              pinnedIso={pinnedIso}
              onPick={onPin}
              onPreview={onPreview}
              reduceMotion={reduceMotion}
            />
          </div>
        ) : null}
      </header>

      {error ? <p className="palau__status">Palau context unavailable.</p> : null}
      {loading ? <p className="palau__status">Loading the case…</p> : null}

      <ol className="palau__lineup">
        {rows.map((row, i) => (
          <li
            key={row.id}
            className={`hyp hyp--${row.verdict}${i < shownCount ? ' is-shown' : ''}`}
          >
            <div className="hyp__text">
              <h3 className="hyp__claim">{row.claim}</h3>
              <p className="hyp__body">{row.measure}</p>
            </div>

            <div className="hyp__strip">
              {i < shownCount ? (
                <HypothesisRow
                  indicator={row.indicator}
                  format={format}
                  showEnds={i === 0}
                  hovered={highlightedPict}
                  onHover={onHover}
                />
              ) : null}
              <p className="hyp__unit">
                {row.indicator.unit}
                <span className="hyp__year">{row.indicator.year}</span>
              </p>
            </div>

            <div className="hyp__result">
              <p className="hyp__rank">
                <strong>{ordinal(row.indicator.rank)}</strong> of {row.indicator.n}
              </p>
              <p className="hyp__reading">{row.reading}</p>
            </div>
          </li>
        ))}
      </ol>

      {hover ? (
        <Tooltip
          hover={hover}
          pinned={Boolean(pinnedIso) && hover.pict === pictByIso.get(pinnedIso)}
        />
      ) : null}
      <footer className="palau__close">
        <p>
          Sources: Pacific Data Hub .Stat, <code>DF_CLIMATE_CHANGE</code>,{' '}
          <code>DF_ENERGY</code>, <code>DF_WASTE</code>,{' '}
          <code>DF_TOURISM_ARRIVALS</code>, <code>DF_POP_PROJ</code>,{' '}
          <code>DF_WBWDI</code>. Ranks are Pacific-only. Method and code:{' '}
          <code>08_palau_context.ipynb</code>.
        </p>
      </footer>
    </div>
  )
}

/**
 * Hovering any dot names that island in every row at once, which is how a
 * reader checks the claim instead of taking it: follow Fiji down the list and
 * watch it stay in the middle.
 */
function Tooltip({ hover, pinned }) {
  /* Positioned against the viewport, not the scene: the pointer coordinates
     already are viewport coordinates, and measuring the container would mean
     reading a ref while rendering. */
  return (
    <div
      className="palau__tooltip"
      role="status"
      style={{ left: hover.x, top: hover.y }}
    >
      <strong>{hover.name}</strong>
      <span>
        {format(hover.value)} {hover.unit}
        {pinned ? ' · pinned' : ''}
      </span>
      <span className="palau__tooltip-rank">
        {ordinal(hover.rank)} of {hover.n} · {hover.label.toLowerCase()} ·{' '}
        {hover.year}
      </span>
    </div>
  )
}

function islandsFromRows(rows) {
  const byIso = new Map()
  for (const row of rows) {
    for (const d of row.indicator.values) {
      if (!d.iso_code || byIso.has(d.iso_code)) continue
      byIso.set(d.iso_code, { iso: d.iso_code, name: d.name, pict: d.pict })
    }
  }
  return [...byIso.values()].sort((a, b) => a.name.localeCompare(b.name))
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/** One formatter for every row: the units differ, the reading habit shouldn't. */
function format(v) {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
  if (v >= 10) return v.toFixed(0)
  if (v >= 1) return v.toFixed(1)
  return v.toFixed(2)
}

function ordinal(n) {
  const rest = n % 100
  if (rest >= 11 && rest <= 13) return `${n}th`
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
}
