/**
 * Nine planetary boundaries, clockwise from 12 o'clock — Stockholm Resilience
 * Centre / PIK order.
 *
 * Source: Planetary Health Check 2025 (PBScience / Potsdam Institute for
 * Climate Impact Research), executive summary, September 2025. Thirteen
 * measured control variables across nine processes; seven processes are
 * transgressed, ocean acidification for the first time. Holocene baselines
 * for the two untransgressed processes come from Richardson et al. 2023,
 * "Earth beyond six of nine planetary boundaries", Science Advances.
 *   https://www.planetaryhealthcheck.org/
 *
 * Every wedge length is derived from the real control variable below by the
 * same piecewise normalisation the published figure uses:
 *
 *   Holocene baseline → 0
 *   planetary boundary → 1
 *   high-risk line     → 1.5
 *
 * so the two segments each get their own linear stretch and a wedge that
 * reaches the boundary ring is exactly at its boundary, whatever its unit.
 */
export const PLANETARY_BOUNDARY = 1
export const HIGH_RISK = 1.5

/**
 * `direction: 'up'` — the control variable rises as the pressure worsens.
 * `direction: 'down'` — it falls (forest cover, aragonite, ozone).
 */
const CONTROL_VARIABLES = {
  co2: {
    label: 'Atmospheric CO₂ concentration',
    unit: 'ppm',
    baseline: 280,      // Holocene
    boundary: 350,
    highRisk: 450,
    current: 423,
    direction: 'up',
  },
  forcing: {
    label: 'Total anthropogenic radiative forcing at top-of-atmosphere',
    unit: 'W/m²',
    baseline: 0,
    boundary: 1.0,
    highRisk: 1.5,
    current: 2.97,
    direction: 'up',
  },
  hanpp: {
    label: 'Human appropriation of net primary production',
    unit: '% of pre-industrial NPP',
    baseline: 0,
    boundary: 10,
    highRisk: 20,
    current: 30,
    direction: 'up',
  },
  extinction: {
    label: 'Extinction rate',
    unit: 'E/MSY',
    baseline: 1,
    boundary: 10,
    highRisk: 100,
    current: 100,       // report gives 100–1000; the low end is used here
    currentLabel: '100–1000',
    direction: 'up',
  },
  forest: {
    label: 'Remaining forest cover',
    unit: '% of original',
    baseline: 100,
    boundary: 75,
    highRisk: 54,
    current: 59,
    direction: 'down',
  },
  blueWater: {
    label: 'Land with human-induced disturbance in streamflow',
    unit: '%',
    baseline: 11.3,     // preindustrial-like state, ~half the present value
    boundary: 12.9,
    highRisk: 50,
    current: 22.6,
    direction: 'up',
  },
  greenWater: {
    label: 'Land with human-induced disturbance in soil moisture',
    unit: '%',
    baseline: 11.0,
    boundary: 12.4,
    highRisk: 50,
    current: 22.0,
    direction: 'up',
  },
  nitrogen: {
    label: 'Intentional N fixation for agriculture',
    unit: 'Tg N/yr',
    baseline: 0,
    boundary: 62,
    highRisk: 82,
    current: 165,
    direction: 'up',
  },
  phosphorus: {
    label: 'Application of mined P to cropland',
    unit: 'Tg P/yr',
    baseline: 0,
    boundary: 6.2,
    highRisk: 11.2,
    current: 18.2,
    direction: 'up',
  },
  aragonite: {
    label: 'Global mean surface aragonite saturation state',
    unit: 'Ω',
    baseline: 3.575,    // revised preindustrial Ω; the boundary is 80% of it
    boundary: 2.86,
    highRisk: 2.75,
    current: 2.84,
    direction: 'down',
  },
  aod: {
    label: 'Interhemispheric difference in aerosol optical depth',
    unit: 'ΔAOD',
    baseline: 0.03,
    boundary: 0.10,
    highRisk: 0.25,
    current: 0.063,
    direction: 'up',
  },
  ozone: {
    label: 'Global average stratospheric O₃ concentration',
    unit: 'DU',
    baseline: 290,
    boundary: 277,
    highRisk: 263,
    current: 285.7,
    direction: 'down',
  },
  novel: {
    label: 'Synthetic chemicals released without adequate safety testing',
    unit: '%',
    baseline: 0,
    boundary: 0,
    highRisk: null,     // no quantified high-risk line
    current: null,
    currentLabel: 'transgressed, not quantified',
    direction: 'up',
  },
}

/**
 * Control variable → wedge length. 0 is the Holocene baseline, 1 the
 * planetary boundary, 1.5 the high-risk line; past that the high-risk
 * segment keeps its slope, so nitrogen at 165 Tg/yr lands at 3.6.
 */
export function normalize(cv) {
  const sign = cv.direction === 'down' ? -1 : 1
  const past = (cv.current - cv.boundary) * sign
  if (past <= 0) {
    const span = (cv.boundary - cv.baseline) * sign
    return Math.max(0, ((cv.current - cv.baseline) * sign) / span)
  }
  return 1 + 0.5 * (past / ((cv.highRisk - cv.boundary) * sign))
}

/**
 * `zone` is the process-level assessment printed in PHC 2025 fig. ES 1. For a
 * process measured by two control variables the wedge shows `primary` — the
 * one that drives the process into its zone, so length and colour agree.
 * Climate change is therefore drawn on radiative forcing (+2.97 W/m² against
 * a +1.5 high-risk line); CO₂ at 423 ppm is the softer of the two and belongs
 * to the carbon-budget act rather than this figure.
 */
const PROCESSES = [
  { id: 'climate',    lines: ['Climate change'],                   cvs: ['co2', 'forcing'],           primary: 'forcing',        zone: 'high',       trend: 'increasing' },
  { id: 'novel',      lines: ['Novel entities'],                   cvs: ['novel'],                    primary: 'novel',      zone: 'high',       trend: 'increasing' },
  { id: 'ozone',      lines: ['Stratospheric', 'ozone depletion'], cvs: ['ozone'],                    primary: 'ozone',      zone: 'safe',       trend: 'stable' },
  { id: 'aerosol',    lines: ['Atmospheric', 'aerosol loading'],   cvs: ['aod'],                      primary: 'aod',        zone: 'safe',       trend: 'improving' },
  { id: 'ocean',      lines: ['Ocean acidification'],              cvs: ['aragonite'],                primary: 'aragonite',  zone: 'increasing', trend: 'increasing' },
  { id: 'biogeochem', lines: ['Biogeochemical', 'flows'],          cvs: ['nitrogen', 'phosphorus'],   primary: 'nitrogen',   zone: 'high',       trend: 'increasing' },
  { id: 'freshwater', lines: ['Freshwater change'],                cvs: ['blueWater', 'greenWater'],  primary: 'blueWater',  zone: 'increasing', trend: 'increasing' },
  { id: 'land',       lines: ['Land-system change'],               cvs: ['forest'],                   primary: 'forest',     zone: 'increasing', trend: 'increasing' },
  { id: 'biosphere',  lines: ['Biosphere integrity'],              cvs: ['hanpp', 'extinction'],      primary: 'hanpp',      zone: 'high',       trend: 'increasing' },
]

const NAMES = {
  climate: 'Climate change',
  novel: 'Introduction of novel entities',
  ozone: 'Stratospheric ozone depletion',
  aerosol: 'Increase in atmospheric aerosol loading',
  ocean: 'Ocean acidification',
  biogeochem: 'Modification of biogeochemical flows',
  freshwater: 'Freshwater change',
  land: 'Land-system change',
  biosphere: 'Change in biosphere integrity',
}

/** Novel entities is transgressed but unquantified — placed mid high-risk. */
const NOVEL_ENTITIES_VALUE = 1.8

export const BOUNDARIES = PROCESSES.map((p) => {
  const cvs = p.cvs.map((key) => ({ key, ...CONTROL_VARIABLES[key] }))
  const primary = CONTROL_VARIABLES[p.primary]
  return {
    ...p,
    name: NAMES[p.id],
    cvs,
    primaryCv: { key: p.primary, ...primary },
    unquantified: primary.current === null,
    value: primary.current === null ? NOVEL_ENTITIES_VALUE : normalize(primary),
  }
})

/** Outer end of the radial scale — the longest wedge, nitrogen at ~3.6. */
export const SCALE_MAX = Math.max(...BOUNDARIES.map((b) => b.value))

export function statusOf(boundary) {
  return boundary.zone
}

export const STATUS_FILL = {
  safe: '#4dce82',
  increasing: '#f6c22e',
  high: '#f06a61',
}

export const STATUS_STROKE = {
  safe: '#2ea863',
  increasing: '#d9a40b',
  high: '#d94c44',
}

export const CROSSED = BOUNDARIES.filter((b) => b.zone !== 'safe').length
