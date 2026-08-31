import { PlaceholderFigure } from '../components/chart/PlaceholderFigure'
import { acts } from '../content/acts'

const act = acts.find((a) => a.id === 'act-5')

/**
 * Tourist origins by ASR
 * TODO: d3-scale sqrt for volume, sequential ramp for ASR; step 2 recolours
 * D3 for the math (scales/layout), JSX for every mark. See CLAUDE.md.
 */
export function Act5VisitorParadox({ step, progress }) {
  return <PlaceholderFigure label="Tourist origins by ASR" dataset={act.dataset} step={step} progress={progress} />
}
