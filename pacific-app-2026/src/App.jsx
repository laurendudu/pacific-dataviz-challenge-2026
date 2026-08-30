import { useEffect, useRef, useState } from 'react'
import {
  GlobeScene,
  Globe,
  subscribeSidebarReveal,
  getSidebarReveal,
} from './scenes/GlobeScene'
import { SwarmScene } from './scenes/SwarmScene'
import { AllocationMapScene, AllocationScene } from './scenes/AllocationScene'
import { RankingScene } from './scenes/RankingScene'
import { ScatterScene } from './scenes/ScatterScene'
import { PalauScene } from './scenes/PalauScene'
import { AsrScene } from './scenes/AsrScene'
import { Timeline, useChartTimeline } from './components/scroll/Timeline'

/**
 * `?p=0.45` freezes the *globe* at that scroll progress and renders it
 * full-viewport with no pinning — handy for eyeballing a single beat while
 * tuning the choreography. The swarm scene is a following section, so use
 * the normal site and scroll (or jump to `#budget` / `#allocation` /
 * `#ranking` / `#pacific-vs-world` / `#palau` / `#allocation-map` / `#asr`).
 * The global ASR fraction is a later beat of `#budget`.
 *
 * Useful marks: 0 opening · ~0.38 Pacific zoom · ~0.52 full earth ·
 * ~0.64 radar · ~0.82 grey pies · ~0.85 colorize · ~0.89 7-of-9 · ~0.96 climate.
 */
export default function App() {
  const frozenParam = new URLSearchParams(window.location.search).get('p')
  const frozen = frozenParam !== null
  const progress = frozen ? Number(frozenParam) : null

  return (
    <main className={`app-shell${frozen ? ' app-shell--frozen' : ''}`}>
      <ShellSidebar globeProgress={progress} frozen={frozen} />
      <div className="app-shell__stage">
        {frozen ? (
          <Globe progress={progress} frozen />
        ) : (
          <>
            <GlobeScene />
            <SwarmScene />
            <AllocationScene />
            <RankingScene />
            <ScatterScene />
            <PalauScene />
            <AllocationMapScene />
            <AsrScene />
          </>
        )}
      </div>
    </main>
  )
}

/**
 * Sidebar open/reveal live here so flipping shell classes does not re-render
 * Globe / Swarm / ASR — that re-render was a ~1s main-thread hitch.
 * Open = slid in after morph (invisible). Reveal = fade with legend/sentence.
 */
function ShellSidebar({ globeProgress, frozen }) {
  const asideRef = useRef(null)
  const { visible, activeId } = useChartTimeline({ globeProgress, frozen })
  const [revealed, setRevealed] = useState(() => getSidebarReveal() > 0.5)

  useEffect(() => {
    const shell = asideRef.current?.closest('.app-shell')
    shell?.classList.toggle('is-open', visible)
  }, [visible])

  useEffect(() => {
    return subscribeSidebarReveal((op) => {
      const el = asideRef.current
      if (el) el.style.opacity = String(op)
      setRevealed((was) => {
        const next = op > 0.5
        return next === was ? was : next
      })
    })
  }, [])

  return (
    <aside
      ref={asideRef}
      className="app-shell__sidebar"
      aria-hidden={!revealed}
    >
      <Timeline visible={revealed} activeId={activeId} frozen={frozen} />
    </aside>
  )
}
