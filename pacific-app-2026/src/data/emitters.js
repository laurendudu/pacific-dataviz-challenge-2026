/**
 * The countries every scene calls large emitters. One list, so the ranking and
 * the scatter cannot disagree about who they are.
 *
 * Chosen on the measure this project is actually about: **share of the world's
 * overshoot** — tonnes emitted above a fair share since 2000, summed over a
 * country's population, as a percentage of every country's overshoot added up.
 * It is the only ranking that counts both how far past a fair share a country
 * lives and how many people live there, which is what the ASR panels are
 * measuring. The first eight below are the top eight on it and account for 69%
 * of the world's overshoot:
 *
 *   China 34%, United States 14%, India 6.0%, Russia 5.6%,
 *   Japan 2.5%, Iran 2.4%, Indonesia 2.3%, Saudi Arabia 2.1%
 *
 * Australia is the ninth by name and not by that rule — it is 16th. It is here
 * because it is the Pacific's neighbour and the region's largest economy, it
 * overshoots by 20× per person, and the story is about the Pacific: leaving it
 * out would let the reader miss who is standing next to the islands.
 *
 * Replaces an older list — France, the UK, Germany, Qatar — that was really
 * "familiar rich countries". They overshoot per person, but they rank 26th,
 * 23rd, 11th and 34th on the overshoot they caused, and picking them over
 * Russia, Japan, Iran and Indonesia was flattering to the wrong countries.
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
]

export const EMITTERS = new Set(EMITTER_LIST)

export function isEmitter(iso) {
  return EMITTERS.has(iso)
}
