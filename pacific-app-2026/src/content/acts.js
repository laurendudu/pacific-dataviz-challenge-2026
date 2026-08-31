/**
 * Narrative copy, one entry per act (see PLAN.md).
 * Text lives here so the act components stay about rendering.
 * `dataset` names what each figure is waiting on. Placeholders surface it.
 */

export const acts = [
  {
    id: 'act-1',
    number: 'Act 1',
    title: 'The system has limits',
    standfirst: 'Earth runs on a budget. Nine of them, in fact.',
    dataset: 'Stockholm Resilience Centre: planetary boundary status',
    steps: [
      { kicker: 'Nine boundaries', body: 'Science has drawn nine limits inside which humanity can keep operating safely. Cross one and the system stops behaving predictably.' },
      { kicker: 'The causes are ours', body: 'Each boundary has a human driver behind it: fossil fuels, deforestation, manufacturing, intensive agriculture.' },
      { kicker: 'Six are breached', body: 'Most of the nine have already been transgressed. This is not a forecast. It is the current reading.' },
      { kicker: 'A budget overdrawn', body: 'Climate change is the boundary this story follows, because it is the one with a ledger you can count.' },
    ],
  },
  {
    id: 'act-2',
    number: 'Act 2',
    title: "Who's spending it",
    standfirst: 'The remaining carbon budget, drained year by year.',
    dataset: 'pyaesa: dynamic AR6 carbon budget',
    steps: [
      { kicker: 'The budget', body: 'AR6 gives a finite quantity of carbon that can still be emitted while holding to 1.5°C.' },
      { kicker: 'Fossil fuels', body: 'Around 68% of greenhouse gas emissions come from burning fossil fuels for energy, heat and transport.', note: 'Source: UN Climate Action' },
      { kicker: 'Draining', body: 'Watch the budget fall as each year of emissions is subtracted from what remains.' },
      { kicker: 'Today', body: 'This is what is left. At current rates, it is a matter of years, not generations.' },
    ],
  },
  {
    id: 'act-3',
    number: 'Act 3',
    title: 'The unfair bill',
    standfirst: 'Absolute Sustainability Ratio: who overshot their fair share.',
    dataset: 'pyaesa deterministic_asr() + SPC GHG per capita',
    steps: [
      { kicker: 'A fair share', body: 'Split the budget equally per person and every country gets an allocation. ASR measures actual use against that allocation.' },
      { kicker: 'Above 1', body: 'An ASR above 1 means a country is consuming more than its share. The largest economies sit at three to seven times over.' },
      { kicker: 'Below 1', body: 'Pacific nations sit near the bottom of the ranking, an order of magnitude inside their fair share.' },
      { kicker: 'The twenty', body: 'The 20 largest economies account for around 80% of the budget spent.', note: 'Source: UN Climate Action' },
    ],
  },
  {
    id: 'act-4',
    number: 'Act 4',
    title: 'The consequences land here',
    standfirst: 'The breach in Act 1 becomes sea level, heat and storms in the Pacific.',
    dataset: 'SPC .Stat: sea level, SST and surface temperature anomalies, disaster impacts',
    steps: [
      { kicker: 'Rising ocean', body: 'Sea level anomalies across the Pacific, measured station by station.' },
      { kicker: 'Warming water', body: 'Sea surface temperature anomalies: the engine behind coral bleaching and stronger cyclones.' },
      { kicker: 'People affected', body: 'The count of people directly affected by disasters, and the economic loss that follows.' },
      { kicker: 'Country by country', body: 'Tuvalu. Kiribati. Marshall Islands. The lowest-lying nations carry the sharpest curves.' },
    ],
  },
  {
    id: 'act-5',
    number: 'Act 5',
    title: 'The visitor paradox',
    standfirst: 'The highest-ASR countries send the most tourists.',
    dataset: 'SPC .Stat: tourist arrivals, disaggregated by origin',
    steps: [
      { kicker: 'Arrivals', body: 'Where Pacific visitors come from, sized by volume.' },
      { kicker: 'Coloured by ASR', body: 'Now colour each origin country by how far it has overshot its carbon budget.' },
      { kicker: 'The same people', body: 'The visitors and the emitters are the same countries. The islands’ main income depends on them.' },
      { kicker: 'Last chance tourism', body: 'People are travelling to see the islands before they disappear, and the flights make the disappearance faster.' },
    ],
  },
  {
    id: 'act-6',
    number: 'Act 6',
    title: 'The mirror',
    standfirst: 'If the world consumed like the Pacific.',
    dataset: 'pyaesa ASR: Pacific consumption applied globally',
    steps: [
      { kicker: 'Rerun it', body: 'Take the same nine boundaries, and recalculate them as if every country consumed at Pacific levels.' },
      { kicker: 'All nine hold', body: 'Nothing is breached. The wedges sit inside the safe operating space.' },
      { kicker: 'Not victims', body: 'The Pacific is not waiting to be rescued from a problem it caused. It is already living the answer.' },
    ],
  },
]
