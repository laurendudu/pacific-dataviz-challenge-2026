import { PlaceholderFigure } from '../components/chart/PlaceholderFigure'
import { acts } from '../content/acts'

const act = acts.find((a) => a.id === 'act-6')

/**
 * Boundaries recalculated
 * TODO: reuse Act 1 radial geometry with the Pacific-consumption scenario values
 * D3 for the math (scales/layout), JSX for every mark — see CLAUDE.md.
 */
export function Act6Mirror({ step, progress }) {
  return <PlaceholderFigure label="Boundaries recalculated" dataset={act.dataset} step={step} progress={progress} />
}
