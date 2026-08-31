import { useMemo } from 'react'
import { feature } from 'topojson-client'
import world110 from 'world-atlas/countries-110m.json'
import pacificIslands from './pacificIslands.json'
import { useData } from './useData'

/**
 * Equal-per-capita Absolute Sustainability Ratio at the static min_cc bound
 * (350 ppm planetary boundary). `asr.json` is `{iso3: {year: asr}}`, written
 * by 03_asr.ipynb from pyaesa.deterministic_asr().
 *
 * ASR = territorial GHG / allocated carrying capacity.
 * 1 is a fair share; below 1 is inside the allocation; above 1 is overshoot.
 */
export const YEAR = 2023

/* Site base, so the fetches survive the GitHub Pages project subpath.
   '/' in dev, '/pacific-dataviz-challenge-2026/' in a production build. */
const BASE = import.meta.env.BASE_URL

export const ASR_URL = `${BASE}data/asr.json`
export const ASR_TABLES = {
  eg: `${BASE}data/asr.json`,
  gf: `${BASE}data/asr_gf.json`,
  pr: `${BASE}data/asr_gdp.json`,
}

/**
 * ISO 3166-1 alpha-3 → numeric, zero-padded. Numeric ids are what
 * world-atlas and pacificIslands.json put on each feature, so this is the
 * join from the ASR table onto the map. Built from contributions.json (the
 * same 198-country panel as the ASR).
 */
export const ISO3_TO_N3 = {
  ABW: '533', AFG: '004', AGO: '024', ALB: '008', AND: '020', ARE: '784', ARG: '032', ARM: '051',
  ATG: '028', AUS: '036', AUT: '040', AZE: '031', BDI: '108', BEL: '056', BEN: '204', BFA: '854',
  BGD: '050', BGR: '100', BHR: '048', BHS: '044', BIH: '070', BLR: '112', BLZ: '084', BOL: '068',
  BRA: '076', BRB: '052', BRN: '096', BTN: '064', BWA: '072', CAF: '140', CAN: '124', CHE: '756',
  CHL: '152', CHN: '156', CIV: '384', CMR: '120', COD: '180', COG: '178', COL: '170', COM: '174',
  CPV: '132', CRI: '188', CUB: '192', CYP: '196', CZE: '203', DEU: '276', DJI: '262', DMA: '212',
  DNK: '208', DOM: '214', DZA: '012', ECU: '218', EGY: '818', ERI: '232', ESP: '724', EST: '233',
  ETH: '231', FIN: '246', FJI: '242', FRA: '250', FSM: '583', GAB: '266', GBR: '826', GEO: '268',
  GHA: '288', GIN: '324', GMB: '270', GNB: '624', GNQ: '226', GRC: '300', GRD: '308', GTM: '320',
  GUY: '328', HKG: '344', HND: '340', HRV: '191', HTI: '332', HUN: '348', IDN: '360', IND: '356',
  IRL: '372', IRN: '364', IRQ: '368', ISL: '352', ISR: '376', ITA: '380', JAM: '388', JOR: '400',
  JPN: '392', KAZ: '398', KEN: '404', KGZ: '417', KHM: '116', KIR: '296', KNA: '659', KOR: '410',
  KWT: '414', LAO: '418', LBN: '422', LBR: '430', LBY: '434', LCA: '662', LIE: '438', LKA: '144',
  LSO: '426', LTU: '440', LUX: '442', LVA: '428', MAC: '446', MAR: '504', MDA: '498', MDG: '450',
  MDV: '462', MEX: '484', MHL: '584', MKD: '807', MLI: '466', MLT: '470', MMR: '104', MNE: '499',
  MNG: '496', MOZ: '508', MRT: '478', MUS: '480', MWI: '454', MYS: '458', NAM: '516', NCL: '540',
  NER: '562', NGA: '566', NIC: '558', NLD: '528', NOR: '578', NPL: '524', NRU: '520', NZL: '554',
  OMN: '512', PAK: '586', PAN: '591', PER: '604', PHL: '608', PLW: '585', PNG: '598', POL: '616',
  PRK: '408', PRT: '620', PRY: '600', PYF: '258', QAT: '634', ROU: '642', RUS: '643', RWA: '646',
  SAU: '682', SDN: '729', SEN: '686', SGP: '702', SLB: '090', SLE: '694', SLV: '222', SOM: '706',
  SRB: '688', SSD: '728', STP: '678', SUR: '740', SVK: '703', SVN: '705', SWE: '752', SYC: '690',
  SYR: '760', TCA: '796', TCD: '148', TGO: '768', THA: '764', TJK: '762', TKM: '795', TLS: '626',
  TON: '776', TTO: '780', TUN: '788', TUR: '792', TUV: '798', TWN: '158', TZA: '834', UGA: '800',
  UKR: '804', URY: '858', USA: '840', UZB: '860', VCT: '670', VEN: '862', VGB: '092', VNM: '704',
  VUT: '548', WSM: '882', YEM: '887', ZAF: '710', ZMB: '894', ZWE: '716',
}

/* Natural Earth short names ↔ the labels we show in copy. */
const NAME_ALIAS = {
  'united states': 'united states of america',
  usa: 'united states of america',
  'marshall islands': 'marshall is.',
  'solomon islands': 'solomon is.',
  'french polynesia': 'fr. polynesia',
  micronesia: 'micronesia',
  'federated states of micronesia': 'micronesia',
}

const worldFeatures = feature(world110, world110.objects.countries).features

/* 10m Pacific coastlines replace the 110m stubs so atolls still have a shape. */
const byN3 = new Map()
const byName = new Map()

function indexFeature(feat) {
  const n3 = String(feat.id ?? '').padStart(3, '0')
  if (n3 !== '00NaN' && n3 !== '000') byN3.set(n3, feat)
  const name = feat.properties?.name
  if (name) byName.set(name.toLowerCase(), feat)
}

for (const feat of worldFeatures) indexFeature(feat)
for (const feat of pacificIslands.features) indexFeature(feat)

/**
 * Resolve a country outline from iso3 (`FJI`), ISO numeric (`242` / `242`),
 * a Natural Earth name, or a GeoJSON feature (passed through).
 */
export function findCountryFeature(query) {
  if (!query) return null
  if (typeof query === 'object') return query.geometry ? query : query.feature ?? null

  const key = String(query).trim()
  if (/^\d{1,3}$/.test(key)) return byN3.get(key.padStart(3, '0')) ?? null

  const upper = key.toUpperCase()
  if (/^[A-Z]{3}$/.test(upper) && ISO3_TO_N3[upper]) {
    return byN3.get(ISO3_TO_N3[upper]) ?? null
  }

  const lower = key.toLowerCase()
  return byName.get(lower) ?? byName.get(NAME_ALIAS[lower] ?? '') ?? null
}

/** Loads one ASR JSON table and indexes one year as iso3 → number. */
export function useAsr(year = YEAR, url = ASR_URL) {
  const { data, error, loading } = useData(url)

  const values = useMemo(() => {
    if (!data) return null
    const map = new Map()
    for (const [iso, years] of Object.entries(data)) {
      const value = years[String(year)] ?? years[year]
      if (value != null) map.set(iso, Number(value))
    }
    return map
  }, [data, year])

  return { table: data, values, year, error, loading }
}

/** Egalitarian, grandfathering, and prioritarian tables for one year. */
export function useAsrTables(year = YEAR) {
  const eg = useAsr(year, ASR_TABLES.eg)
  const gf = useAsr(year, ASR_TABLES.gf)
  const pr = useAsr(year, ASR_TABLES.pr)
  return {
    year,
    eg: eg.values,
    gf: gf.values,
    pr: pr.values,
    loading: eg.loading || gf.loading || pr.loading,
    error: eg.error || gf.error || pr.error,
  }
}
