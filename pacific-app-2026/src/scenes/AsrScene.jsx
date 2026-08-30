import { Scene } from '../components/scroll/Scene'
import { AsrCountry, ASR_RING_GAP, asrRadii } from '../components/chart/AsrCountry'
import { EXAMPLES, YEAR, useAsr } from '../data/asr'

const SIZE = 59

/**
 * Follows the 2023 carbon-budget swarms. Four countries, one component:
 * a well-below-1 atoll, a Pacific state just under its fair share, a
 * Pacific state over it, and a large emitter far past the 1-ring.
 *
 * The shared frame is sized to Fiji (ASR ~3.4) so that disc is fully
 * visible. China's ~11.5 disc is drawn at true radius and clips at the
 * frame — the caption carries the number.
 */
export function AsrScene() {
  const { values } = useAsr(YEAR)
  const rOne = asrRadii(SIZE, 1).rOne
  const frameRadius = rOne * 3.5

  const glyphs = EXAMPLES.map((ex) => ({
    ...ex,
    asr: values?.get(ex.iso) ?? ex.asr,
  }))

  return (
    <Scene id="asr" pages={2}>
      {() => (
        <div className="asr">
          <div className="asr__captions">
            <p className="asr__caption">
              A fair share is a red dashed circle of 1. Each country's shade
              scales with how much of that share it used.
            </p>
          </div>

          <div className="asr__body">
            {glyphs.map((g) => (
              <AsrCountry
                key={g.iso}
                name={g.name}
                iso={g.iso}
                asr={g.asr}
                size={SIZE}
                frameRadius={frameRadius}
              />
            ))}
          </div>

          <p className="asr__legend">
            The country sits in the well. Red dashed ring is ASR = 1 ({ASR_RING_GAP}px out).
          </p>
        </div>
      )}
    </Scene>
  )
}
