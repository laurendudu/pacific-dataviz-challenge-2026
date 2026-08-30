import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { PacificWorldScatter, scatterDomains } from '../components/chart/PacificWorldScatter'
import { Scene } from '../components/scroll/Scene'
import {
  SCATTER_PLOTS,
  X_VARS,
  X_VAR_BY_ID,
  asrOf,
  formatAsr,
  formatGdp,
  formatExposure,
  useScatterCountries,
} from '../data/scatter'

const FADE = {
  duration: 0.38,
  ease: [0.4, 0, 0.2, 1],
}

/**
 * Follows the allocation-principles page. The three rules stay; the frame opens
 * to every country so the Pacific can be read against the world.
 *
 * The x axis is switchable. Exposure is the argument — the Pacific sits far
 * right and low, in the way of the harm and overshooting least. GDP per capita
 * is the control: same countries, sorted by capacity to act instead of exposure
 * to harm, and the Pacific stops being a cluster.
 */
export function ScatterScene() {
  return (
    <Scene id="pacific-vs-world" pages={2}>
      {() => <ScatterView />}
    </Scene>
  )
}

function ScatterView() {
  const reduceMotion = useReducedMotion()
  const [hovered, setHovered] = useState(null)
  const [xVarId, setXVarId] = useState('exposure')
  const { countries, year, loading, error } = useScatterCountries()

  const domains = useMemo(
    () => scatterDomains(countries, xVarId),
    [countries, xVarId],
  )
  const xVar = X_VAR_BY_ID[xVarId]

  return (
    <div className="scatter">
      <div className="scatter__captions">
        <p className="scatter__caption">Pacific vs the world</p>
        <p className="scatter__lede">
          The same three rules, now for every country. Grandfathering piles
          everyone on the world’s overshoot. Egalitarian and prioritarian pull
          the Pacific below a fair share — and leave the large emitters above it.
        </p>
      </div>

      <div className="scatter__controls" role="group" aria-label="Horizontal axis">
        {X_VARS.map((v) => (
          <button
            key={v.id}
            type="button"
            className={`scatter__control${v.id === xVarId ? ' is-active' : ''}`}
            aria-pressed={v.id === xVarId}
            onClick={() => setXVarId(v.id)}
          >
            {v.label}
          </button>
        ))}
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
                  onHover={setHovered}
                />
              ) : null}
            </div>
          </figure>
        ))}
      </div>

      <div className="scatter__legend">
        <p className="scatter__legend-lead">{xVar.lede}</p>
        <ul className="scatter__legend-keys">
          <li>
            <span className="scatter__legend-swatch scatter__legend-swatch--pacific" aria-hidden="true" />
            Pacific
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
              {year}. ASR on a log axis; the dashed line is a fair share of 1.
              Exposure from the ND-GAIN Country Index, GDP per capita from the
              World Bank. New Caledonia and French Polynesia have an ASR but
              appear in neither source, so they are absent here.
            </>
          ) : null}
        </p>
      </div>

      <AnimatePresence>
        {hovered ? (
          <motion.div
            key={hovered.iso}
            className="scatter__tooltip"
            role="status"
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
            transition={FADE}
          >
            <strong>{hovered.name}</strong>
            <span>
              {hovered.pacific ? 'Pacific' : 'World'}
              {' · '}
              exposure {hovered.exposure == null ? '—' : formatExposure(hovered.exposure)}
              {' · '}
              {hovered.gdp == null ? '—' : formatGdp(hovered.gdp)}
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
