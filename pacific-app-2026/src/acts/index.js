import { Act1Boundaries } from './Act1Boundaries'
import { Act2CarbonBudget } from './Act2CarbonBudget'
import { Act3AsrRanking } from './Act3AsrRanking'
import { Act4Consequences } from './Act4Consequences'
import { Act5VisitorParadox } from './Act5VisitorParadox'
import { Act6Mirror } from './Act6Mirror'

/** Act id → figure component. Swap a placeholder out here as each act lands. */
export const figures = {
  'act-1': Act1Boundaries,
  'act-2': Act2CarbonBudget,
  'act-3': Act3AsrRanking,
  'act-4': Act4Consequences,
  'act-5': Act5VisitorParadox,
  'act-6': Act6Mirror,
}
