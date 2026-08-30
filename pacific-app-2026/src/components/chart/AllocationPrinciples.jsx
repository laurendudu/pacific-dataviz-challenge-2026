import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { AsrCountry, ASR_RING_GAP, asrRadii } from './AsrCountry'
import { AllocationMap } from './AllocationMap'
import { AllocationBudget } from './AllocationBudget'
import { PACIFIC_TERRITORIES, PRINCIPLES } from '../../data/allocation'

const SIZE = 36
const FRAME = asrRadii(SIZE, 1).rOne

const FADE = {
  duration: 0.38,
  ease: [0.4, 0, 0.2, 1],
}

/**
 * One allocation rule at a time: definition and the budget it hands the
 * Pacific on the left, every Pacific territory on the right — either AsrCountry glyphs (`visual="grid"`) or a
 * Pacific map of ASR discs (`visual="map"`). D3 stays inside the
 * child charts; this file only composes.
 */
export function AllocationPrinciples({
  methodId = 'gf',
  tables,
  rows,
  year,
  visual = 'grid',
  children,
}) {
  const reduceMotion = useReducedMotion()
  const principle = PRINCIPLES.find((p) => p.id === methodId) ?? PRINCIPLES[0]
  const values = tables?.[principle.table] ?? null
  const loaded = !!values

  return (
    <div className="alloc-frame">
      <div className="alloc-frame__rail">
        {children}
        <div className="alloc-frame__copy-slot">
          <AnimatePresence mode="sync" initial={false}>
            <motion.div
              key={principle.id}
              className="alloc-frame__copy"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={FADE}
            >
              <h3 className="alloc-frame__title">{principle.title}</h3>
              <p className="alloc-frame__rule">{principle.rule}</p>
              <p className="alloc-frame__definition">{principle.definition}</p>
              <div
                className="alloc-frame__eq"
                role="math"
                aria-label={`ASR equals ${principle.equation.numerator} divided by ${principle.equation.denominator}`}
              >
                <span className="alloc-frame__eq-lhs" aria-hidden="true">
                  ASR =
                </span>
                <span className="alloc-frame__eq-frac" aria-hidden="true">
                  <span className="alloc-frame__eq-num">
                    {principle.equation.numerator}
                  </span>
                  <span className="alloc-frame__eq-den">
                    {principle.equation.denominator}
                  </span>
                </span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
        <AllocationBudget rows={rows} tables={tables} principle={principle} />
      </div>

      {visual === 'map' ? (
        <AllocationMap
          values={values}
          loaded={loaded}
          principle={principle}
          year={year}
        />
      ) : (
        <div
          className="alloc-pacific"
          role="list"
          aria-label={`${principle.title} Absolute Sustainability Ratios for Pacific territories, ${year}`}
        >
          {PACIFIC_TERRITORIES.map((place) => {
            const raw = values?.get(place.iso)
            const asr = raw == null ? undefined : Number(raw)
            const missing = loaded && !Number.isFinite(asr)
            return (
              <div
                key={place.iso}
                className={`alloc-pacific__item${missing ? ' is-missing' : ''}`}
                role="listitem"
                style={{ zIndex: missing ? 0 : 1 + Math.min(40, Math.round(Number.isFinite(asr) ? asr : 0)) }}
              >
                <AsrCountry
                  name={place.name}
                  iso={place.iso}
                  asr={asr}
                  size={SIZE}
                  frameRadius={FRAME}
                  fit="shared"
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export { ASR_RING_GAP }
