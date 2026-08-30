import { useMemo } from 'react'
import { arc } from 'd3-shape'
import { format } from 'd3-format'
import { STATUS_FILL, STATUS_STROKE } from '../../data/planetaryBoundaries'
import { DOT_GT } from '../../data/ghgBudget2023'
import { pacificAllocation, worldBudgetMt } from '../../data/pacificBudget'

const R = 34
const BOX = R * 2 + 4

const formatMt = format('.3~r')
const formatDotPct = format('.2~r')

/** 0.053 rather than 0.05 — three decimals keeps all three rules legible. */
function formatBudgetPct(pct) {
  if (pct == null || !Number.isFinite(pct)) return '—'
  return pct < 1 ? pct.toFixed(3) : pct.toFixed(2)
}

/**
 * What one allocation rule actually hands the Pacific, as two figures.
 *
 * The circle is one dot from the budget swarm two scenes up — 0.1 GtCO₂e,
 * a 68th of the world's annual allowance — drawn large. The Pacific's entire
 * entitlement is a wedge of that single dot, which is the point: no rule
 * gives the region enough to fill one mark of the world plot.
 *
 * d3-shape only produces the wedge `d` string; React draws every element.
 */
export function AllocationBudget({ rows, tables, principle }) {
  const values = tables?.[principle.table] ?? null

  const result = useMemo(() => pacificAllocation(rows, values), [rows, values])
  const worldMt = useMemo(() => worldBudgetMt(rows, values), [rows, values])

  const wedge = useMemo(() => {
    if (!result) return null
    return arc()({
      innerRadius: 0,
      outerRadius: R,
      startAngle: 0,
      endAngle: 2 * Math.PI * Math.min(1, result.dotFraction),
    })
  }, [result])

  if (!result) return <div className="alloc-metric" aria-hidden="true" />

  const budgetPct = worldMt ? (result.mt / worldMt) * 100 : null
  const partial = result.dropped.length > 0
  const fillPct = result.dotFraction * 100

  return (
    <div className="alloc-metric">
      <div className="alloc-metric__row">
        <svg
          className="alloc-metric__dot"
          viewBox={`0 0 ${BOX} ${BOX}`}
          width={BOX}
          height={BOX}
          role="img"
          aria-label={`One 0.1 gigatonne budget dot, ${formatDotPct(fillPct)} per cent filled — the ${formatMt(result.mt)} megatonnes this rule allocates to the Pacific.`}
        >
          <g transform={`translate(${BOX / 2}, ${BOX / 2})`}>
            <circle className="alloc-metric__dot-well" r={R} />
            <path
              d={wedge}
              fill={STATUS_FILL.safe}
              stroke={STATUS_STROKE.safe}
              strokeWidth="0.6"
            />
            <circle className="alloc-metric__dot-ring" r={R} />
          </g>
        </svg>

        <dl className="alloc-metric__figures">
          <div className="alloc-metric__figure">
            <dd className="alloc-metric__value">
              {formatMt(result.mt)}
              <span className="alloc-metric__unit"> MtCO₂e</span>
            </dd>
            <dt className="alloc-metric__label">
              allocated to the Pacific
              {partial ? <span className="alloc-metric__star" aria-hidden="true">*</span> : null}
            </dt>
          </div>
          <div className="alloc-metric__figure">
            <dd className="alloc-metric__value">
              {formatBudgetPct(budgetPct)}
              <span className="alloc-metric__unit">%</span>
            </dd>
            <dt className="alloc-metric__label">of the world budget</dt>
          </div>
        </dl>
      </div>

      <p className="alloc-metric__note">
        The circle is one dot of the budget swarm — {DOT_GT} GtCO₂e. The whole
        Pacific entitlement fills {formatDotPct(fillPct)}% of it.
        {partial ? (
          <>
            {' '}
            <span className="alloc-metric__star" aria-hidden="true">*</span>
            {result.covered.length} of 14: no PPP GDP for{' '}
            {result.dropped.map((d) => d.name).join(' or ')}.
          </>
        ) : null}
      </p>
    </div>
  )
}
