/**
 * Three L1 rules that turn a world carrying capacity into a country share.
 * ASR tables: egalitarian `asr.json`, grandfathering `asr_gf.json`,
 * prioritarian `asr_gdp.json` — all min_cc from notebook 03.
 */

export const PACIFIC_BUDGET_ASK =
  'How much should we allocate to the Pacific from this budget?'

/** SPC islands pyaesa can allocate to (World Bank population). ISO3-sorted. */
export const PACIFIC_TERRITORIES = [
  { iso: 'FJI', name: 'Fiji' },
  { iso: 'FSM', name: 'Micronesia' },
  { iso: 'KIR', name: 'Kiribati' },
  { iso: 'MHL', name: 'Marshall Islands' },
  { iso: 'NCL', name: 'New Caledonia' },
  { iso: 'NRU', name: 'Nauru' },
  { iso: 'PLW', name: 'Palau' },
  { iso: 'PNG', name: 'Papua New Guinea' },
  { iso: 'PYF', name: 'French Polynesia' },
  { iso: 'SLB', name: 'Solomon Islands' },
  { iso: 'TON', name: 'Tonga' },
  { iso: 'TUV', name: 'Tuvalu' },
  { iso: 'VUT', name: 'Vanuatu' },
  { iso: 'WSM', name: 'Samoa' },
]

/**
 * Beats inside `#allocation`:
 * 0 grandfathering · 1 egalitarian · 2 prioritarian · 3 hold (toggles live).
 */
export const ALLOCATION_BEATS = {
  gf: 0,
  eg: 1,
  pr: 2,
  hold: 3,
}

export const PRINCIPLES = [
  {
    id: 'gf',
    title: 'Grandfathering',
    rule: 'Keep the share you already had',
    equation: {
      numerator: 'emissions in 2023',
      denominator: '(emissions in 2023 ÷ world emissions) × world budget',
    },
    table: 'gf',
    missing: null,
    definition:
      'Your slice is the fraction of world emissions you already produce. Every country lands on the same ratio — and the same ratio hides wildly different entitlements.',
  },
  {
    id: 'eg',
    title: 'Egalitarian',
    rule: 'Everyone gets the same',
    equation: {
      numerator: 'emissions in 2023',
      denominator: '(population ÷ world population) × world budget',
    },
    table: 'eg',
    missing: null,
    definition:
      'Your slice is your population over the world’s, so every person on earth holds an identical claim — 0.85 tonnes a year.',
  },
  {
    id: 'pr',
    title: 'Prioritarian',
    rule: 'Poorer countries get more',
    equation: {
      numerator: 'emissions in 2023',
      denominator: '(population ÷ GDP per capita, normalised) × world budget',
    },
    table: 'pr',
    missing: 'New Caledonia and French Polynesia have no comparable PPP GDP, so they have no ratio under this rule.',
    definition:
      'Population weighted down by GDP per capita, so the poorer the country the larger its claim on the same world budget.',
  },
]
