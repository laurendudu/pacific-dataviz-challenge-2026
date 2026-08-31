import { Scene } from '../components/scroll/Scene'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { AsrScaleGuide } from '../components/chart/AsrScaleGuide'
import { ASR_FLOOR } from '../components/chart/AsrCountry'
import { OVERSHOOT } from '../data/ghgBudget2023'
import { beatIndex } from '../hooks/useScrollProgress'

/** Same one-decimal overshoot the fraction prints as 6.4. */
const GUIDE_ASR = Math.round(OVERSHOOT * 10) / 10

const FADE = {
  duration: 0.38,
  ease: [0.4, 0, 0.2, 1],
}

/**
 * Disc + 1-ring → mint fills well-edge to ring → gold past it.
 * The disc is the glyph; the legend only names the two stretches of shade.
 */
const STAGES = ['well', 'mint', 'gold']

const CAPTIONS = [
  'The black well edge to the red dashed ring is ASR = 1 — one fair share.',
  'Mint is the stretch from that well edge to the ring: emissions still within the share.',
  `Past the ring the radius is log₁₀. Gold is overshoot — here, ASR ${GUIDE_ASR}.`,
]

const ASR_FOR_STAGE = {
  well: ASR_FLOOR,
  mint: 1,
  gold: GUIDE_ASR,
}

export const ASR_VIZ_BEAT_COUNT = STAGES.length

/**
 * How to read an ASR disc. Follows the global fraction — the number the
 * reader just watched appear, drawn as the first disc they meet. Scroll
 * grows the wash; mint then gold are named only once each colour is on the page.
 */
export function AsrVizScene() {
  return (
    <Scene id="asr-viz" pages={ASR_VIZ_BEAT_COUNT} smooth={1}>
      {(progress) => <AsrVizView beat={beatIndex(progress, ASR_VIZ_BEAT_COUNT)} />}
    </Scene>
  )
}

function AsrVizView({ beat }) {
  const reduceMotion = useReducedMotion()
  const stage = STAGES[beat] ?? STAGES[0]

  return (
    <div className="asr-viz">
      <div className="asr-viz__captions">
        <AnimatePresence mode="sync" initial={false}>
          <motion.p
            key={stage}
            className="asr-viz__caption"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={FADE}
          >
            {CAPTIONS[beat]}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="asr-viz__body">
        <AsrScaleGuide
          asr={ASR_FOR_STAGE[stage]}
          stage={stage}
          className="asr-guide--hero"
        />
      </div>
    </div>
  )
}
