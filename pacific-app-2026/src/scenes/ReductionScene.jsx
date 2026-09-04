import { useMemo, useState } from 'react'
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
 * Each unlocked principle toggle and the fair-share switch are clickable as
 * soon as they appear; earlier rules stay reachable from then on.
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
  /* `{ id|value, beat }` so a click only overrides the scroll frame it was
     made on; advancing (or going back) returns control to the beat. */
  const [picked, setPicked] = useState(null)
  const [toggledReduced, setToggledReduced] = useState(null)

  const unlocked = {
    gf: beat >= REDUCTION_BEATS.gf,
    eg: beat >= REDUCTION_BEATS.eg,
    pr: beat >= REDUCTION_BEATS.pr,
  }
  const scrolled = reductionBeatState(beat)

  const methodId =
    picked && picked.beat === beat && unlocked[picked.id]
      ? picked.id
      : scrolled.methodId
  const reduced =
    toggledReduced && toggledReduced.beat === beat
      ? toggledReduced.value
      : scrolled.reduced

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
                    tabIndex={shown ? undefined : -1}
                    disabled={!shown}
                    initial={false}
                    animate={{ opacity: shown ? 1 : 0 }}
                    transition={reduceMotion ? { duration: 0 } : BTN_FADE}
                    style={{ pointerEvents: shown ? 'auto' : 'none' }}
                    onClick={() => { if (shown) setPicked({ id: p.id, beat }) }}
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
              aria-disabled={!live}
              initial={false}
              animate={{ opacity: live ? 1 : 0 }}
              transition={reduceMotion ? { duration: 0 } : BTN_FADE}
              style={{ pointerEvents: live ? 'auto' : 'none' }}
              tabIndex={live ? undefined : -1}
              onClick={() => {
                if (live) setToggledReduced({ value: !reduced, beat })
              }}
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
