import { Scene } from '../components/scroll/Scene'
import { AsrCountry, ASR_RING_GAP, asrDecadePx, asrRadii } from '../components/chart/AsrCountry'
import { EXAMPLES, YEAR, useAsr } from '../data/asr'

const SIZE = 59

/**
 * Follows the 2023 carbon-budget swarms. Four countries, one component:
 * a well-below-1 atoll, a Pacific state just under its fair share, a
 * Pacific state over it, and a large emitter far past the 1-ring.
 *
 * All four share one frame, sized to hug the largest disc: China at
 * ~11.5. The SVG width is capped in CSS, so a looser frame would only
 * shrink every glyph.
 *
 * The scale itself is explained back in the swarm scene, where the reader
 * first meets a disc. See `AsrScaleGuide`.
 */
export function AsrScene() {
  const { values } = useAsr(YEAR)

  const glyphs = EXAMPLES.map((ex) => ({
    ...ex,
    asr: values?.get(ex.iso) ?? ex.asr,
  }))

  const frameRadius = Math.max(
    asrRadii(SIZE, 1).rOne,
    ...glyphs.map((g) => asrRadii(SIZE, g.asr).rAsr),
  ) + 10

  return (
    <Scene id="asr" pages={1}>
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
            The country sits in the well. The shade takes {ASR_RING_GAP}px to reach the
            red dashed ring at ASR = 1, then grows {asrDecadePx()}px for every tenfold
            past it.
          </p>
        </div>
      )}
    </Scene>
  )
}
