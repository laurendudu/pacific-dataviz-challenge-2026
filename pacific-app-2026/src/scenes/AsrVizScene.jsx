import { Scene } from '../components/scroll/Scene'
import { AsrScaleGuide } from '../components/chart/AsrScaleGuide'
import { ASR_FLOOR, ASR_RING_GAP } from '../components/chart/AsrCountry'
import { OVERSHOOT } from '../data/ghgBudget2023'

/** Same one-decimal overshoot the fraction prints as 6.4. */
const GUIDE_ASR = Math.round(OVERSHOOT * 10) / 10

/**
 * How to read an ASR disc. Follows the global fraction — the number the
 * reader just watched appear, drawn as the first disc they meet, at a size
 * that can carry the log scale rather than a sidebar overlay.
 */
export function AsrVizScene() {
  return (
    <Scene id="asr-viz" pages={1}>
      {() => (
        <div className="asr-viz">
          <div className="asr-viz__captions">
            <p className="asr-viz__caption">
              To visualize ASRs, we use a log scale. This is illustrated through the world’s ASR.
            </p>
          </div>

          <div className="asr-viz__body">
            <AsrScaleGuide asr={GUIDE_ASR} className="asr-guide--hero" />
          </div>

        </div>
      )}
    </Scene>
  )
}
