/**
 * Three L1 rules that turn a world carrying capacity into a country share.
 * ASR tables: egalitarian `asr.json`, grandfathering `asr_gf.json`,
 * prioritarian `asr_gdp.json`, all min_cc from notebook 03.
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
 * 0 empty map (wells, no ratios) · 1 grandfathering · 2 egalitarian ·
 * 3 prioritarian · 4 hold (toggles live).
 */
export const ALLOCATION_BEATS = {
  empty: 0,
  gf: 1,
  eg: 2,
  pr: 3,
  hold: 4,
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
      'The allocated share is determined by the country’s current emissions. The more you currently emit, the more you get.',
  },
  {
    id: 'eg',
    title: 'Egalitarian',
    label: 'Egalitarian (equal per capita)',
    rule: 'Everyone gets the same',
    equation: {
      numerator: 'emissions in 2023',
      denominator: '(population ÷ world population) × world budget',
    },
    table: 'eg',
    missing: null,
    definition:
      'The budget is allocated per person, so every country gets the same amount for each of its citizens.',
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
      'Population weighted down by GDP per capita, so the poorer the country the larger its allocated share is.',
  },
]
