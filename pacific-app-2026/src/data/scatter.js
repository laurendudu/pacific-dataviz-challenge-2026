import { PACIFIC_TERRITORIES, PRINCIPLES } from './allocation'

/**
 * Placeholder country panel for the Pacific-vs-world scatters.
 * Swap `SCATTER_COUNTRIES` for the real join when it lands — keep this
 * shape: iso, name, pacific, gdp, asr { gf, eg, pr }.
 * `pr` is null when a territory has no PPP GDP (same gap as the map).
 */
export const SCATTER_IS_DUMMY = true

export const SCATTER_PLOTS = PRINCIPLES.map((p) => ({
  id: p.id,
  title: p.title,
  rule: p.rule,
}))

/** iso → [name, gdp per capita, egalitarian ASR]. */
const WORLD_SEED = [
  ['USA', 'United States', 76300, 15.2],
  ['CHN', 'China', 12700, 11.5],
  ['IND', 'India', 2500, 2.4],
  ['JPN', 'Japan', 33800, 9.8],
  ['DEU', 'Germany', 52700, 10.1],
  ['GBR', 'United Kingdom', 48900, 7.6],
  ['FRA', 'France', 44400, 6.9],
  ['ITA', 'Italy', 38300, 6.4],
  ['CAN', 'Canada', 54900, 16.4],
  ['AUS', 'Australia', 65100, 18.1],
  ['KOR', 'South Korea', 35500, 13.2],
  ['BRA', 'Brazil', 10300, 3.8],
  ['RUS', 'Russia', 13800, 13.6],
  ['MEX', 'Mexico', 11400, 4.6],
  ['IDN', 'Indonesia', 4900, 2.9],
  ['TUR', 'Turkey', 13100, 6.1],
  ['SAU', 'Saudi Arabia', 28800, 19.4],
  ['ESP', 'Spain', 32600, 6.2],
  ['NLD', 'Netherlands', 62700, 9.4],
  ['CHE', 'Switzerland', 92100, 6.8],
  ['POL', 'Poland', 22100, 8.7],
  ['ARG', 'Argentina', 13700, 5.1],
  ['ZAF', 'South Africa', 6700, 7.9],
  ['THA', 'Thailand', 7700, 4.4],
  ['NGA', 'Nigeria', 2100, 0.72],
  ['EGY', 'Egypt', 3700, 2.1],
  ['PAK', 'Pakistan', 1600, 0.91],
  ['BGD', 'Bangladesh', 2700, 0.84],
  ['VNM', 'Vietnam', 4300, 3.2],
  ['PHL', 'Philippines', 3900, 1.6],
  ['ETH', 'Ethiopia', 1300, 0.21],
  ['KEN', 'Kenya', 2100, 0.48],
  ['TZA', 'Tanzania', 1200, 0.26],
  ['UGA', 'Uganda', 1000, 0.19],
  ['QAT', 'Qatar', 87400, 28.4],
  ['ARE', 'United Arab Emirates', 53700, 22.1],
  ['SGP', 'Singapore', 84800, 10.8],
  ['NOR', 'Norway', 87900, 9.2],
  ['DNK', 'Denmark', 68000, 7.1],
  ['SWE', 'Sweden', 56400, 5.4],
  ['NZL', 'New Zealand', 48200, 8.9],
  ['CHL', 'Chile', 17100, 5.6],
  ['COL', 'Colombia', 7000, 2.2],
  ['PER', 'Peru', 7800, 2.0],
  ['MYS', 'Malaysia', 12700, 8.3],
  ['KAZ', 'Kazakhstan', 13100, 14.8],
  ['UKR', 'Ukraine', 5300, 4.7],
  ['IRQ', 'Iraq', 5900, 5.9],
  ['IRN', 'Iran', 4700, 8.1],
  ['ISR', 'Israel', 54700, 8.6],
  ['IRL', 'Ireland', 104000, 9.7],
  ['BEL', 'Belgium', 53600, 8.8],
  ['AUT', 'Austria', 56400, 8.4],
  ['FIN', 'Finland', 53700, 8.0],
  ['KWT', 'Kuwait', 37500, 24.6],
  ['BHR', 'Bahrain', 30100, 21.3],
  ['LUX', 'Luxembourg', 128000, 14.1],
  ['ISL', 'Iceland', 78800, 11.2],
  ['GHA', 'Ghana', 2300, 0.61],
  ['SEN', 'Senegal', 1600, 0.38],
  ['MOZ', 'Mozambique', 650, 0.17],
  ['COD', 'DR Congo', 650, 0.14],
  ['NPL', 'Nepal', 1400, 0.33],
  ['KHM', 'Cambodia', 1900, 0.92],
  ['BOL', 'Bolivia', 3700, 1.8],
  ['URY', 'Uruguay', 20800, 4.1],
  ['CRI', 'Costa Rica', 16500, 2.7],
  ['JAM', 'Jamaica', 6200, 3.1],
]

/** iso → [gdp per capita, egalitarian ASR]. Names come from PACIFIC_TERRITORIES. */
const PACIFIC_SEED = {
  FJI: [6200, 3.42],
  FSM: [3600, 0.45],
  KIR: [2100, 0.94],
  MHL: [6700, 0.12],
  NCL: [34800, 4.50],
  NRU: [12100, 5.80],
  PLW: [14200, 4.20],
  PNG: [3000, 0.35],
  PYF: [20100, 3.80],
  SLB: [2200, 0.28],
  TON: [5000, 1.10],
  TUV: [5400, 0.22],
  VUT: [3200, 0.31],
  WSM: [4300, 0.85],
}

const PR_MISSING = new Set(['NCL', 'PYF'])

/** Stable 0–1 from an ISO code — dummy jitter only. */
function unit(iso) {
  let h = 2166136261
  for (let i = 0; i < iso.length; i += 1) {
    h ^= iso.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967296
}

function row(iso, name, gdp, asrEg, pacific) {
  const asrGf = 6.36 + (unit(iso) - 0.5) * 0.38
  const asrPr = PR_MISSING.has(iso)
    ? null
    : Math.max(0.04, asrEg * Math.sqrt(gdp / 12000))
  return {
    iso,
    name,
    pacific,
    gdp,
    asr: { gf: asrGf, eg: asrEg, pr: asrPr },
  }
}

export const SCATTER_COUNTRIES = [
  ...PACIFIC_TERRITORIES.map((place) => {
    const seed = PACIFIC_SEED[place.iso] ?? [4000, 0.6]
    return row(place.iso, place.name, seed[0], seed[1], true)
  }),
  ...WORLD_SEED.map(([iso, name, gdp, asrEg]) => row(iso, name, gdp, asrEg, false)),
]

export function asrOf(country, methodId) {
  const value = country?.asr?.[methodId]
  return Number.isFinite(value) ? value : null
}
