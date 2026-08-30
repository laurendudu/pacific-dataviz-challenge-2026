import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { PacificWorldScatter, formatAsr, formatGdp, scatterDomains } from '../components/chart/PacificWorldScatter'
import { Scene } from '../components/scroll/Scene'
import {
  SCATTER_COUNTRIES,
  SCATTER_IS_DUMMY,
  SCATTER_PLOTS,
  asrOf,
} from '../data/scatter'

const FADE = {
  duration: 0.38,
  ease: [0.4, 0, 0.2, 1],
}

/**
 * Follows the allocation-principles page. The three rules stay; the
 * frame opens to every country so the Pacific can be read against the world.
 * Values are dummy until the country panel is joined.
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
  const domains = useMemo(() => scatterDomains(SCATTER_COUNTRIES), [])

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

      <div className="scatter__body">
        {SCATTER_PLOTS.map((plot) => (
          <figure key={plot.id} className="scatter-plot">
            <figcaption className="scatter-plot__cap">
              <span className="scatter-plot__title">{plot.title}</span>
              <span className="scatter-plot__rule">{plot.rule}</span>
            </figcaption>
            <div className="scatter-plot__frame">
              <PacificWorldScatter
                countries={SCATTER_COUNTRIES}
                methodId={plot.id}
                xDomain={domains.xDomain}
                yDomain={domains.yDomain}
                hoveredIso={hovered?.iso ?? null}
                onHover={setHovered}
              />
            </div>
          </figure>
        ))}
      </div>

      <div className="scatter__legend">
        <p className="scatter__legend-lead">
          Shared log axes: GDP per capita and ASR. The dashed line is a
          fair share of 1.
        </p>
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
        {SCATTER_IS_DUMMY ? (
          <p className="scatter__dummy">Dummy numbers — the cloud is a stand-in.</p>
        ) : null}
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
            <span>{hovered.pacific ? 'Pacific' : 'World'} · {formatGdp(hovered.gdp)}</span>
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
