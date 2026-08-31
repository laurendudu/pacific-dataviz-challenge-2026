import { PlanetaryBoundaries, schemaEarthRadius } from '../components/chart/PlanetaryBoundaries'
import { ChartFrame } from '../components/chart/ChartFrame'

/**
 * Planetary boundaries radial: D3 for arcs and radius, JSX for every mark.
 */
export function Act1Boundaries({ progress = 1 }) {
  return (
    <ChartFrame
      title="Planetary boundaries"
      desc="Nine planetary boundaries. Seven are currently crossed."
    >
      {({ boundedWidth, boundedHeight }) => (
        <PlanetaryBoundaries
          progress={progress}
          cx={boundedWidth / 2}
          cy={boundedHeight / 2}
          fromR={schemaEarthRadius(boundedWidth, boundedHeight)}
          width={boundedWidth}
          height={boundedHeight}
        />
      )}
    </ChartFrame>
  )
}
