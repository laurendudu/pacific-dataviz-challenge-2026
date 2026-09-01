import { useMemo } from 'react'
import { scaleLinear } from 'd3-scale'
import { ChartFrame } from './ChartFrame'
import { AxisBottom } from './Axis'

/**
 * One axis that cannot hold its own data.
 *
 * The scene opens on a range that fits most of the Pacific — under 4 tonnes per
 * person — and scroll widens it twice, because two islands need it wider and
 * one of them needs it twenty times wider. The rescaling *is* the finding: at
 * the range where the Pacific is legible, Palau is not on the page, and at the
 * range where Palau fits, the Pacific is a single smudge against the origin.
 *
 * D3 supplies the scale; the domain is interpolated in log space (a linear
 * sweep would make the dots bolt at the start and crawl at the end); React
 * renders every dot, label and tick.
 */

const MARGIN = { top: 44, right: 30, bottom: 46, left: 26 }
const R = 6.5
const ROW = 0.58 // baseline as a fraction of the plot height

/** Scroll position → how wide the axis has to be. */
export const STAGES = [
  { at: 0.12, max: 4, caption: 'Most of the Pacific lives here.' },
  { at: 0.46, max: 20, caption: 'New Caledonia needs the axis five times wider.' },
  { at: 0.80, max: 92, caption: 'Palau needs it five times wider again.' },
]

export function stageAt(progress) {
  let i = 0
  while (i < STAGES.length - 1 && progress >= STAGES[i + 1].at) i += 1
  return i
}

export function domainMax(progress) {
  const first = STAGES[0]
  const last = STAGES[STAGES.length - 1]
  if (progress <= first.at) return first.max
  if (progress >= last.at) return last.max

  const i = stageAt(progress)
  const a = STAGES[i]
  const b = STAGES[i + 1]
  const t = smooth((progress - a.at) / (b.at - a.at))
  return Math.exp(Math.log(a.max) * (1 - t) + Math.log(b.max) * t)
}

/* Ease in and out, so each stage settles instead of arriving at full speed. */
const smooth = (t) => t * t * (3 - 2 * t)

export function AxisBreak({ values, progress, unit, title, desc }) {
  return (
    <ChartFrame margin={MARGIN} title={title} desc={desc}>
      {(dms) => (
        <Break
          width={dms.boundedWidth}
          height={dms.boundedHeight}
          values={values}
          progress={progress}
          unit={unit}
        />
      )}
    </ChartFrame>
  )
}

function Break({ width, height, values, progress, unit }) {
  const max = domainMax(progress)

  const { x, onscreen, offscreen, baseline } = useMemo(() => {
    const x = scaleLinear().domain([0, max]).range([0, width])
    const baseline = height * ROW

    const sorted = [...values].sort((a, b) => a.value - b.value)
    const onscreen = []
    const offscreen = []

    /* Islands that share a value (four of them sit at 0.1) would draw as one
       dot. Stack them upward instead — deterministic, unlike a force layout. */
    let lastX = -Infinity
    let stack = 0
    for (const d of sorted) {
      if (d.value > max) {
        offscreen.push(d)
        continue
      }
      const cx = x(d.value)
      stack = cx - lastX < R * 2 ? stack + 1 : 0
      lastX = cx
      onscreen.push({ ...d, cx, cy: baseline - stack * (R * 2 + 1.5) })
    }

    /* Label only what there is room for — plus the subject, always. */
    let lastLabel = -Infinity
    for (const d of onscreen) {
      const room = d.cx - lastLabel > 62
      d.labelled = d.is_subject || room
      if (d.labelled) lastLabel = d.cx
    }

    return { x, onscreen, offscreen, baseline }
  }, [values, max, width, height])

  return (
    <>
      <AxisBottom
        scale={x}
        y={height}
        tickCount={5}
        tickFormat={(v) => (max <= 4 ? v.toFixed(1) : String(Math.round(v)))}
        label={unit}
      />

      <g className="axbreak__dots">
        {onscreen.map((d) => (
          <g
            key={d.pict}
            className={`axbreak__dot${d.is_subject ? ' axbreak__dot--subject' : ''}`}
            transform={`translate(${d.cx},${d.cy})`}
          >
            <circle r={R} />
            <title>{`${d.name}: ${d.value} ${unit}`}</title>
            {d.labelled ? (
              <text
                className="axbreak__name"
                y={-R - 7}
                transform="rotate(-38)"
                textAnchor="start"
              >
                {d.name}
              </text>
            ) : null}
          </g>
        ))}
      </g>

      {/* Anything past the right edge is named there rather than dropped, so
          the reader knows what the axis is failing to hold. */}
      {offscreen.map((d, i) => (
        <g
          key={d.pict}
          className={`axbreak__off${d.is_subject ? ' axbreak__off--subject' : ''}`}
          transform={`translate(${width - 2},${baseline - 26 - i * 26})`}
        >
          <path d="M0,-7 L11,0 L0,7 Z" />
          <text className="axbreak__off-label" x={-10} dy="0.32em" textAnchor="end">
            {`${d.name} ${d.value}`}
          </text>
        </g>
      ))}
    </>
  )
}
