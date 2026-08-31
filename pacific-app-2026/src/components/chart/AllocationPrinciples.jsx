import { useMemo } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { format } from 'd3-format'
import { AsrCountry, asrRadii } from './AsrCountry'
import { AllocationMap } from './AllocationMap'
import { PACIFIC_TERRITORIES, PRINCIPLES } from '../../data/allocation'
import { pacificAllocation, worldBudgetMt } from '../../data/pacificBudget'

const SIZE = 36
const FRAME = asrRadii(SIZE, 1).rOne

const formatMt = format('.3~r')

/** 0.053 rather than 0.05 — three decimals keeps all three rules legible. */
function formatBudgetPct(pct) {
  if (pct == null || !Number.isFinite(pct)) return '—'
  return pct < 1 ? pct.toFixed(3) : pct.toFixed(2)
}

/** Same 14 places as PACIFIC_TERRITORIES; Palau last in row-major grid order. */
const GRID_TERRITORIES = [
  ...PACIFIC_TERRITORIES.filter((t) => t.iso !== 'PLW'),
  ...PACIFIC_TERRITORIES.filter((t) => t.iso === 'PLW'),
]

const FADE = {
  duration: 0.38,
  ease: [0.4, 0, 0.2, 1],
}

function allocationFigures(principle, result, worldMt) {
  return {
    using: principle.title.toLowerCase(),
    mt: formatMt(result.mt),
    pct: formatBudgetPct(worldMt ? (result.mt / worldMt) * 100 : null),
  }
}

/**
 * One allocation rule at a time: a headline and definition on the left,
 * every Pacific territory on the right — a Pacific map of ASR discs, or
 * AsrCountry glyphs if `visual="grid"`. D3 stays inside the child charts;
 * this file only composes.
 */
export function AllocationPrinciples({
  methodId = null,
  tables,
  rows,
  year,
  visual = 'grid',
  children,
}) {
  const reduceMotion = useReducedMotion()
  const principle = methodId
    ? PRINCIPLES.find((p) => p.id === methodId) ?? PRINCIPLES[0]
    : null
  const values = principle ? tables?.[principle.table] ?? null : null
  const loaded = !!values
  const hideFill = !principle

  const result = useMemo(
    () => (principle ? pacificAllocation(rows, values) : null),
    [principle, rows, values],
  )
  const worldMt = useMemo(
    () => (principle ? worldBudgetMt(rows, values) : null),
    [principle, rows, values],
  )
  const figures = principle && result
    ? allocationFigures(principle, result, worldMt)
    : null

  return (
    <div className="alloc-frame">
      <div className="alloc-frame__rail">
        {children}
        <div className="alloc-frame__copy-slot">
          <AnimatePresence mode="sync" initial={false}>
            {principle ? (
              <motion.div
                key={principle.id}
                className="alloc-frame__copy"
                initial={reduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                transition={FADE}
              >
                {figures ? (
                  <p className="alloc-frame__headline">
                    If we allocate the world budget using{' '}
                    <mark className="alloc-frame__hl">{figures.using}</mark>, the
                    allocated share of the Pacific is about{' '}
                    <mark className="alloc-frame__hl">{figures.mt} MtCO₂e</mark>
                    , which is about{' '}
                    <mark className="alloc-frame__hl">{figures.pct}%</mark>
                    {' '}of the world budget.
                  </p>
                ) : null}
                <p className="alloc-frame__definition">{principle.definition}</p>
                <div
                  className="alloc-frame__eq"
                  role="math"
                  aria-label={`ASR equals ${principle.equation.numerator} divided by ${principle.equation.denominator}`}
                >
                  <span className="alloc-frame__eq-lhs" aria-hidden="true">
                    <span>ASR =</span>
                  </span>
                  <span className="alloc-frame__eq-num" aria-hidden="true">
                    {principle.equation.numerator}
                  </span>
                  <span className="alloc-frame__eq-bar" aria-hidden="true" />
                  <span className="alloc-frame__eq-den" aria-hidden="true">
                    {principle.equation.denominator}
                  </span>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {visual === 'map' ? (
        <AllocationMap
          values={values}
          loaded={loaded}
          principle={principle}
          year={year}
          hideFill={hideFill}
        />
      ) : (
        <div
          className="alloc-pacific"
          role="list"
          aria-label={
            principle
              ? `${principle.title} Absolute Sustainability Ratios for Pacific territories, ${year}`
              : `Pacific territories and the ASR = 1 ring, ${year}`
          }
        >
          {GRID_TERRITORIES.map((place) => {
            const raw = values?.get(place.iso)
            const asr = raw == null ? undefined : Number(raw)
            const missing = loaded && !Number.isFinite(asr)
            return (
              <div
                key={place.iso}
                className={`alloc-pacific__item${missing ? ' is-missing' : ''}`}
                role="listitem"
                style={{
                  zIndex: missing
                    ? 0
                    : Math.round(200 - Math.min(180, Number.isFinite(asr) ? asr : 0)),
                }}
              >
                <AsrCountry
                  name={place.name}
                  iso={place.iso}
                  asr={asr}
                  size={SIZE}
                  frameRadius={FRAME}
                  fit="shared"
                  hideFill={hideFill}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
