import { PlaceholderFigure } from '../components/chart/PlaceholderFigure'
import { acts } from '../content/acts'

const act = acts.find((a) => a.id === 'act-3')

/**
 * ASR ranked bar
 * TODO: d3-scale band+linear, sorted descending; step drives highlight (emitters vs Pacific)
 * D3 for the math (scales/layout), JSX for every mark — see CLAUDE.md.
 */
export function Act3AsrRanking({ step, progress }) {
  return <PlaceholderFigure label="ASR ranked bar" dataset={act.dataset} step={step} progress={progress} />
}
