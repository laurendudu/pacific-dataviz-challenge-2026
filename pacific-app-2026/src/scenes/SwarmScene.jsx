import { useReducedMotion } from 'motion/react'
import { Scene } from '../components/scroll/Scene'
import { EmissionSwarms } from '../components/chart/EmissionSwarms'
import { useContributions } from '../data/contributions'
import { DOT_GT, BUDGET_GT, SPENT_GT, CUT_PCT } from '../data/ghgBudget2023'
import {
  slice,
  easeInOutSmooth,
} from '../hooks/useScrollProgress'
import { format } from 'd3-format'

const formatDot = format('.2~f')
const formatGt = format('.3~r')

/** Hold the two columns, morph into the fraction, then sit with the ASR name. */
const MORPH = [0.20, 0.50]

/**
 * Follows the globe/schema sequence. Native scroll unsticks the schema,
 * then this pinned view holds the two 2023 swarms and folds them into
 * the global Absolute Sustainability Ratio.
 */
export function SwarmScene() {
  const reduceMotion = useReducedMotion()
  const { pacific } = useContributions()
  const pacificPct = pacific?.share_pct ?? 0.053

  return (
    <Scene id="budget" pages={6}>
      {(progress) => {
        const morphT = slice(progress, MORPH[0], MORPH[1])
        const morph = reduceMotion
          ? (morphT > 0.5 ? 1 : 0)
          : easeInOutSmooth(morphT)
        const capOpacity = 1 - slice(progress, 0.16, 0.28)
        const colOpacity = reduceMotion
          ? 1 - morph
          : 1 - slice(progress, 0.16, 0.30)
        const eqOpacity = reduceMotion
          ? (progress >= MORPH[1] ? 1 : 0)
          : slice(progress, 0.40, 0.52)
        const resultOpacity = reduceMotion
          ? (progress >= MORPH[1] ? 1 : 0)
          : slice(progress, 0.46, 0.58)
        const noteOpacity = reduceMotion
          ? (progress >= 0.58 ? 1 : 0)
          : slice(progress, 0.52, 0.64)
        /* World glyph sits between the definition and the two asks. */
        const worldOpacity = reduceMotion
          ? (progress >= 0.66 ? 1 : 0)
          : slice(progress, 0.64, 0.72)
        /* Numerator + denominator ask callouts share one beat. */
        const askOpacity = reduceMotion
          ? (progress >= 0.78 ? 1 : 0)
          : slice(progress, 0.74, 0.84)
        const qNumOpacity = askOpacity
        const qDenOpacity = askOpacity

        return (
          <div className="swarm">
            <div className="swarm__captions">
              <p
                className="swarm__caption"
                style={{ opacity: capOpacity }}
                aria-hidden={capOpacity < 0.5}
              >
                To hold warming at 2 °C, the world would have to emit no more than{' '}
                {formatGt(BUDGET_GT)} gigatonnes of greenhouse gases a year — indefinitely.
                In 2023 it emitted {formatGt(SPENT_GT)}.
              </p>
            </div>

            <div className="swarm__body">
              <EmissionSwarms
                morph={morph}
                colOpacity={colOpacity}
                eqOpacity={eqOpacity}
                resultOpacity={resultOpacity}
                noteOpacity={noteOpacity}
                worldOpacity={worldOpacity}
                qNumOpacity={qNumOpacity}
                qDenOpacity={qDenOpacity}
                pacificPct={pacificPct}
              />
            </div>

            <p className="swarm__unit">
              Each dot is {formatDot(DOT_GT)} GtCO₂e · closing the gap means cutting {CUT_PCT}%
            </p>
          </div>
        )
      }}
    </Scene>
  )
}
