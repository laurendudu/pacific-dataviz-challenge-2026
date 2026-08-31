import { PlaceholderFigure } from '../components/chart/PlaceholderFigure'
import { acts } from '../content/acts'

const act = acts.find((a) => a.id === 'act-2')

/**
 * Carbon budget depletion
 * TODO: d3-scale time+linear, d3-shape area()/stack() by sector; step drives the year cursor
 * D3 for the math (scales/layout), JSX for every mark. See CLAUDE.md.
 */
export function Act2CarbonBudget({ step, progress }) {
  return <PlaceholderFigure label="Carbon budget depletion" dataset={act.dataset} step={step} progress={progress} />
}
