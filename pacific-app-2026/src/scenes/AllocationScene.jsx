import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Scene } from '../components/scroll/Scene'
import { AllocationPrinciples } from '../components/chart/AllocationPrinciples'
import { ASR_FILL_OVER, ASR_FILL_UNDER } from '../components/chart/AsrCountry'
import {
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

/**
 * Follows the world-disc scale guide. The swarm leaves a question — how
 * much of the budget belongs to the Pacific — and this page answers it on a
 * Pacific map, naming the three rules one scroll beat at a time. After all
 * three unlock, the same frames are reachable from the toggles.
 */
export function AllocationScene() {
  const tables = useAsrTables(YEAR)
  /* Emissions and population per territory — the allocation metric inverts
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

/** gf → eg → pr → hold with all toggles live. */
const ALLOC_BEATS = 4

function AllocationView({ beat, tables, rows }) {
  const reduceMotion = useReducedMotion()
  const [picked, setPicked] = useState(null)

  const unlocked = {
    gf: true,
    eg: beat >= 1,
    pr: beat >= 2,
  }
  const allUnlocked = beat >= 3

  useEffect(() => {
    if (!allUnlocked) setPicked(null)
  }, [allUnlocked])

  const scrolled = beat === 0 ? 'gf' : beat === 1 ? 'eg' : 'pr'
  const methodId = allUnlocked && picked ? picked : scrolled

  return (
    <div className="alloc alloc--map">
      <div className="alloc__captions">
        <p className="alloc__caption">
          {PACIFIC_BUDGET_ASK}
        </p>
        <p className="alloc__lede">
          A world budget is one number. A country only gets an entitlement
          once a rule decides how to split it — an allocation principle.
        </p>
      </div>

      <div className="alloc__body">
        <AllocationPrinciples
          methodId={methodId}
          tables={tables}
          rows={rows}
          year={YEAR}
          visual="map"
        >
          <div className="alloc-toggles" role="group" aria-label="Allocation principles">
            <AnimatePresence initial={false}>
              {PRINCIPLES.filter((p) => unlocked[p.id]).map((p) => (
                <motion.button
                  key={p.id}
                  type="button"
                  className={`alloc-toggles__btn${methodId === p.id ? ' is-active' : ''}`}
                  aria-pressed={methodId === p.id}
                  disabled={!allUnlocked}
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                  transition={BTN_FADE}
                  onClick={() => { if (allUnlocked) setPicked(p.id) }}
                >
                  {p.title}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        </AllocationPrinciples>
      </div>

      <div className="alloc__legend">
        <ul className="alloc__legend-keys">
          <li>
            <span
              className="alloc__legend-swatch"
              style={{ background: ASR_FILL_UNDER }}
              aria-hidden="true"
            />
            Mint: inside the allocation
          </li>
          <li>
            <span
              className="alloc__legend-swatch"
              style={{ background: ASR_FILL_OVER }}
              aria-hidden="true"
            />
            Gold: past the allocation
          </li>
        </ul>
      </div>
    </div>
  )
}
