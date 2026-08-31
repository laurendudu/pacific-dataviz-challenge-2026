/**
 * The countries every scene calls large emitters. One list, so the ranking and
 * the scatter cannot disagree about who they are.
 *
 * Chosen on the measure this project is actually about: **share of the world's
 * overshoot**: tonnes emitted above a fair share since 2000, summed over a
 * country's population, as a percentage of every country's overshoot added up.
 * It is the only ranking that counts both how far past a fair share a country
 * lives and how many people live there, which is what the ASR panels are
 * measuring. The first eight below are the top eight on it and account for 69%
 * of the world's overshoot:
 *
 *   China 34%, United States 14%, India 6.0%, Russia 5.6%,
 *   Japan 2.5%, Iran 2.4%, Indonesia 2.3%, Saudi Arabia 2.1%
 *
 * Three more are here by name and not by that rule:
 *
 *   Australia (16th) is the Pacific's neighbour and the region's largest
 *   economy, and it overshoots by 20× per person. Leaving it out would let
 *   the reader miss who is standing next to the islands.
 *   France (26th) administers two of the territories in this story, New
 *   Caledonia and French Polynesia, so its footprint is part of the Pacific's.
 *   Qatar (34th) is the extreme of per-person overshoot: small enough to
 *   cause little of the total, far enough past a fair share to mark the
 *   other end of the scale from the islands.
 *
 * Numbers from `data_viz/contributions.csv` and `asr.json`, 2000-2023.
 */
export const EMITTER_LIST = [
  'CHN',
  'USA',
  'IND',
  'RUS',
  'JPN',
  'IRN',
  'IDN',
  'SAU',
  'AUS',
  'FRA',
  'QAT',
]

export const EMITTERS = new Set(EMITTER_LIST)

export function isEmitter(iso) {
  return EMITTERS.has(iso)
}
