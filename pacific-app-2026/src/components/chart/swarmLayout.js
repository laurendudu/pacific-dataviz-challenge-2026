import { forceSimulation, forceX, forceY, forceCollide } from 'd3-force'

/** Pixels between dot edges. Shared so every swarm reads as the same texture. */
export const DOT_GAP = 2.5

/**
 * Positions for `count` unit dots packed into a box.
 *
 * A phyllotaxis seed puts the dots in a rough disc, then d3-force settles the
 * overlaps. d3 only produces x/y here. The caller draws every circle in JSX.
 */
export function layoutSwarm({ count, width, height, radius, gap = DOT_GAP }) {
  if (count <= 0 || width <= 0 || height <= 0 || radius <= 0) return []

  const cx = width / 2
  const cy = height / 2
  const golden = Math.PI * (3 - Math.sqrt(5))
  const collideR = radius + gap
  const spacing = collideR * 2
  const nodes = new Array(count)
  for (let i = 0; i < count; i++) {
    const dist = spacing * Math.sqrt(i + 0.5)
    const angle = i * golden
    nodes[i] = {
      i,
      x: cx + dist * Math.cos(angle),
      y: cy + dist * Math.sin(angle),
    }
  }

  const sim = forceSimulation(nodes)
    .force('x', forceX(cx).strength(0.06))
    .force('y', forceY(cy).strength(0.06))
    .force('collide', forceCollide(collideR).strength(1).iterations(6))
    .stop()

  const ticks = Math.min(220, 60 + Math.ceil(count / 4))
  for (let t = 0; t < ticks; t++) sim.tick()
  return nodes
}
