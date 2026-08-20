import { PlaceholderFigure } from '../components/chart/PlaceholderFigure'
import { acts } from '../content/acts'

const act = acts.find((a) => a.id === 'act-1')

/**
 * Planetary boundaries radial
 * TODO: d3-shape arc() for the wedges, d3-scale for radius; reveal wedges by step
 * D3 for the math (scales/layout), JSX for every mark — see CLAUDE.md.
 */
export function Act1Boundaries({ step, progress }) {
  return <PlaceholderFigure label="Planetary boundaries radial" dataset={act.dataset} step={step} progress={progress} />
}
