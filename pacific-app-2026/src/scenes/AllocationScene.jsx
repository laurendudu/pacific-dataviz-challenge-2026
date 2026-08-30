import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Scene } from '../components/scroll/Scene'
import { AllocationPrinciples, ASR_RING_GAP } from '../components/chart/AllocationPrinciples'
import { MAP_ASR_RING_GAP } from '../components/chart/AllocationMap'
import { ASR_FILL_OVER, ASR_FILL_UNDER } from '../components/chart/AsrCountry'
import {
  ALLOCATION_BEATS,
  PACIFIC_BUDGET_ASK,
  PRINCIPLES,
} from '../data/allocation'
import { YEAR, useAsrTables } from '../data/asr'
import { useContributions } from '../data/contributions'

const BTN_FADE = {
  duration: 0.36,
  ease: [0.4, 0, 0.2, 1],
}

/**
 * Follows the global ASR fraction. The swarm leaves a question — how much
 * of the budget belongs to the Pacific — and this page names the three
 * rules that can answer it, one scroll beat at a time. After all three
 * unlock, the same frames are reachable from the toggles.
 */
export function AllocationScene() {
  return <AllocationPage id="allocation" visual="grid" />
}

/** Same beats and rail as the grid page; the right pane is a Pacific map. */
export function AllocationMapScene() {
  return <AllocationPage id="allocation-map" visual="map" />
}

function AllocationPage({ id, visual }) {
  const tables = useAsrTables(YEAR)
  /* Emissions and population per territory — the allocation metric inverts
     the ASR against them to recover the entitlement in megatonnes. */
  const { rows } = useContributions()

  return (
    <Scene id={id} pages={8}>
      {(progress) => (
        <AllocationView
          progress={progress}
          tables={tables}
          rows={rows}
          visual={visual}
        />
      )}
    </Scene>
  )
}

function AllocationView({ progress, tables, rows, visual = 'grid' }) {
  const reduceMotion = useReducedMotion()
  const [picked, setPicked] = useState(null)

  const unlocked = {
    gf: progress >= ALLOCATION_BEATS.gf,
    eg: progress >= ALLOCATION_BEATS.eg,
    pr: progress >= ALLOCATION_BEATS.pr,
  }
  const allUnlocked = unlocked.gf && unlocked.eg && unlocked.pr

  useEffect(() => {
    if (!allUnlocked) setPicked(null)
  }, [allUnlocked])

  const scrolled =
    progress < ALLOCATION_BEATS.eg ? 'gf'
      : progress < ALLOCATION_BEATS.pr ? 'eg'
        : 'pr'
  const methodId = allUnlocked && picked ? picked : scrolled
  const principle = PRINCIPLES.find((p) => p.id === methodId) ?? PRINCIPLES[0]

  return (
    <div className={`alloc${visual === 'map' ? ' alloc--map' : ''}`}>
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
          methodId={principle.id}
          tables={tables}
          rows={rows}
          year={YEAR}
          visual={visual}
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
        <p className="alloc__legend-lead">
          {visual === 'map' ? (
            <>
              Same wells as the grid. The red dashed ring is ASR = 1
              ({MAP_ASR_RING_GAP}px out). Shade grows {MAP_ASR_RING_GAP}px per
              unit of ASR.
            </>
          ) : (
            <>
              A fair share is a red dashed ring of 1 ({ASR_RING_GAP}px out). The shade
              is the country’s 2023 emissions relative to its allocation — not a
              decorative disc.
            </>
          )}
        </p>
        <ul className="alloc__legend-keys">
          <li>
            <span
              className="alloc__legend-swatch"
              style={{ background: ASR_FILL_UNDER }}
              aria-hidden="true"
            />
            Sage: inside the allocation
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
