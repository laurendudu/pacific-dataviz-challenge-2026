import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { PacificWorldScatter, scatterDomains } from '../components/chart/PacificWorldScatter'
import { Scene } from '../components/scroll/Scene'
import {
  SCATTER_PLOTS,
  X_VARS,
  X_VAR_BY_ID,
  asrOf,
  formatAsr,
  useScatterCountries,
  xOf,
} from '../data/scatter'
import { beatIndex } from '../hooks/useScrollProgress'

const GROUP_LABEL = { pacific: 'Pacific', emitter: 'Large emitter', world: 'World' }

const FADE = {
  duration: 0.38,
  ease: [0.4, 0, 0.2, 1],
}

const SCENE_ID = 'pacific-vs-world'

/** exposure → loss → share → rents → gdp → hold with all toggles live. */
const SCATTER_BEATS = X_VARS.length + 1

function scrollToXBeat(beat) {
  const el = document.getElementById(SCENE_ID)
  if (!el) return
  const origin = el.getBoundingClientRect().top + window.scrollY
  window.scrollTo({
    top: origin + beat * window.innerHeight,
    behavior: 'smooth',
  })
}

/**
 * Follows the allocation-principles page. The three rules stay; the frame opens
 * to every country so the Pacific can be read against the world.
 *
 * The page's claim is about the rules, not the Pacific: an allocation rule is
 * what decides whether a carbon budget can distinguish between countries at
 * all. Grandfathering cannot — it returns one ratio for all 188, so the
 * Marshall Islands and Saudi Arabia are equally over and equally guilty, which
 * is what a single standard applied to unequal countries buys you. The other
 * two rules fan the same countries out — 825-fold on population, 20,000-fold
 * on ability to pay — and it is that spread that makes a budget capable of
 * being fair to anyone.
 *
 * Scroll names the x axis, in the order the argument runs: who the harm
 * lands on, who caused it, who can afford to act. Exposure and disaster loss
 * sort by the first of those, and the Pacific sits far right and low — in
 * the way of it, overshooting least. Emissions share and fossil rents sort
 * by who caused it and who was paid for it, and the Pacific collapses into
 * the left margin. GDP per capita is the control: sorted by capacity to act
 * instead, the Pacific stops being a cluster. After the last axis, the same
 * frames are reachable from the toggles.
 */
export function ScatterScene() {
  return (
    <Scene id={SCENE_ID} pages={SCATTER_BEATS} smooth={1}>
      {(progress) => (
        <ScatterView beat={beatIndex(progress, SCATTER_BEATS)} />
      )}
    </Scene>
  )
}

function ScatterView({ beat }) {
  const reduceMotion = useReducedMotion()
  const rootRef = useRef(null)
  const [hovered, setHovered] = useState(null)
  const [picked, setPicked] = useState(null)
  const { countries, year, sources, loading, error } = useScatterCountries()

  const allUnlocked = beat >= X_VARS.length
  const scrolledId = X_VARS[Math.min(beat, X_VARS.length - 1)].id

  useEffect(() => {
    if (!allUnlocked) setPicked(null)
  }, [allUnlocked])

  const xVarId = allUnlocked && picked ? picked : scrolledId

  useEffect(() => {
    setHovered(null)
  }, [xVarId])

  const domains = useMemo(
    () => scatterDomains(countries, xVarId),
    [countries, xVarId],
  )
  const xVar = X_VAR_BY_ID[xVarId]

  const onHover = (hit, event) => {
    if (!hit || !event) {
      setHovered(null)
      return
    }
    const box = rootRef.current?.getBoundingClientRect()
    setHovered({
      ...hit,
      px: box ? event.clientX - box.left : event.clientX,
      py: box ? event.clientY - box.top : event.clientY,
      boxW: box?.width ?? 0,
      boxH: box?.height ?? 0,
    })
  }

  const flipX = hovered != null && hovered.px > hovered.boxW * 0.62
  const flipY = hovered != null && hovered.py > hovered.boxH * 0.68
  const tipClass = [
    'scatter__tooltip',
    flipX ? 'is-flip-x' : '',
    flipY ? 'is-flip-y' : '',
  ].filter(Boolean).join(' ')

  return (
    <div ref={rootRef} className="scatter">
      <div className="scatter__captions">
        <p className="scatter__caption">Pacific vs the world</p>
        <p className="scatter__lede">
          The same three rules, now for every country. Grandfathering hands
          every one of them the identical ratio — 6.4 times a fair share, the
          Marshall Islands and Saudi Arabia alike — so nobody is inside the
          budget and nobody is told apart. Egalitarian spreads those same
          countries across an 800-fold range, prioritarian wider still. That
          spread is the point: a fairer budget is not one that holds every
          country to a single line, it is one that can tell them apart.
        </p>
      </div>

      <div className="scatter__controls" role="group" aria-label="Horizontal axis">
        <AnimatePresence initial={false}>
          {X_VARS.filter((_, i) => allUnlocked || i <= beat).map((v) => {
            const i = X_VARS.indexOf(v)
            return (
              <motion.button
                key={v.id}
                type="button"
                className={`scatter__control${v.id === xVarId ? ' is-active' : ''}`}
                aria-pressed={v.id === xVarId}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                transition={FADE}
                onClick={() => {
                  if (allUnlocked) setPicked(v.id)
                  else if (i !== beat) scrollToXBeat(i)
                  setHovered(null)
                }}
              >
                {v.label}
              </motion.button>
            )
          })}
        </AnimatePresence>
      </div>

      <div className="scatter__body">
        {SCATTER_PLOTS.map((plot) => (
          <figure key={plot.id} className="scatter-plot">
            <figcaption className="scatter-plot__cap">
              <span className="scatter-plot__title">{plot.title}</span>
              <span className="scatter-plot__rule">{plot.rule}</span>
            </figcaption>
            <div className="scatter-plot__frame">
              {countries.length ? (
                <PacificWorldScatter
                  countries={countries}
                  methodId={plot.id}
                  xVarId={xVarId}
                  xDomain={domains.xDomain}
                  yDomain={domains.yDomain}
                  hoveredIso={hovered?.iso ?? null}
                  onHover={onHover}
                />
              ) : null}
            </div>
          </figure>
        ))}
      </div>

      <div className="scatter__legend">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={xVar.id}
            className="scatter__legend-lead"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
            transition={FADE}
          >
            {xVar.lede}
          </motion.p>
        </AnimatePresence>
        <ul className="scatter__legend-keys">
          <li>
            <span className="scatter__legend-swatch scatter__legend-swatch--pacific" aria-hidden="true" />
            Pacific
          </li>
          <li>
            <span className="scatter__legend-swatch scatter__legend-swatch--emitter" aria-hidden="true" />
            Large emitters
          </li>
          <li>
            <span className="scatter__legend-swatch scatter__legend-swatch--world" aria-hidden="true" />
            Rest of the world
          </li>
        </ul>
        <p className="scatter__source">
          {loading ? 'Loading…' : null}
          {error ? 'Country panel unavailable.' : null}
          {!loading && !error && year ? (
            <>
              ASR {year}, on a log axis; the dashed line is a fair share of 1.{' '}
              {xVar.note} {sources[xVarId] ? `${sources[xVarId]}.` : null}
            </>
          ) : null}
        </p>
      </div>

      <AnimatePresence>
        {hovered ? (
          <motion.div
            key="scatter-tip"
            className={tipClass}
            role="status"
            style={{ left: hovered.px, top: hovered.py }}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={FADE}
          >
            <strong>{hovered.name}</strong>
            <span>
              {GROUP_LABEL[hovered.group] ?? 'World'}
              {' · '}
              {xVar.short}{' '}
              {xOf(hovered, xVarId) == null ? '—' : xVar.format(xOf(hovered, xVarId))}
            </span>
            <span>
              {SCATTER_PLOTS.map((plot) => {
                const value = asrOf(hovered, plot.id)
                return `${plot.title} ${value == null ? '—' : formatAsr(value)}`
              }).join(' · ')}
            </span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
