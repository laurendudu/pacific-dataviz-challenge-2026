import { useMemo } from 'react'
import { scaleLog } from 'd3-scale'
import { extent } from 'd3-array'
import { ChartFrame } from './ChartFrame'
import { AxisBottom } from './Axis'

/**
 * Every country as one dot, stacked into bins along a log axis — a Wilkinson
 * dot plot. It answers "where does this country sit in the world" without
 * asking anyone to read two hundred bars.
 *
 * D3 supplies the scale and the extent; the binning is arithmetic; React draws
 * every circle. No layout module needed, so the stacking is deterministic —
 * a force-directed beeswarm would move dots on every re-render.
 */

const MARGIN = { top: 16, right: 20, bottom: 44, left: 20 }
const DOT_R = 3.1
const DOT_GAP = 1.4
const BIN_COUNT = 46

export function DotDistribution({
  values,
  subject,
  subjectLabel,
  others = [],
  median,
  medianLabel = 'World median',
  tickFormat = String,
  ticks,
  axisLabel,
  title,
  desc,
}) {
  return (
    <ChartFrame margin={MARGIN} title={title} desc={desc}>
      {(dms) => (
        <Dots
          width={dms.boundedWidth}
          height={dms.boundedHeight}
          values={values}
          subject={subject}
          subjectLabel={subjectLabel}
          others={others}
          median={median}
          medianLabel={medianLabel}
          tickFormat={tickFormat}
          ticks={ticks}
          axisLabel={axisLabel}
        />
      )}
    </ChartFrame>
  )
}

function Dots({
  width, height, values, subject, subjectLabel, others,
  median, medianLabel, tickFormat, ticks, axisLabel,
}) {
  const { x, stacks, baseline } = useMemo(() => {
    const domain = extent([...values, subject])
    const x = scaleLog().domain(domain).range([0, width]).nice()
    const baseline = height - 8

    /* Bin on the pixel axis, not on the value: equal-width bins in log space
       are what the eye reads as evenly spaced. */
    const step = width / BIN_COUNT
    const counts = new Map()
    const stacks = values.map((value) => {
      const bin = Math.min(BIN_COUNT - 1, Math.floor(x(value) / step))
      const k = counts.get(bin) ?? 0
      counts.set(bin, k + 1)
      return {
        value,
        cx: (bin + 0.5) * step,
        cy: baseline - k * (DOT_R * 2 + DOT_GAP) - DOT_R,
      }
    })

    return { x, stacks, baseline }
  }, [values, subject, width, height])

  const subjectX = x(subject)

  return (
    <>
      <AxisBottom
        scale={x}
        y={height}
        ticks={ticks}
        tickFormat={tickFormat}
        label={axisLabel}
      />

      {median != null ? (
        <g className="dotdist__median" transform={`translate(${x(median)},0)`}>
          <line y1={0} y2={height} />
          <text y={12} dx={6}>{medianLabel}</text>
        </g>
      ) : null}

      <g className="dotdist__dots">
        {stacks.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={DOT_R} />
        ))}
      </g>

      {others.map((d) => (
        <circle
          key={d.iso}
          className="dotdist__dot dotdist__dot--pacific"
          cx={x(d.value)}
          cy={baseline - DOT_R}
          r={DOT_R + 0.6}
        >
          <title>{`${d.name}: ${tickFormat(d.value)}`}</title>
        </circle>
      ))}

      <g className="dotdist__subject" transform={`translate(${subjectX},0)`}>
        <line y1={0} y2={baseline} />
        <circle cy={baseline - DOT_R} r={DOT_R + 2.4} />
        <text
          y={-2}
          textAnchor={subjectX > width * 0.72 ? 'end' : 'start'}
          dx={subjectX > width * 0.72 ? -8 : 8}
        >
          {subjectLabel}
        </text>
      </g>
    </>
  )
}
