import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Scene } from '../components/scroll/Scene'
import { AllocationMap } from '../components/chart/AllocationMap'
import { ReductionSwarm } from '../components/chart/ReductionSwarm'
import { PRINCIPLES } from '../data/allocation'
import { YEAR, useAsrTables } from '../data/asr'
import { useContributions } from '../data/contributions'
import {
  REDUCTION_BEAT_COUNT,
  REDUCTION_BEATS,
  TOTAL_DOTS,
  clampToFairShare,
  reductionBeatState,
  useReductionFigures,
} from '../data/reduction'
import { beatIndex } from '../hooks/useScrollProgress'

/**
 * What the Pacific can actually put on the table.
 *
 * Same map as the allocation scene. Scroll names each rule twice: first the
 * live ASR discs, then the same discs with every overshooter clamped to 1.
 * The switch follows that beat until the hold, when both controls go live.
 *
 * The swarm beside it does not re-pack when the rule changes. The 2023 field
 * is 433 dots of 0.1 Gt; the Pacific's overshoot is a fraction of one of
 * them, drawn as the black wedge in the magnified dot.
 */

const BTN_FADE = { duration: 0.36, ease: [0.4, 0, 0.2, 1] }

export function ReductionScene() {
  const tables = useAsrTables(YEAR)
  const { rows } = useContributions()

  return (
    <Scene id="reduction" pages={REDUCTION_BEAT_COUNT} smooth={1}>
      {(progress) => (
        <ReductionView
          beat={beatIndex(progress, REDUCTION_BEAT_COUNT)}
          tables={tables}
          rows={rows}
        />
      )}
    </Scene>
  )
}

function ReductionView({ beat, tables, rows }) {
  const reduceMotion = useReducedMotion()
  const [picked, setPicked] = useState(null)
  const [toggledReduced, setToggledReduced] = useState(true)

  const unlocked = {
    gf: beat >= REDUCTION_BEATS.gf,
    eg: beat >= REDUCTION_BEATS.eg,
    pr: beat >= REDUCTION_BEATS.pr,
  }
  const allUnlocked = beat >= REDUCTION_BEATS.hold
  const scrolled = reductionBeatState(beat)

  useEffect(() => {
    if (!allUnlocked) {
      setPicked(null)
      return
    }
    setToggledReduced(true)
  }, [allUnlocked])

  const methodId = allUnlocked && picked ? picked : scrolled.methodId
  const reduced = allUnlocked ? toggledReduced : scrolled.reduced

  const principle = methodId
    ? PRINCIPLES.find((p) => p.id === methodId) ?? PRINCIPLES[0]
    : null
  const rawValues = principle ? tables?.[principle.table] ?? null : null
  const loaded = !!rawValues
  const hideFill = !principle
  const figures = useReductionFigures(rows, rawValues)

  const values = useMemo(
    () => (reduced ? clampToFairShare(rawValues) : rawValues),
    [reduced, rawValues],
  )

  const pacific = figures?.pacific
  const world = figures?.world
  const live = Boolean(principle)

  return (
    <div className="reduction">
      <div className="reduction__captions">
        <p className="reduction__caption">What can the Pacific put on the table?</p>
        <p className="reduction__lede">
          We've established that the Pacific contains some overshooters. However, even if they reduce their emissions to their allocated share, the Pacific's contribution is still a fraction of global emissions. 
          The Pacific is one of the most vulnerable regions on earth, but does not have the hand on the global thermostat, even if they reduce their emissions.
        </p>
      </div>

      <div className="reduction__body">
        <div className="reduction__panel reduction__panel--map">
          <div className="reduction__controls">
            <div className="alloc-toggles" role="group" aria-label="Allocation principles">
              {PRINCIPLES.map((p) => {
                const shown = unlocked[p.id]
                return (
                  <motion.button
                    key={p.id}
                    type="button"
                    className={`alloc-toggles__btn${methodId === p.id ? ' is-active' : ''}`}
                    aria-pressed={methodId === p.id}
                    aria-hidden={!shown}
                    tabIndex={shown && allUnlocked ? undefined : -1}
                    disabled={!allUnlocked || !shown}
                    initial={false}
                    animate={{ opacity: shown ? 1 : 0 }}
                    transition={reduceMotion ? { duration: 0 } : BTN_FADE}
                    style={{ pointerEvents: shown && allUnlocked ? 'auto' : 'none' }}
                    onClick={() => { if (allUnlocked) setPicked(p.id) }}
                  >
                    {p.label ?? p.title}
                  </motion.button>
                )
              })}
            </div>

            <motion.button
              type="button"
              className="alluvial-switch reduction__switch"
              role="switch"
              aria-checked={reduced}
              aria-disabled={!allUnlocked}
              initial={false}
              animate={{ opacity: live ? 1 : 0 }}
              transition={reduceMotion ? { duration: 0 } : BTN_FADE}
              style={{ pointerEvents: live && allUnlocked ? 'auto' : 'none' }}
              tabIndex={live && allUnlocked ? undefined : -1}
              onClick={() => { if (allUnlocked) setToggledReduced((v) => !v) }}
            >
              <span className="alluvial-switch__track" aria-hidden="true">
                <span className="alluvial-switch__thumb" />
              </span>
              Reduce to a fair share
            </motion.button>
          </div>

          <div className="reduction__map">
            <AllocationMap
              values={values}
              loaded={loaded}
              principle={principle}
              year={YEAR}
              hideFill={hideFill}
              scale="log"
            />
          </div>
        </div>

        <div className="reduction__panel reduction__panel--swarm">
          <ReductionSwarm
            totalDots={figures?.totalDots ?? TOTAL_DOTS}
            excessDots={live ? pacific?.dots ?? 0 : 0}
            sharePct={live ? pacific?.pctOfWorld ?? 0 : 0}
            reduced={reduced && live}
            reduceMotion={reduceMotion}
          />
        </div>
      </div>
    </div>
  )
}
