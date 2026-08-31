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
              The {GUIDE_ASR} is the world’s Absolute Sustainability Ratio. Drawn,
              it looks like this — and every country from here on is the same
              ratio, as a disc.
            </p>
          </div>

          <div className="asr-viz__body">
            <AsrScaleGuide asr={GUIDE_ASR} className="asr-guide--hero" />
          </div>

          <p className="asr-viz__note">
            Mint sits within its fair share, gold has overshot it, and the red
            dashed ring is ASR 1 — the share exactly spent. The radius is log₁₀
            from {ASR_FLOOR}, with that ring {ASR_RING_GAP}px from the well, so
            a country at 100 sits next to one at 6 without a metre of gold. Read
            a disc as under or over the ring — not as a ratio of areas.
          </p>
        </div>
      )}
    </Scene>
  )
}
