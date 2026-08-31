import { useMemo } from 'react'
import { scaleLog } from 'd3-scale'
import { extent } from 'd3-array'
import { ChartFrame } from './ChartFrame'

/**
 * One hypothesis, one strip: every Pacific island as a dot on that indicator's
 * own log axis, with Palau marked and the peer median ticked.
 *
 * The row is deliberately the *same* shape every time it is used. Five rows of
 * one form let the reader see a pattern — Palau pinned to the right edge, then
 * one row where it is not — which four different chart types would hide.
 *
 * Each row carries its own scale because the units are not comparable
 * (kWh, tonnes, MJ per dollar). What is comparable is the position of one
 * island inside the same set of neighbours, which is the whole claim.
 */

const MARGIN = { top: 6, right: 12, bottom: 16, left: 12 }
const R = 5.5
/* The hit target is bigger than the mark — a 5px dot is a hard thing to catch
   with a mouse, and an impossible one with a thumb. */
const HIT = 13

export function HypothesisRow({ indicator, format, showEnds = false, hovered, onHover }) {
  return (
    <ChartFrame
      margin={MARGIN}
      title={`${indicator.label}, Pacific islands, ${indicator.year}`}
      desc={`Palau ${format(indicator.value)} ${indicator.unit}, rank
             ${indicator.rank} of ${indicator.n}; Pacific median
             ${format(indicator.peer_median)}.`}
    >
      {(dms) => (
        <Strip
          width={dms.boundedWidth}
          height={dms.boundedHeight}
          indicator={indicator}
          format={format}
          showEnds={showEnds}
          hovered={hovered}
          onHover={onHover}
        />
      )}
    </ChartFrame>
  )
}

function Strip({ width, height, indicator, format, showEnds, hovered, onHover }) {
  const { x, dots, subject } = useMemo(() => {
    const values = indicator.values.filter((d) => d.value > 0)
    const [lo, hi] = extent(values, (d) => d.value)
    const x = scaleLog()
      .domain([lo * 0.75, hi * 1.35])
      .range([0, width])

    /* Islands sharing a value would land on one another; nudge each repeat up
       by a dot so none is hidden. Sorted first, so the nudge is stable. */
    const sorted = [...values].sort((a, b) => a.value - b.value)
    const row = height * 0.62
    let lastX = -Infinity
    let stack = 0

    const dots = []
    for (const d of sorted) {
      const cx = x(d.value)
      stack = cx - lastX < R * 1.8 ? stack + 1 : 0
      lastX = cx
      dots.push({ ...d, cx, cy: row - stack * (R * 1.8) })
    }

    return { x, dots, subject: dots.find((d) => d.is_subject), row }
  }, [indicator, width, height])

  const medianX = x(indicator.peer_median)

  return (
    <>
      <line className="hyp__rule" x1={0} x2={width} y1={height * 0.62} y2={height * 0.62} />

      <g className="hyp__median" transform={`translate(${medianX},0)`}>
        <line y1={height * 0.62 - 9} y2={height * 0.62 + 9} />
        <text y={height} textAnchor="middle">median</text>
      </g>

      {dots.map((d) => {
        const isHovered = hovered === d.pict
        return (
          <g
            key={d.pict}
            className={`hyp__mark${d.is_subject ? ' is-subject' : ''}${
              isHovered ? ' is-hovered' : ''
            }`}
            onPointerMove={(event) =>
              onHover?.({
                pict: d.pict,
                name: d.name,
                value: d.value,
                unit: indicator.unit,
                label: indicator.label,
                rank: indicator.values.filter((o) => o.value > d.value).length + 1,
                year: d.year,
                n: indicator.values.length,
                x: event.clientX,
                y: event.clientY,
              })
            }
            onPointerLeave={() => onHover?.(null)}
          >
            <circle
              className="hyp__dot"
              cx={d.cx}
              cy={d.cy}
              r={d.is_subject ? R + 2 : R}
            />
            <circle className="hyp__hit" cx={d.cx} cy={d.cy} r={HIT} />
          </g>
        )
      })}

      {/* Direction is spelled out once, on the first row — after that the
          reader knows which way the axis runs. */}
      {showEnds ? (
        <g className="hyp__ends">
          <text x={0} y={height} textAnchor="start">less</text>
          <text x={width} y={height} textAnchor="end">more</text>
        </g>
      ) : null}

      {subject ? (
        <text
          className="hyp__value"
          x={Math.min(subject.cx, width - 4)}
          y={subject.cy - R - 8}
          textAnchor={subject.cx > width - 60 ? 'end' : 'middle'}
        >
          {format(subject.value)}
        </text>
      ) : null}
    </>
  )
}
