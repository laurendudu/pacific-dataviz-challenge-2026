/**
 * Nine planetary boundaries, clockwise from 12 o'clock — the Stockholm
 * Resilience Centre / PIK order. Values are dummy for now (control variable
 * ÷ boundary, so 1 is the planetary boundary itself). Seven of nine sit
 * past 1; of those, four are past the high-risk line.
 */
export const PLANETARY_BOUNDARY = 1
export const HIGH_RISK = 1.5

export const BOUNDARIES = [
  { id: 'climate',     name: 'Climate change',                  lines: ['Climate change'],                    value: 1.82 },
  { id: 'novel',       name: 'Novel entities',                  lines: ['Novel entities'],                    value: 2.05 },
  { id: 'ozone',       name: 'Stratospheric ozone depletion',   lines: ['Stratospheric', 'ozone depletion'],  value: 0.42 },
  { id: 'aerosol',     name: 'Atmospheric aerosol loading',     lines: ['Atmospheric', 'aerosol loading'],    value: 0.55 },
  { id: 'ocean',       name: 'Ocean acidification',             lines: ['Ocean acidification'],               value: 1.16 },
  { id: 'biogeochem',  name: 'Biogeochemical flows',            lines: ['Biogeochemical', 'flows'],           value: 1.94 },
  { id: 'freshwater',  name: 'Freshwater change',               lines: ['Freshwater change'],                 value: 1.34 },
  { id: 'land',        name: 'Land-system change',              lines: ['Land-system change'],                value: 1.26 },
  { id: 'biosphere',   name: 'Biosphere integrity',             lines: ['Biosphere integrity'],               value: 1.76 },
]

export function statusOf(value) {
  if (value < PLANETARY_BOUNDARY) return 'safe'
  if (value < HIGH_RISK) return 'increasing'
  return 'high'
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

export const CROSSED = BOUNDARIES.filter((b) => b.value >= PLANETARY_BOUNDARY).length
