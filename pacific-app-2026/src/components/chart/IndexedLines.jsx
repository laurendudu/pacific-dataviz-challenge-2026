import { useMemo } from 'react'
import { scaleLinear } from 'd3-scale'
import { line } from 'd3-shape'
import { ChartFrame } from './ChartFrame'
import { AxisBottom, AxisLeft } from './Axis'

/**
 * Three quantities of different units on one axis, each indexed to a base year
 * = 100. This is the alternative to a dual-axis chart, which the project bans:
 * two y-scales let you make any two lines cross wherever you like.
 *
 * d3-shape builds the path string, d3-scale positions it. React renders.
 */

const MARGIN = { top: 22, right: 92, bottom: 40, left: 44 }

export function IndexedLines({ series, years, baseYear, title, desc }) {
  return (
    <ChartFrame margin={MARGIN} title={title} desc={desc}>
      {(dms) => (
        <Lines
          width={dms.boundedWidth}
          height={dms.boundedHeight}
          series={series}
          years={years}
          baseYear={baseYear}
        />
      )}
    </ChartFrame>
  )
}

function Lines({ width, height, series, years, baseYear }) {
  const { x, y, paths } = useMemo(() => {
    const x = scaleLinear().domain([years[0], years[years.length - 1]]).range([0, width])
    const top = Math.max(120, ...series.flatMap((s) => s.points.map((p) => p.value)))
    const y = scaleLinear().domain([0, top]).range([height, 0]).nice()

    const path = line()
      .x((p) => x(p.year))
      .y((p) => y(p.value))

    return {
      x,
      y,
      paths: series.map((s) => ({
        ...s,
        d: path(s.points),
        last: s.points[s.points.length - 1],
      })),
    }
  }, [series, years, width, height])

  return (
    <>
      <AxisLeft scale={y} width={width} tickCount={4} tickFormat={(v) => `${v}`} />
      <AxisBottom
        scale={x}
        y={height}
        ticks={years}
        tickFormat={(v) => `’${String(v).slice(2)}`}
      />

      {/* The base year reads as 100 by construction — mark it, don't explain it. */}
      <g className="indexed__base">
        <line x1={0} x2={width} y1={y(100)} y2={y(100)} />
        <text x={0} y={y(100)} dy={-6}>{`${baseYear} = 100`}</text>
      </g>

      {paths.map((s) => (
        <g key={s.id} className={`indexed__series indexed__series--${s.id}`}>
          <path d={s.d} fill="none" />
          {s.points.map((p) => (
            <circle key={p.year} cx={x(p.year)} cy={y(p.value)} r={3.4}>
              <title>{`${s.label}, ${p.year}: ${Math.round(p.value)}`}</title>
            </circle>
          ))}
          <text x={x(s.last.year) + 10} y={y(s.last.value)} dy="0.32em">
            {s.label}
          </text>
        </g>
      ))}
    </>
  )
}
