/**
 * DUMMY per-capita CO2 (tonnes/person/year), keyed by world-atlas country name.
 * Placeholder only — replace with the real SPC / pyaesa output.
 * Values are roughly plausible so the choropleth reads correctly while building;
 * every country not listed gets a deterministic pseudo-value.
 */
const KNOWN = {
  Qatar: 37, Kuwait: 25, 'United Arab Emirates': 21, 'Saudi Arabia': 18,
  Australia: 15, 'United States of America': 14.9, Canada: 14.3, Kazakhstan: 13.5,
  Russia: 11.4, 'South Korea': 11.6, Turkmenistan: 11, Oman: 10.5,
  Japan: 8.5, Germany: 8.1, Poland: 8, Netherlands: 7.7, Norway: 7.5,
  China: 8, 'Czech Republic': 9, Czechia: 9, Ireland: 7.2, Belgium: 7.6,
  Austria: 6.9, Finland: 6.8, Malaysia: 8.2, Iran: 7.7, 'South Africa': 7.3,
  'United Kingdom': 4.6, France: 4.3, Italy: 5.2, Spain: 5, Greece: 5.4,
  Sweden: 3.5, Switzerland: 4, Denmark: 4.8, 'New Zealand': 6.3, Israel: 6.4,
  Chile: 4.5, Argentina: 4, Mexico: 3.5, Thailand: 3.7, Turkey: 5.3,
  Brazil: 2.2, Indonesia: 2.6, India: 2, Vietnam: 3.5, Egypt: 2.3,
  Philippines: 1.3, Pakistan: 1, Bangladesh: 0.6, Nigeria: 0.6, Kenya: 0.4,
  Ethiopia: 0.15, 'Dem. Rep. Congo': 0.04, Chad: 0.1, Niger: 0.1, Mali: 0.1,
  Madagascar: 0.15, Mozambique: 0.2, Tanzania: 0.2, Uganda: 0.13,
  // Pacific — the point of the story
  Fiji: 1.5, 'Papua New Guinea': 0.8, Vanuatu: 0.6, 'Solomon Is.': 0.4,
  Samoa: 1.1, Tonga: 1.2, Kiribati: 0.5, Tuvalu: 1.0, 'Marshall Is.': 1.9,
  'Micronesia': 1.3, Palau: 5.9, 'New Caledonia': 4.2, 'Fr. Polynesia': 3.1,
}

/** Deterministic 0.2–6 t/capita for countries not listed above. */
function fallback(name) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 9973
  return 0.2 + (h % 580) / 100
}

export function carbonFootprint(name) {
  return KNOWN[name] ?? fallback(name)
}

/** Domain for the colour ramp — capped so a handful of petro-states don't flatten everyone. */
export const FOOTPRINT_DOMAIN = [0, 20]
