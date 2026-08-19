# Pacific Dataviz Challenge 2026

Pacific island nations emit almost nothing per person, and are among the first
to lose land, water and harvests to the warming those emissions cause. This
repo builds the data behind a scrollytelling piece about that gap.

The measure is the **Absolute Sustainability Ratio**:

    ASR = emissions / allocated carrying capacity

A country's allocated carrying capacity is its fair share of the global carbon
budget under equal per capita allocation — every person alive gets the same
share of what the IPCC AR6 pathways leave. An ASR of 3 means a country emits
three times what its population is entitled to. An ASR of 0.1 means it emits a
tenth.

## Pipeline

Run the notebooks in order. Each writes what the next one reads.

| Notebook | Does | Writes |
|---|---|---|
| `01_setup.ipynb` | Downloads World Bank and IPCC AR6 reference data | `data_raw/`, `data_processed/`, `asr/` |
| `02_emissions.ipynb` | Fetches and merges national GHG emissions | `asr/A_lca/…`, `data_viz/emissions.csv`, `data_viz/countries.csv` |
| `03_asr.ipynb` | Computes the ASR | `data_viz/asr.json`, `data_viz/asr.csv` |

Notebook 01 downloads ~210 MB of AR6 scenarios and takes a while. Notebooks 02
and 03 are quick. All three are safe to re-run.

Shared settings — paths, the year window, the Pacific country list — live in
`config.py`. `pdh_api.py` wraps the Pacific Data Hub's SDMX API.

## Data sources

All open data.

- **[SPC Pacific Data Hub](https://stats.pacificdata.org/)** — GHG emissions per
  capita for Pacific islands, via SDMX
- **[Our World in Data](https://github.com/owid/co2-data)** — GHG emissions for
  every other country, wrapping EDGAR and the Global Carbon Project
- **IPCC AR6 scenario database** and **World Bank** population — downloaded by
  [pyaesa](https://pypi.org/project/pyaesa/), which also computes the budget
  allocation and the ratio

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
- **Budget bounds.** `data_viz/asr.csv` carries both `min_cc` (conservative
  budget, higher ratio) and `max_cc`. `asr.json` reports `min_cc`.
