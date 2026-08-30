# Pacific Dataviz Challenge 2026

Pacific island nations emit almost nothing per person, and are among the first
to lose land, water and harvests to the warming those emissions cause. This
repo builds the data behind a scrollytelling piece about that gap.

The measure is the **Absolute Sustainability Ratio**:

    ASR = emissions / allocated carrying capacity

A country's allocated carrying capacity is its fair share of a **steady-state
climate carrying capacity** — a fixed annual level of greenhouse-gas emissions
that could be sustained indefinitely. An ASR of 3 means a country emits three
times what it is entitled to; an ASR of 0.1 means a tenth.

| bound | GtCO₂eq/yr | what it is | per person, 2023 |
|---|---|---|---|
| `min_cc` | **6.81** | the **2 °C** steady-state budget, Bjørn & Hauschild (2015) | **0.847 t** |
| `max_cc` | 8.72 | 128% of `min_cc` | 1.084 t |

`min_cc` is the headline. Against it the world emits **6.4×** what it may.

**Say "2 °C steady-state carrying capacity" — not "planetary boundary", not
"1.5 °C", not "carbon budget".** The 6.81 figure is the 2 °C value, stated in
de Bantel et al., *UNCASExt* (arXiv:2606.21465) Fig. 2. The shipped CSV's
comment mentions "450 ppm / 350 ppm"; that is only where the 128% ratio for
`max_cc` comes from (450/350 = 1.286), not a claim that `min_cc` is the
350 ppm boundary level.

The strict planetary-boundary value is tighter (~1.06 °C) and is **not** in
pyaesa's `gwp100` table — the PB framework defines climate through *state*
variables (ppm CO₂, W/m² energy imbalance), which pyaesa keeps separately in
`pb_lcia_cc_steady_state.csv` and cannot use as a kg CO₂-eq/yr flow. Using it
means lifting the number from Bjørn & Hauschild (2015) Appendix C and
overriding `min_cc` by hand.

Three allocation rules are computed, and the piece compares them:

| Method | Rule | Share of the budget |
|---|---|---|
| `EG(Pop)` — egalitarian | everyone gets the same | `population / world population` |
| `PR(GDPcap)` — prioritarian | poorer countries get more | `(population ÷ GDP per capita)`, normalised |
| `AR(E)` — grandfathering | you keep what you already had | `emissions in 2000 / world emissions in 2000` |

Under the egalitarian rule the per-person entitlement is identical for every
country — 0.847 t CO₂-eq in 2023 — because population cancels out. Under the
prioritarian rule each country gets its own, inversely to GDP per capita.

**Grandfathering is computed outside pyaesa.** pyaesa carries the rule as
`AR(E)` (acquired rights) but refuses to run it at `source="iso3"`, which is
gated to `EG(Pop)` and `PR(GDPcap)`: its other six L1 methods resolve shares
from LCIA-weighted MRIO impacts, which a country-level emissions table does not
carry. The equation needs nothing but emissions, so notebook 03 applies it
directly — `share(c) = E(c, 2000) / ΣE(2000)` — against the same budget pool
the other two rules divide (pyaesa's own allocated carrying capacity summed
back over the 198 countries, 99.8% of the global figure).

The reference year is load-bearing. Set it to the current year and the rule
collapses — the numerator cancels and every country lands on the same ratio.
That degeneracy is the argument against grandfathering, but it does not draw,
so the window start is used. **Read the grandfathering numbers as divergence
since 2000, not as a level:** every country starts on an identical 4.33 by
construction and moves off it only by growing faster or slower than the world.
It inverts the ranking — in 2023 the UK (2.2) and Denmark (2.5) sit at the
bottom while Laos (55), Mongolia (38) and Afghanistan (26) top it.

**Static, not dynamic.** The dynamic AR6 pathway is built for prospective
studies: it front-loads the allowance and places the reductions after this
window, so measured against it the world sits at 1.17× its 2023 budget and
reads as near-compliant. Static gives 6.4×. For a historical snapshot the
static value is the meaningful one, and it is the planetary boundary this
project is named after. Going static also removes four choices the dynamic
path forced with no principled way to settle them — the IAM, the SSP, the
climate pathway, and which of C1's twelve scenarios to report. Under dynamic
those must be propagated with `uncertainty_asr` (Monte Carlo), not settled by
picking one representative.

## Pipeline

Run the notebooks in order. Each writes what the next one reads.

| Notebook | Does | Writes |
|---|---|---|
| `01_setup.ipynb` | Downloads World Bank and IPCC AR6 reference data | `data_raw/`, `data_processed/`, `asr/` |
| `02_emissions.ipynb` | Fetches and merges national GHG emissions | `asr/A_lca/…`, `data_viz/emissions.csv`, `data_viz/countries.csv` |
| `03_asr.ipynb` | Computes the ASR | `data_viz/asr.json`, `asr_gdp.json`, `asr_gf.json`, `asr.csv`, `variables.csv` |
| `04_contributions.ipynb` | Each country's share of 2023 world emissions, and the Pacific bloc's | `data_viz/contributions.json`, `contributions.csv` |
| `05_tourism.ipynb` | Tourist arrivals per resident for every Pacific island, and the 2019 world ranking | `data_viz/tourism.csv`, `tourism.json` |

Notebook 01 downloads ~210 MB of AR6 scenarios and takes a while. Notebook 02 is
quick; notebook 03 runs the full allocation chain and takes roughly 20 minutes;
notebook 04 only re-reads what 02 wrote and runs in seconds; notebook 05 is
independent of the ASR chain and runs in seconds. All five are safe to re-run.

If pyaesa refuses to start because the country set changed, clear the computed
phases and keep notebook 02's output:
`mkdir -p asr/_stale && mv asr/B1_asocc/iso3 asr/B2_acc asr/C_asr asr/_stale/`

**Keep `figures=False` in notebook 03.** pyaesa would otherwise render about
two thousand PNGs that nothing here reads. (Under `dynamic_ar6` it is far
worse — 14,568 files, five-plus hours, and then a crash in pyaesa's own
plotting code, `KeyError: ''` in `render_asr_figures`, *after* the results are
written but *before* the export cells run.)

Shared settings — paths, the year window, the Pacific country list — live in
`config.py`. `pdh_api.py` wraps the Pacific Data Hub's SDMX API.

## Data sources

All open data.

- **[SPC Pacific Data Hub](https://stats.pacificdata.org/)** — GHG emissions per
  capita for Pacific islands, plus tourist arrivals and mid-year population
  estimates for all 22 PICTs, via SDMX
- **[Our World in Data](https://github.com/owid/co2-data)** — GHG emissions for
  every other country, wrapping EDGAR and the Global Carbon Project
- **IPCC AR6 scenario database** and **World Bank** population and GDP (PPP,
  constant 2017 USD) — downloaded by [pyaesa](https://pypi.org/project/pyaesa/),
  which also computes the budget allocation and the ratio
- **[World Bank `ST.INT.ARVL`](https://data.worldbank.org/indicator/ST.INT.ARVL)**
  — international tourist arrivals for the rest of the world, read straight from
  the World Bank API and used only for the 2019 ranking in notebook 05

Both sources are read as **all greenhouse gases in CO₂-eq excluding land use**
(OWID's `total_ghg_excluding_lucf`) — every Kyoto gas, not CO₂ alone, which is
what `gwp100_lcia` requires. Excluding land use is forced by the Pacific data:
the Pacific Data Hub reports on that basis, putting Papua New Guinea at 10.4 Mt
for 2023 against OWID's 43.9 Mt with land use and 11.4 Mt without. Matching
OWID to it keeps one basis across all countries.

Note this was originally justified by the AR6 budget's `include_afolu=False`.
That argument no longer applies under a static carrying capacity, which is not
built from an AFOLU setting. The choice stands on Pacific data availability
alone, and it is a real limitation — see the caveats.

Pacific figures come from the Pacific Data Hub rather than OWID wherever both
have a country.

## Caveats

- **Territorial accounting.** Emissions are counted where they happen, divided
  by who lives there. Palau and New Caledonia come out very high as a result —
  Palau hosted 5.3 visitors per resident in 2019 (notebook 05), New Caledonia
  smelts nickel. Both figures are correct and both need context.
- **Coverage.** 198 countries. American Samoa, Guam and the Northern Mariana
  Islands have Pacific Data Hub emissions but no World Bank population entry,
  so no budget can be allocated to them. Bermuda, Greenland, San Marino,
  Monaco, Curacao, Sint Maarten, Eswatini and Palestine have no
  land-use-free OWID series in this window and are dropped rather than
  guessed at.
- **No land-use emissions.** Deforestation and land-use change are outside
  both the numerator and the budget, so the piece cannot make a deforestation
  argument. On this basis Brazil is the 9th largest emitter rather than the
  4th, and the DR Congo 67th rather than 11th.
- **Accounting boundary.** Production-based (territorial), `fu_code="L1.b"`,
  keyed on `r_p`. Both sources report territorial emissions, so consumption-based
  framing (`L1.a`) would misdescribe the data. No consumption-based figures exist
  for any Pacific island — OWID's `consumption_co2` covers 0 of the 14.
- **Uncertainty is the min/max bracket.** `data_viz/asr.csv` carries both
  `min_cc` and `max_cc` for all three allocation rules. `asr.json`,
  `asr_gdp.json` and `asr_gf.json` report `min_cc`.
- **The prioritarian view covers fewer countries than the egalitarian one.** New Caledonia and
  French Polynesia have no internationally comparable PPP GDP — they are French
  collectivities and do not take part in the International Comparison Program,
  so the World Bank, SPC `DF_WBWDI` and HRMI all lack it. SPC publishes only
  nominal GDP, which is not substitutable: the PPP/nominal ratio is 2.05× for
  Fiji but 1.33× for Tonga, so mixing bases would bias the Pacific by an unknown
  amount in the direction that flatters the argument.
