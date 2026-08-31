import { PlaceholderFigure } from '../components/chart/PlaceholderFigure'
import { acts } from '../content/acts'

const act = acts.find((a) => a.id === 'act-4')

/**
 * Pacific map + time series
 * TODO: d3-geo projection + geoPath generator, d3-shape line(); step switches the indicator
 * D3 for the math (scales/layout), JSX for every mark — see CLAUDE.md.
 */
export function Act4Consequences({ step, progress }) {
  return <PlaceholderFigure label="Pacific map + time series" dataset={act.dataset} step={step} progress={progress} />
}
