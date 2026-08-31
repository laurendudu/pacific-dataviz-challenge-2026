import { useReducedMotion } from 'motion/react'
import { Scene } from '../components/scroll/Scene'
import { EmissionSwarms } from '../components/chart/EmissionSwarms'
import { useContributions } from '../data/contributions'
import { DOT_GT, BUDGET_GT, CUT_PCT } from '../data/ghgBudget2023'
import { beatIndex } from '../hooks/useScrollProgress'
import { useAnimatedValues } from '../hooks/useAnimatedValues'
import { format } from 'd3-format'

const formatDot = format('.2~f')
const formatGt = format('.3~r')

/**
 * One sticky page per beat after the globe:
 *   0  two 2023 swarms + the 2 °C budget sentence
 *   1  fold into the global ASR fraction, named to the right of the result
 *   2  numerator / denominator asks
 *
 * The world-disc scale guide is the next scene (`#asr-viz`), so this
 * fraction stays centred.
 */
const SWARM_BEATS = [
  { morph: 0, cap: 1, col: 1, eq: 0, result: 0, note: 0, ask: 0 },
  { morph: 1, cap: 0, col: 0, eq: 1, result: 1, note: 1, ask: 0 },
  { morph: 1, cap: 0, col: 0, eq: 1, result: 1, note: 1, ask: 1 },
]

export const SWARM_BEAT_COUNT = SWARM_BEATS.length
/** Timeline “Introducing ASR” lands on the named-fraction beat. */
export const SWARM_ASR_BEAT = 1

export function SwarmScene() {
  return (
    <Scene id="budget" pages={SWARM_BEAT_COUNT} smooth={1}>
      {(progress) => <SwarmView beat={beatIndex(progress, SWARM_BEAT_COUNT)} />}
    </Scene>
  )
}

function SwarmView({ beat }) {
  const reduceMotion = useReducedMotion()
  const { pacific } = useContributions()
  const pacificPct = pacific?.share_pct ?? 0.053
  const values = useAnimatedValues(SWARM_BEATS[beat] ?? SWARM_BEATS[0], {
    duration: 0.78,
    reduceMotion,
  })

  return (
    <div className="swarm">
      <div className="swarm__captions">
        <p
          className="swarm__caption"
          style={{ opacity: values.cap }}
          aria-hidden={values.cap < 0.5}
        >
          To hold warming at 2 °C, the world would have to emit no more than{' '}
          {formatGt(BUDGET_GT)} gigatonnes of greenhouse gases a year, indefinitely.
        </p>
      </div>

      <div className="swarm__body">
        <EmissionSwarms
          morph={values.morph}
          colOpacity={values.col}
          eqOpacity={values.eq}
          resultOpacity={values.result}
          noteOpacity={values.note}
          qNumOpacity={values.ask}
          qDenOpacity={values.ask}
          pacificPct={pacificPct}
        />
      </div>

      <p className="swarm__unit">
        <span className="swarm__unit-dot" aria-hidden="true" />
        Each dot is {formatDot(DOT_GT)} GtCO₂e
      </p>
    </div>
  )
}
