# Pacific Dataviz Challenge 2026

Pacific island nations emit almost nothing per person, and are among the first
to lose land, water and harvests to the warming those emissions cause. This
repo builds the data behind a scrollytelling piece about that gap.

The measure is the **Absolute Sustainability Ratio**:

    ASR = emissions / allocated carrying capacity

A country's allocated carrying capacity is its fair share of the **IPCC AR6
remaining carbon budget for &lt;1.5&nbsp;°C** (category C1, scenario
`EN_NPi2020_500`). An ASR of 3 means a country emits three times what it is
entitled to; an ASR of 0.1 means a tenth.

Two allocation rules are computed, and the piece compares them:

| Method | Rule | Share of the budget |
|---|---|---|
| `EG(Pop)` — egalitarian | everyone gets the same | `population / world population` |
| `PR(GDPcap)` — prioritarian | poorer countries get more | `(population ÷ GDP per capita)`, normalised |

Under the egalitarian rule the per-person entitlement is identical for every
country — 4.595 t CO2-eq in 2023 — because population cancels out. Under the
prioritarian rule each country gets its own, from 0.32 t (Luxembourg) to
40.2 t (Burundi).

## Pipeline

Run the notebooks in order. Each writes what the next one reads.

| Notebook | Does | Writes |
|---|---|---|
| `01_setup.ipynb` | Downloads World Bank and IPCC AR6 reference data | `data_raw/`, `data_processed/`, `asr/` |
| `02_emissions.ipynb` | Fetches and merges national GHG emissions | `asr/A_lca/…`, `data_viz/emissions.csv`, `data_viz/countries.csv` |
| `03_asr.ipynb` | Computes the ASR | `data_viz/asr.json`, `asr_gdp.json`, `asr.csv`, `variables.csv`, `global_constants.csv` |

Notebook 01 downloads ~210 MB of AR6 scenarios and takes a while. Notebook 02 is
quick; notebook 03 runs the full allocation chain and takes roughly 20 minutes.
All three are safe to re-run.

**Keep `figures=False` in notebook 03.** Under `dynamic_ar6` pyaesa renders one
chart per country per AR6 scenario per method — 14,568 PNGs and five-plus hours
— and then crashes in its own plotting code (`KeyError: ''` in
`render_asr_figures`) *after* writing the results but *before* the export cells
run. Nothing in this project reads those figures.

Shared settings — paths, the year window, the Pacific country list — live in
`config.py`. `pdh_api.py` wraps the Pacific Data Hub's SDMX API.

## Data sources

All open data.

- **[SPC Pacific Data Hub](https://stats.pacificdata.org/)** — GHG emissions per
  capita for Pacific islands, via SDMX
- **[Our World in Data](https://github.com/owid/co2-data)** — GHG emissions for
  every other country, wrapping EDGAR and the Global Carbon Project
- **IPCC AR6 scenario database** and **World Bank** population and GDP (PPP,
  constant 2017 USD) — downloaded by [pyaesa](https://pypi.org/project/pyaesa/),
  which also computes the budget allocation and the ratio

Pacific figures come from the Pacific Data Hub rather than OWID wherever both
have a country. OWID's `total_ghg` is unusable at this scale: it puts French
Polynesia at 68 Mt CO2-eq for 280,000 people, some 240 tonnes each, because its
land-use-change component swamps small territories. The Pacific Data Hub says
0.8 Mt.

## Caveats

- **Territorial accounting.** Emissions are counted where they happen, divided
  by who lives there. Palau and New Caledonia come out very high as a result —
  Palau hosts several times its population in visitors each year, New Caledonia
  smelts nickel. Both figures are correct and both need context.
- **Coverage.** 206 countries. American Samoa, Guam and the Northern Mariana
  Islands have Pacific Data Hub emissions but no World Bank population entry,
  so no budget can be allocated to them.
- **Accounting boundary.** Production-based (territorial), `fu_code="L1.b"`,
  keyed on `r_p`. Both sources report territorial emissions, so consumption-based
  framing (`L1.a`) would misdescribe the data. No consumption-based figures exist
  for any Pacific island — OWID's `consumption_co2` covers 0 of the 14.
- **One AR6 scenario, not a blend.** C1 bundles 12 model/policy runs. We report
  `EN_NPi2020_500` rather than an unlabelled median; the others are in the
  pyaesa output if you want a sensitivity check.
- **The prioritarian view covers 195 countries, not 206.** New Caledonia and
  French Polynesia have no internationally comparable PPP GDP — they are French
  collectivities and do not take part in the International Comparison Program,
  so the World Bank, SPC `DF_WBWDI` and HRMI all lack it. SPC publishes only
  nominal GDP, which is not substitutable: the PPP/nominal ratio is 2.05× for
  Fiji but 1.33× for Tonga, so mixing bases would bias the Pacific by an unknown
  amount in the direction that flatters the argument.
