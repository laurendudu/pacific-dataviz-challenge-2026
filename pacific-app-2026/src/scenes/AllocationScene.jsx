import { useEffect, useState } from 'react'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react'
import { Scene } from '../components/scroll/Scene'
import { AllocationPrinciples } from '../components/chart/AllocationPrinciples'
import { ASR_FILL_OVER, ASR_FILL_UNDER } from '../components/chart/AsrCountry'
import {
  ALLOCATION_BEATS,
  PACIFIC_BUDGET_ASK,
  PRINCIPLES,
} from '../data/allocation'
import { YEAR, useAsrTables } from '../data/asr'
import { useContributions } from '../data/contributions'
import { beatIndex } from '../hooks/useScrollProgress'

const BTN_FADE = {
  duration: 0.36,
  ease: [0.4, 0, 0.2, 1],
}

const PILL_SPRING = {
  type: 'spring',
  visualDuration: 0.35,
  bounce: 0.12,
}

const SCALE_OPTIONS = [
  { id: 'log', label: 'log₁₀' },
  { id: 'linear', label: 'linear' },
]

/**
 * Follows the world-disc scale guide. Arrival is the Pacific with no
 * ratios plotted: wells and the ASR = 1 ring only. Scroll names the
 * three rules one beat at a time. After all three unlock, the same frames
 * are reachable from the toggles.
 */
export function AllocationScene() {
  const tables = useAsrTables(YEAR)
  /* Emissions and population per territory: the allocation metric inverts
     the ASR against them to recover the entitlement in megatonnes. */
  const { rows } = useContributions()

  return (
    <Scene id="allocation" pages={ALLOC_BEATS} smooth={1}>
      {(progress) => (
        <AllocationView
          beat={beatIndex(progress, ALLOC_BEATS)}
          tables={tables}
          rows={rows}
        />
      )}
    </Scene>
  )
}

/** empty map → gf → eg → pr → hold with all toggles live. */
const ALLOC_BEATS = ALLOCATION_BEATS.hold + 1

function AllocationView({ beat, tables, rows }) {
  const reduceMotion = useReducedMotion()
  const [picked, setPicked] = useState(null)
  const [scale, setScale] = useState('log')

  const unlocked = {
    gf: beat >= ALLOCATION_BEATS.gf,
    eg: beat >= ALLOCATION_BEATS.eg,
    pr: beat >= ALLOCATION_BEATS.pr,
  }
  const allUnlocked = beat >= ALLOCATION_BEATS.hold

  useEffect(() => {
    if (!allUnlocked) setPicked(null)
  }, [allUnlocked])

  const scrolled =
    beat <= ALLOCATION_BEATS.empty
      ? null
      : beat === ALLOCATION_BEATS.gf
        ? 'gf'
        : beat === ALLOCATION_BEATS.eg
          ? 'eg'
          : 'pr'
  const methodId = allUnlocked && picked ? picked : scrolled
  const hasValues = methodId != null

  return (
    <div className="alloc alloc--map">
      <div className="alloc__captions">
        <p className="alloc__caption">
          {PACIFIC_BUDGET_ASK}
        </p>
        <p className="alloc__lede">
          Allocation principles are the rules that decide how to split a shared budget.
          How much should we allocate to the Pacific, and how does the Pacific actually respect its share? 
        </p>
      </div>

      <div className="alloc__body">
        <AllocationPrinciples
          methodId={methodId}
          tables={tables}
          rows={rows}
          year={YEAR}
          visual="map"
          scale={scale}
        >
          {/* All three rules hold the row from the first beat; the locked
              ones are simply invisible. Mounting them one at a time re-wrapped
              the row and pushed everything under it down a line per beat, so
              the scale capsule had to chase the shift. Reserving the finished
              layout up front means each rule fades in exactly where it will
              stay and nothing below it ever moves. */}
          <div className="alloc-toggles" role="group" aria-label="Allocation principles">
            {PRINCIPLES.map((p) => {
              const live = unlocked[p.id]
              return (
                <motion.button
                  key={p.id}
                  type="button"
                  className={`alloc-toggles__btn${methodId === p.id ? ' is-active' : ''}`}
                  aria-pressed={methodId === p.id}
                  aria-hidden={!live}
                  tabIndex={live && allUnlocked ? undefined : -1}
                  disabled={!allUnlocked || !live}
                  initial={false}
                  animate={{ opacity: live ? 1 : 0 }}
                  transition={reduceMotion ? { duration: 0 } : BTN_FADE}
                  style={{ pointerEvents: live && allUnlocked ? 'auto' : 'none' }}
                  onClick={() => { if (allUnlocked) setPicked(p.id) }}
                >
                  {p.label ?? p.title}
                </motion.button>
              )
            })}
          </div>
          <AnimatePresence initial={false}>
            {unlocked.gf ? (
              /* `layout` on the capsule, not just the pill. The pill's
                 `layoutId` projection measures against the viewport, so any
                 move of this control leaves the shade behind at the old
                 height. The scroll beats no longer move it — the toggle row
                 above reserves its full height from the start — but a resize
                 still rewraps that row. As a projection parent the capsule
                 absorbs the move and the pill, whose box relative to it never
                 changes, travels with it. Position only: the capsule never
                 resizes and `layout` would scale the labels. Entrance is
                 opacity alone, since an animated `y` fights the projection
                 transform. */
              <motion.div
                key="scale"
                className="alloc-scale"
                role="group"
                aria-label="ASR radius scale"
                layout={reduceMotion ? false : 'position'}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={reduceMotion ? BTN_FADE : { ...BTN_FADE, layout: PILL_SPRING }}
              >
                <LayoutGroup id="alloc-scale">
                {SCALE_OPTIONS.map((opt) => {
                  const on = scale === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={`alloc-scale__btn${on ? ' is-active' : ''}`}
                      aria-pressed={on}
                      onClick={() => setScale(opt.id)}
                    >
                      {on ? (
                        <motion.span
                          className="alloc-scale__pill"
                          layoutId={reduceMotion ? undefined : 'alloc-scale-pill'}
                          transition={PILL_SPRING}
                        />
                      ) : null}
                      <span className="alloc-scale__label">{opt.label}</span>
                    </button>
                  )
                })}
                </LayoutGroup>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </AllocationPrinciples>
      </div>

      <div className="alloc__legend" style={{ opacity: hasValues ? 1 : 0 }} aria-hidden={!hasValues}>
        <ul className="alloc__legend-keys">
          <li>
            <span
              className="alloc__legend-swatch"
              style={{ background: ASR_FILL_UNDER }}
              aria-hidden="true"
            />
            within the allocated share
          </li>
          <li>
            <span
              className="alloc__legend-swatch"
              style={{ background: ASR_FILL_OVER }}
              aria-hidden="true"
            />
            overshot the allocated share
          </li>
        </ul>
      </div>
    </div>
  )
}
