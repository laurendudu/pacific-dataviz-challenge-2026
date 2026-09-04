import { useMemo } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { STATUS_FILL, STATUS_STROKE } from '../../data/planetaryBoundaries'
import { TOTAL_DOTS } from '../../data/reduction'
import { DOT_GAP, layoutSwarm } from './swarmLayout'
import { useChartDimensions } from './useChartDimensions'

const PRIORITARIAN_MISSING_NOTE =
  'New Caledonia and French Polynesia have no comparable PPP GDP, so they have no ratio under the prioritarian rule.'

/**
 * The 2023 emissions swarm with the reduction taken out of it.
 *
 * The unit is the one the reader learned upstream: one dot is 0.1 Gt, so the
 * field is 433 dots. At that unit the Pacific's entire overshoot is roughly a
 * *tenth of a single dot* - under a pixel - which is the finding, but a
 * finding that is invisible reads as a broken toggle rather than as "almost
 * nothing".
 *
 * So the field never lies about the scale, and a magnified copy of the
 * lowest dot sits 200px below the swarm, joined by two tangent lines that
 * form a cone. The reader sees the true size in the field and can still
 * read the quantity in the callout. Packing is keyed on a rounded box so a
 * caption wrapping a different number of lines cannot re-settle the 433 dots.
 *
 * Whole dots are blacked out first and only the remainder becomes a wedge, so
 * this still draws correctly if it is ever pointed at a scope big enough to
 * remove dozens of dots.
 */

const NO_MARGIN = { top: 0, right: 0, bottom: 0, left: 0 }
const CALLOUT_R = 44
const BLACK = '#1b1626'
const CONE_PAD = 14
/** Vertical gap from the swarm box to the top of the magnified disc. */
const CALLOUT_BELOW = 200

/** Snap the measuring box so 1–3px caption jitter cannot re-run force layout. */
function quantize(n) {
  return Math.max(0, Math.round(n / 4) * 4)
}

/**
 * Dot radius *and* gap for a box, solved together.
 *
 * The shared slotRadius() floors the radius at 2.2px, which is right for the
 * big swarm panels upstream but overflows here: this panel can be short and
 * wide, and 433 dots at a floored radius pack into a disc taller than the
 * box, so the top and bottom rows fall outside the SVG and are clipped. The
 * fixed 2.5px gap makes it worse - below about 2.5px of radius the gap, not
 * the dot, is what sets the spacing.
 *
 * So the gap shrinks with the dot, and the floor drops to something that can
 * still be seen. `fitScale` below is the guarantee: force layout is
 * approximate, and nothing may leave the box.
 */
function packFor(n, width, height) {
  if (n <= 0 || width <= 0 || height <= 0) return { radius: 3, gap: DOT_GAP }
  const pack = (Math.min(width, height) * 0.47) / Math.sqrt(n)
  const gap = Math.max(0.8, Math.min(DOT_GAP, pack * 0.5))
  return { radius: Math.max(1.2, Math.min(6.5, pack - gap)), gap }
}

/** Uniform scale about the box centre that brings every dot inside it. */
function fitScale(nodes, radius, width, height) {
  let dx = 0
  let dy = 0
  const cx = width / 2
  const cy = height / 2
  for (const n of nodes) {
    dx = Math.max(dx, Math.abs(n.x - cx) + radius)
    dy = Math.max(dy, Math.abs(n.y - cy) + radius)
  }
  const sx = dx > 0 ? cx / dx : 1
  const sy = dy > 0 ? cy / dy : 1
  return Math.min(1, sx, sy)
}

/** External common tangents: the two lines of a cone between two circles. */
function externalTangents(x1, y1, r1, x2, y2, r2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const dist = Math.hypot(dx, dy)
  if (dist <= Math.abs(r2 - r1) + 1e-4) return null
  const vx = dx / dist
  const vy = dy / dist
  const c = (r1 - r2) / dist
  const h = Math.sqrt(Math.max(0, 1 - c * c))
  const lines = []
  for (const s of [-1, 1]) {
    const nx = vx * c - s * h * vy
    const ny = vy * c + s * h * vx
    lines.push({
      ax: x1 + r1 * nx,
      ay: y1 + r1 * ny,
      bx: x2 + r2 * nx,
      by: y2 + r2 * ny,
    })
  }
  return lines
}

/**
 * Quadratic leader from the wedge rim to a label, bowed away from the disc.
 * The wedge is stroked from 12 o'clock clockwise; the label sits to one side
 * of the magnified disc so it does not land on the cone.
 */
function wedgeNote(callout, partial, width) {
  const r = callout.r
  const sweep = Math.max(0.06, partial) * Math.PI
  const mid = -Math.PI / 2 + sweep
  const from = {
    x: callout.x + r * Math.cos(mid),
    y: callout.y + r * Math.sin(mid),
  }
  const right = callout.x + r + 72 < width - 8
  const to = {
    x: right
      ? Math.min(width - 12, callout.x + r + 56)
      : Math.max(12, callout.x - r - 56),
    y: callout.y - r * 0.2,
  }
  const mx = (from.x + to.x) / 2
  const my = (from.y + to.y) / 2
  const dx = to.x - from.x
  const dy = to.y - from.y
  const len = Math.hypot(dx, dy) || 1
  let px = -dy / len
  let py = dx / len
  if (px * (callout.x - mx) + py * (callout.y - my) > 0) {
    px = -px
    py = -py
  }
  const bulge = Math.min(34, len * 0.42)
  const cx = mx + px * bulge
  const cy = my + py * bulge
  return {
    d: `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`,
    to,
    right,
  }
}

function formatSharePct(pct) {
  if (pct >= 1) return pct.toFixed(1)
  if (pct >= 0.01) return pct.toFixed(3)
  return Number(pct).toPrecision(2)
}

export function ReductionSwarm({
  totalDots = TOTAL_DOTS,
  excessDots = 0,
  sharePct = 0,
  reduced = false,
  reduceMotion = false,
}) {
  const [ref, dms] = useChartDimensions(NO_MARGIN)
  const width = quantize(dms.width)
  const height = quantize(dms.height)

  const geom = useMemo(() => {
    if (!width || !height || !totalDots) return null

    const calloutR = Math.min(CALLOUT_R, Math.max(28, Math.min(width, height) * 0.16))
    const notePad = 28
    const room = height - CALLOUT_BELOW - calloutR * 2 - notePad
    const swarmW = width
    /* Pack into a squat box at the top so the disc sits on the swarm, not
       floating in leftover height. The magnified disc then has a true 200px
       of air under that cluster. */
    const swarmH = Math.max(48, Math.min(room, width * 1.2))
    const { radius: r0, gap } = packFor(totalDots, swarmW, swarmH)
    const raw = layoutSwarm({ count: totalDots, width: swarmW, height: swarmH, radius: r0, gap })
    const k = fitScale(raw, r0, swarmW, swarmH)
    const radius = r0 * k
    const nodes = k === 1
      ? raw
      : raw.map((n) => ({
          ...n,
          x: swarmW / 2 + (n.x - swarmW / 2) * k,
          y: swarmH / 2 + (n.y - swarmH / 2) * k,
        }))

    const midX = swarmW / 2
    let mark = nodes[0]
    for (const n of nodes) {
      if (
        n.y > mark.y + 0.4
        || (Math.abs(n.y - mark.y) <= 0.4 && Math.abs(n.x - midX) < Math.abs(mark.x - midX))
      ) {
        mark = n
      }
    }

    const callout = {
      x: Math.min(width - CONE_PAD - calloutR, Math.max(CONE_PAD + calloutR, mark.x)),
      y: swarmH + CALLOUT_BELOW + calloutR,
      r: calloutR,
    }
    const tangents = externalTangents(mark.x, mark.y, radius, callout.x, callout.y, callout.r)

    return { radius, nodes, mark, callout, tangents }
  }, [width, height, totalDots])

  const wholeDots = Math.floor(excessDots)
  const partial = excessDots - wholeDots
  const coneD = geom?.tangents
    ? `M ${geom.tangents[0].ax} ${geom.tangents[0].ay} L ${geom.tangents[0].bx} ${geom.tangents[0].by} L ${geom.tangents[1].bx} ${geom.tangents[1].by} L ${geom.tangents[1].ax} ${geom.tangents[1].ay} Z`
    : null
  const note = geom && partial > 0
    ? wedgeNote(geom.callout, partial, width)
    : null
  const showNote = Boolean(reduced && note && sharePct > 0)
  const noteEase = [0.4, 0, 0.2, 1]

  return (
    <div className="rswarm">
      <div className="rswarm__field" ref={ref}>
      {geom ? (
        <svg
          className="rswarm__svg"
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={
            reduced
              ? `${totalDots} dots of 0.1 gigatonnes each. The reduction removes ${format(excessDots)} of one dot, shown as the black wedge.`
              : `${totalDots} dots, one for each 0.1 gigatonnes emitted in 2023.`
          }
        >
          {geom.nodes.map((n) => (
            <circle
              key={n.i}
              cx={n.x}
              cy={n.y}
              r={geom.radius}
              fill={reduced && n.i < wholeDots ? BLACK : STATUS_FILL.high}
              stroke={reduced && n.i < wholeDots ? BLACK : STATUS_STROKE.high}
              strokeWidth="0.6"
            />
          ))}

          {coneD ? (
            <g className="rswarm__cone" aria-hidden="true">
              <path d={coneD} className="rswarm__cone-fill" />
              {geom.tangents.map((t, i) => (
                <g key={i}>
                  <line className="rswarm__cone-line rswarm__cone-line--halo" x1={t.ax} y1={t.ay} x2={t.bx} y2={t.by} />
                  <line className="rswarm__cone-line" x1={t.ax} y1={t.ay} x2={t.bx} y2={t.by} />
                </g>
              ))}
            </g>
          ) : null}

          <circle
            className="rswarm__mark"
            cx={geom.mark.x}
            cy={geom.mark.y}
            r={geom.radius + 3}
          />

          <g transform={`translate(${geom.callout.x}, ${geom.callout.y})`}>
            <circle
              r={geom.callout.r}
              fill={STATUS_FILL.high}
              stroke={STATUS_STROKE.high}
              strokeWidth="1.2"
            />
            {partial > 0 ? (
              <motion.circle
                className="rswarm__wedge"
                r={geom.callout.r / 2}
                fill="none"
                stroke={BLACK}
                strokeWidth={geom.callout.r}
                transform="rotate(-90)"
                initial={false}
                animate={{ pathLength: reduced ? partial : 0 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { duration: 0.7, ease: [0.4, 0, 0.2, 1] }
                }
              />
            ) : null}
          </g>

          <AnimatePresence>
            {showNote ? (
              <motion.g
                key="wedge-note"
                className="rswarm__note"
                aria-hidden="true"
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.3, delay: 0.2 }}
              >
                <motion.path
                  className="rswarm__note-line"
                  d={note.d}
                  fill="none"
                  initial={reduceMotion ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : { duration: 0.55, delay: 0.12, ease: noteEase }
                  }
                />
                <circle
                  className="rswarm__note-dot"
                  cx={note.to.x}
                  cy={note.to.y}
                  r={1.7}
                />
                <text
                  className="rswarm__note-text"
                  x={note.to.x + (note.right ? 6 : -6)}
                  y={note.to.y}
                  textAnchor={note.right ? 'start' : 'end'}
                >
                  <tspan x={note.to.x + (note.right ? 6 : -6)} dy="-0.35em">
                    {formatSharePct(sharePct)}%
                  </tspan>
                  <tspan
                    className="rswarm__note-sub"
                    x={note.to.x + (note.right ? 6 : -6)}
                    dy="1.25em"
                  >
                    of global emissions
                  </tspan>
                </text>
              </motion.g>
            ) : null}
          </AnimatePresence>
        </svg>
      ) : null}
      </div>

      <div className="rswarm__legend">
        <ul className="rswarm__legend-keys" aria-label="Swarm legend">
          <li>
            <span className="rswarm__swatch rswarm__swatch--field" aria-hidden="true" />
            2023 global emissions, 0.1 Gt per dot
          </li>
          <li>
            <span className="rswarm__swatch rswarm__swatch--cut" aria-hidden="true" />
            Reduced emissions when meeting allocated shares.
          </li>
        </ul>
        <p className="rswarm__legend-note">* {PRIORITARIAN_MISSING_NOTE}</p>
      </div>
    </div>
  )
}

const format = (v) => (v >= 1 ? v.toFixed(1) : v.toFixed(3))
