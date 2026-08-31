# Method and sources

The long-form companion to [README.md](README.md): how the number is built, what
the pipeline does, every source including the ones that did not reach the piece,
and the things that bite.

---

## The measure

```
ASR = emissions / allocated carrying capacity
```

The allocated carrying capacity is a country's fair share of a fixed annual
level of emissions the climate could sustain indefinitely. An ASR of 3 means a
country emits three times what it is entitled to; 0.1 means a tenth.

The budget is the **2 °C steady-state carrying capacity** of Bjørn & Hauschild
(2015): **6.81 GtCO₂-eq/yr**, or **0.847 t per person** in 2023. In 2023 the
world emitted **43.26 Gt** — **6.4×** what it may.

Splitting that budget between countries is a moral choice, not a technical
step, so the piece computes three rules and lets the reader switch between
them:

| Method | Rule | Share of the budget |
|---|---|---|
| `EG(Pop)` — egalitarian | everyone gets the same | `population / world population` |
| `PR(GDPcap)` — prioritarian | poorer countries get more | `(population ÷ GDP per capita)`, normalised |
| `AR(E)` — grandfathering | you keep what you already had | `emissions in the base year / world emissions that year` |

---

## The piece

Eight scrolling scenes, in `pacific-app-2026/src/scenes/`.

| Scene | Shows | Reads |
|---|---|---|
| `GlobeScene` | WebGL Earth, the nine planetary boundaries, seven of them crossed, closing on climate | `planetaryBoundaries.js`, `contributions.json` |
| `SwarmScene` | The 6.81 Gt annual budget against what the world actually emits, as a swarm of dots; the Pacific's 0.053% | `contributions.json`, `ghgBudget2023.js` |
| `AsrVizScene` | How to read an ASR disc — log₁₀ radius, dashed ring at ASR 1, mint inside a fair share, gold over | `ghgBudget2023.js` |
| `AllocationScene` | The three allocation rules on a Pacific map, entitlements in megatonnes, switchable | `asr.json`, `asr_gdp.json`, `asr_gf.json`, `contributions.json` |
| `RankingScene` | "Who's best in class?" — the Pacific and the world ranked under each rule, with search | the three ASR tables, `contributions.json` |
| `ScatterScene` | Pacific vs world, ASR against six switchable x axes: exposure, disaster loss, emissions share, fossil rents, GDP per capita, ND-GAIN vulnerability | `scatter.json` |
| `PalauScene` | Palau, the world's biggest overshooter: six hypotheses tested against its Pacific neighbours | `palau_context.json` |
| `ColophonScene` | Sources and method | — |

**The app reads exactly six tables:** `asr.json`, `asr_gdp.json`, `asr_gf.json`,
`contributions.json`, `scatter.json`, `palau_context.json`. `public/data` is a
symlink to `data_viz/`, and those six must stay un-ignored in `.gitignore` or
the Pages build fails its own bundle check — see
[Troubleshooting](#troubleshooting).

---

## Running it

### The data pipeline

Install the Python dependencies, then run the notebooks in order from the repo
root. Each writes what the next reads.

```bash
pip install pyaesa pandas numpy requests sdmx1 pycountry jupyter
```

| Notebook | Does | Writes | In the piece |
|---|---|---|---|
| `01_setup.ipynb` | Downloads World Bank and IPCC AR6 reference data via pyaesa | `data_raw/`, `data_processed/`, `asr/` | — |
| `02_emissions.ipynb` | Fetches and merges national GHG emissions (SPC + OWID) | `asr/A_lca/…`, `data_viz/emissions.csv`, `countries.csv` | feeds 03 |
| `03_asr.ipynb` | Computes the ASR under all three allocation rules | `asr.json`, `asr_gdp.json`, `asr_gf.json`, `asr.csv`, `variables.csv` | ✅ |
| `04_contributions.ipynb` | Each country's share of 2023 world emissions, and the Pacific bloc's | `contributions.json`, `contributions.csv` | ✅ |
| `05_exposure.ipynb` | Joins six candidate x axes onto the ASR panel | `scatter.json` | ✅ |
| `06_palau_context.ipynb` | Which indicators make Palau an outlier among Pacific islands, scored by robust z | `palau_context.json` | ✅ |

The numbering runs 01–06 with no gaps. Two exploratory notebooks — tourism and
energy, for a scene that did not make the final cut — were removed, and what is
now 05 and 06 was 07 and 08 until the renumber; both older sets live in the git
history.

Timing: notebook 01 downloads ~210 MB and is slow; 03 runs the full allocation
chain and takes ~20 minutes; 05 takes about a minute; the rest run in seconds.
All six are safe to re-run.

Shared settings — paths, the year window (2000–2023), the Pacific country list,
and the reasoning behind every methodological choice — live in `config.py`.
`pdh_api.py` wraps the Pacific Data Hub's SDMX API.
---
## Tech stack

**Data pipeline — Python, Jupyter**

| Tool | Role |
|---|---|
| [pyaesa](https://pypi.org/project/pyaesa/) 1.2.4 | Reference-data download, carrying capacities, budget allocation, ASR |
| [pandas](https://pandas.pydata.org/) · [NumPy](https://numpy.org/) | All tabular work |
| [sdmx1](https://pypi.org/project/sdmx1/) | SDMX client for the Pacific Data Hub |
| [requests](https://requests.readthedocs.io/) | World Bank, UN SDG and ND-GAIN downloads |
| [pycountry](https://pypi.org/project/pycountry/) | ISO 3166 code and name resolution |
| [Jupyter](https://jupyter.org/) | The six numbered notebooks |

**App — `pacific-app-2026/`**

| Tool | Role |
|---|---|
| [React](https://react.dev/) 19 | All rendering — every chart is JSX |
| [Vite](https://vite.dev/) 8 | Dev server and build |
| [D3](https://d3js.org/) 7 | **Maths only** — scales, shapes, projections, force layout, interpolation, formatting |
| [Motion](https://motion.dev/) | Scroll-driven and enter/exit animation |
| [react-globe.gl](https://github.com/vasturiano/react-globe.gl) + [three.js](https://threejs.org/) | The photoreal opening globe (WebGL) |
| [topojson-client](https://github.com/topojson/topojson-client) + [world-atlas](https://github.com/topojson/world-atlas) | Country geometry for the maps |
| [oxlint](https://oxc.rs/) | Linting |

**Architecture rule — D3 computes, React draws.** No `d3-selection`,
`d3-transition`, `d3-axis`, `d3-zoom`, `d3-brush`, `d3-drag` or `d3-fetch`
anywhere; axes are `scale.ticks()` mapped into JSX, animation is React state.

**Delivery**

| Tool | Role |
|---|---|
| [GitHub Actions](https://github.com/features/actions) | Build on push to `main`, with a check that every table the app fetches made it into `dist/` |
| [GitHub Pages](https://pages.github.com/) | Hosting |

---

## Data sources

All open data, as the competition requires. ✅ marks a source that reaches the
published piece; ⬚ marks one computed in the repo but not shown. This list is
the colophon at the end of the piece, in full.

### Pacific Data Hub — SPC .Stat (SDMX)

Browse the catalogue at **https://stats.pacificdata.org/**. Every dataflow below
is read over SDMX with `sdmx1` through `pdh_api.py`; each ID links to its
browsable page, and the machine-readable definition sits at
`https://stats.pacificdata.org/rest/dataflow/SPC/<ID>`.

| | Dataflow | Indicator(s) | What for | Notebook |
|---|---|---|---|---|
| ✅ | [`DF_CLIMATE_CHANGE`](https://stats.pacificdata.org/vis?lc=en&df%5Bds%5D=ds:SPC2&df%5Bid%5D=DF_CLIMATE_CHANGE&df%5Bag%5D=SPC) | `GHG_EMI_CAPITA` | GHG emissions per capita for the PICTs — the Pacific end of the ASR numerator | 02, 06 |
| ✅ | [`DF_SDG_11`](https://stats.pacificdata.org/vis?lc=en&df%5Bds%5D=ds:SPC2&df%5Bid%5D=DF_SDG_11&df%5Bag%5D=SPC) | `VC_DSR_LSGP` | Disaster loss as a share of GDP (SDG 11.5.2) for 12 PICTs, cross-checked row by row against the UN copy | 05 |
| ✅ | [`DF_ENERGY`](https://stats.pacificdata.org/vis?lc=en&df%5Bds%5D=ds:SPC2&df%5Bid%5D=DF_ENERGY&df%5Bag%5D=SPC) | `ENERGY_IND_006/007/011/015` | Installed capacity, electricity generated, primary energy — Palau's outlier family. `ENERGY_IND_011` (fuel imports) is computed and not shown | 06 |
| ✅ | [`DF_TOURISM_ARRIVALS`](https://stats.pacificdata.org/vis?lc=en&df%5Bds%5D=ds:SPC2&df%5Bid%5D=DF_TOURISM_ARRIVALS&df%5Bag%5D=SPC) | `TOUR` | Tourist arrivals — Palau's 5.3 visitors per resident, the ruled-out hypothesis | 06 |
| ✅ | [`DF_POP_PROJ`](https://stats.pacificdata.org/vis?lc=en&df%5Bds%5D=ds:SPC2&df%5Bid%5D=DF_POP_PROJ&df%5Bag%5D=SPC) | `MIDYEARPOPEST` | Mid-year population estimates, the denominator of every per-resident figure | 06 |
| ✅ | [`DF_WASTE`](https://stats.pacificdata.org/vis?lc=en&df%5Bds%5D=ds:SPC2&df%5Bid%5D=DF_WASTE&df%5Bag%5D=SPC) | `SOLIDWASTEPC` | Municipal solid waste per person per day | 06 |
| ⬚ | [`DF_NMDI_FIS`](https://stats.pacificdata.org/vis?lc=en&df%5Bds%5D=ds:SPC2&df%5Bid%5D=DF_NMDI_FIS&df%5Bag%5D=SPC) | `ER_MRN_MARIN` | Marine area protected, % of territorial waters — scored as Palau's counterpoint, but **not shown**: the line-up runs the six hypotheses in `HYPOTHESES`, and this is not one of them | 06 |
| ✅ | [`DF_WBWDI`](https://stats.pacificdata.org/vis?lc=en&df%5Bds%5D=ds:SPC2&df%5Bid%5D=DF_WBWDI&df%5Bag%5D=SPC) | `EG_EGY_PRIM_PP_KD`, `AG_LND_FRST_ZS` | Energy intensity — **World Bank WDI republished by SPC**, not an SPC measurement, used because it covers the Pacific consistently. `AG_LND_FRST_ZS` (forest cover) is computed and not shown | 06 |
| ⬚ | [`DF_TOURISM_EARNINGS`](https://stats.pacificdata.org/rest/dataflow/SPC/DF_TOURISM_EARNINGS) | — | Scanned for the Palau search; **no Palau rows exist at all**, so it is a documented gap rather than a source | 06 |

Considered and not used: [`DF_POP_LECZ`](https://stats.pacificdata.org/rest/dataflow/SPC/DF_POP_LECZ)
(share of population in the low-elevation coastal zone) — the closest SPC series
to a climate-exposure index, but Pacific-only, so it cannot carry a world x axis.

### Other open data, read directly

| | Source | What | Notebook |
|---|---|---|---|
| ✅ | [Our World in Data — CO₂ and GHG](https://github.com/owid/co2-data) | `total_ghg_excluding_lucf` for every non-Pacific country; wraps EDGAR and the Global Carbon Project | 02 |
| ✅ | [ND-GAIN Country Index 2026](https://gain.nd.edu/our-work/country-index/download-data/) (University of Notre Dame, CC-licensed) | Climate **exposure**, 192 countries — the scatter's headline x axis. The **vulnerability** composite ships too, as the counter-example the scene argues against | 05 |
| ✅ | [UN SDG Global Database](https://unstats.un.org/sdgs/dataportal) ([API](https://unstats.un.org/sdgapi/swagger/)), indicator 11.5.2, series `VC_DSR_LSGP` | Direct economic loss from disasters as % of GDP, Sendai Framework, 149 countries | 05 |
| ✅ | World Bank [`NY.GDP.PETR.RT.ZS`](https://data.worldbank.org/indicator/NY.GDP.PETR.RT.ZS), [`NY.GDP.COAL.RT.ZS`](https://data.worldbank.org/indicator/NY.GDP.COAL.RT.ZS), [`NY.GDP.NGAS.RT.ZS`](https://data.worldbank.org/indicator/NY.GDP.NGAS.RT.ZS) | Oil, coal and gas rents as % of GDP, summed, mean 2015–2021 — who was *paid* for the overshoot | 05 |

All World Bank indicators are pulled from the public
[Indicators API](https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation)
at `https://api.worldbank.org/v2/`.

### Via pyaesa

pyaesa downloads and processes these; the notebooks never touch their servers.

| | Source | What it provides here |
|---|---|---|
| ✅ | [World Bank World Development Indicators](https://databank.worldbank.org/source/world-development-indicators) | Population and GDP (PPP, constant 2017 USD) for every country — the denominators of the egalitarian and prioritarian rules, and the GDP-per-capita x axis in notebook 05 |
| ✅ | Bjørn, A., & Hauschild, M. Z. (2015), [10.1007/s11367-015-0899-2](https://doi.org/10.1007/s11367-015-0899-2) | The 2 °C steady-state climate carrying capacity, 6.81 GtCO₂-eq/yr, shipped by pyaesa as a CSV. Identified as the 2 °C figure in de Bantel et al., *UNCASExt* ([arXiv:2606.21465](https://arxiv.org/abs/2606.21465)), Fig. 2 |
| ✅ | [UNCASExt / PyUNCASE](https://setac.confex.com/setac/europe2026/meetingapp.cgi/Paper/32699) (de Bantel et al.; Pirson et al.) | The allocation-method definitions the `EG(Pop)` / `PR(GDPcap)` / `AR(E)` formulas follow |
| ⬚ | [IPCC AR6 Scenarios Database](https://data.ece.iiasa.ac.at/ar6/) (IIASA, [10.5281/zenodo.5886911](https://doi.org/10.5281/zenodo.5886911)) | Downloaded in notebook 01 for the *dynamic* budget option. **Not used in the published results** — this project runs the static budget, see [method notes](#method-notes) |
| ⬚ | [PRIMAP-hist](https://doi.org/10.5194/essd-8-571-2016) and the [Global Carbon Budget](https://globalcarbonbudget.org/the-latest-gcb-data/) | Historical baselines pyaesa harmonises AR6 pathways against, in that same download step |

pyaesa can also pull EXIOBASE 3 and OECD ICIO multi-regional input-output tables
for consumption-based accounting. **This project does not use them** — it is
territorial (production-based, `fu_code="L1.b"`). Full citation list:
`data_raw/methodological_notes/recommended_citations.txt`.

### Map and globe assets

| Asset | Source |
|---|---|
| Country outlines, 110m TopoJSON | [`world-atlas`](https://github.com/topojson/world-atlas), derived from [Natural Earth](https://www.naturalearthdata.com/) (public domain) |
| Earth colour and topography textures | NASA imagery, Blue Marble / [Visible Earth](https://visibleearth.nasa.gov/) (public domain) |

---

## About pyaesa

[**pyaesa**](https://github.com/AESAtoolkit/pyaesa)
([PyPI](https://pypi.org/project/pyaesa/)) is a Python package for *absolute
environmental sustainability assessment* — the field that asks not "is this
better than last year" but "is this inside what the planet can take". It does
three jobs here:

- **downloads and tidies reference data** — World Bank population and GDP, IPCC
  AR6 scenarios (`download_pop_gdp`, `download_ar6`, `process_pop_gdp`,
  `process_ar6`);
- **ships the carrying-capacity table** — the steady-state annual budget per
  impact category (`data_raw/carrying_capacities/gwp100_lcia_cc_steady_state.csv`);
- **runs the allocation chain** — `deterministic_asr(...)` splits the global
  budget between countries under the egalitarian and prioritarian rules and
  divides emissions by the result.

**All of this could have been done by hand.** The maths is arithmetic: one
global budget, a share per country, a division. pyaesa is a **helper**, not a
black box — it saves writing the download-and-reshape code, keeps the
allocation formulas consistent with the published AESA literature, and gives
every intermediate phase (aSoCC → aCC → ASR) a named file on disk that can be
opened and checked. No result here depends on it having been used.

Two illustrations of that:

- **Grandfathering is computed outside pyaesa.** The package carries the rule as
  `AR(E)` but refuses to run it at `source="iso3"`, which is gated to `EG(Pop)`
  and `PR(GDPcap)`. The equation needs nothing but emissions, so notebook 03
  applies it directly — `share(c) = E(c, base) / ΣE(base)` — against the same
  budget pool the other two rules divide.
- **The budget is a single number.** 6.81 GtCO₂-eq/yr, read from a CSV. Nothing
  stops you dividing it by population in a spreadsheet.

Version used: pyaesa 1.2.4 (GPL-3.0).

---

## Method notes

The short version of the choices that shape the numbers. `config.py` carries
the long version, in comments next to the constants they govern.

- **Say "2 °C steady-state carrying capacity"** — not "planetary boundary", not
  "1.5 °C", not "carbon budget". The strict planetary-boundary value is tighter
  (~1.06 °C) and is defined by *state* variables (ppm CO₂, W/m²), which cannot
  be used as a kg CO₂-eq/yr flow.
- **Static, not dynamic.** The dynamic AR6 pathway front-loads the allowance and
  puts the reductions after this window, so the world reads as near-compliant at
  1.17×. Static gives 6.4×, which is the meaningful figure for a historical
  snapshot, and it avoids four unsettleable choices (IAM, SSP, climate pathway,
  which of C1's twelve scenarios).
- **All Kyoto gases, CO₂-eq, excluding land use.** Forced by the Pacific data:
  the Pacific Data Hub reports on that basis, putting Papua New Guinea at
  10.4 Mt for 2023 against OWID's 43.9 Mt with land use and 11.4 Mt without.
  Matching OWID to it keeps one basis across all countries.
- **Territorial (production-based) accounting**, `fu_code="L1.b"`, keyed on
  `r_p`. No consumption-based figures exist for any Pacific island — OWID's
  `consumption_co2` covers 0 of the 14.
- **Grandfathering is shown at its collapse point.** With the base year set to
  the displayed year, each country's own emissions cancel out of the ratio and
  all 198 land on the same value — 6.3621 in 2023, the world's own ASR. That
  flat result *is* the argument: the rule declares everyone equally in overshoot
  while handing the US 2.6 t/person of entitlement and the Marshall Islands
  16 kg. Set `GF_BASE_YEAR = min(YEARS)` for the other reading, where the spread
  is each country's emissions growth relative to the world's.
- **Exposure, not vulnerability.** ND-GAIN's headline composite folds in
  sensitivity and adaptive capacity, which are development indicators: it
  correlates −0.83 with log GDP per capita against exposure's −0.50, so a chart
  built on it plots poverty and calls it climate. INFORM Risk and the
  WorldRiskIndex are worse for this story — they score absolute humanitarian
  impact, so they weight by population and both rank Tuvalu among the world's
  *safest* countries. On exposure Tuvalu ranks 2nd of 192, behind the Maldives,
  and seven Pacific islands sit in the global top 20.
- **Pacific figures come from the Pacific Data Hub**, not OWID, wherever both
  have a country.

---

## Caveats

- **Territorial accounting cuts both ways.** Emissions are counted where they
  happen, divided by who lives there. Palau (ASR 97) and New Caledonia (21,
  nickel smelting) come out very high. Both figures are correct and both need
  context — which is what notebook 06 and the Palau scene provide.
- **Coverage: 198 countries.** American Samoa, Guam and the Northern Mariana
  Islands have Pacific Data Hub emissions but no World Bank population entry, so
  no budget can be allocated to them. Bermuda, Greenland, San Marino, Monaco,
  Curaçao, Sint Maarten, Eswatini and Palestine have no land-use-free OWID
  series in this window and are dropped rather than guessed at.
- **No land-use emissions**, so the piece cannot make a deforestation argument.
  On this basis Brazil is the 9th largest emitter rather than the 4th, and the
  DR Congo 67th rather than 11th.
- **The prioritarian view covers fewer countries.** New Caledonia and French
  Polynesia have no internationally comparable PPP GDP — they are French
  collectivities outside the International Comparison Program. SPC publishes
  only nominal GDP, which is not substitutable: the PPP/nominal ratio is 2.05×
  for Fiji but 1.33× for Tonga.
- **Disaster loss is a floor, not a measurement.** SDG 11.5.2 reporting is
  voluntary; about fifty countries in the panel have never filed, and filers
  undercount — Vanuatu's largest reported year is 0.41% of GDP over a period
  that includes Cyclone Pam.
- **Uncertainty is a min/max bracket.** The carrying capacity is a range:
  `min_cc` = 6.81 GtCO₂-eq/yr (the headline) and `max_cc` = 8.72, which is 128%
  of it. `data_viz/asr.csv` carries both for all three rules; the JSON files the
  app reads report `min_cc`.
- **SPC carries some series forward.** The Marshall Islands and Nauru are
  reported at a flat 0.1 t per person every year, so a new year there is likely
  carried forward rather than freshly measured.

---

## Troubleshooting

**A table 404s on the live site.** `pacific-app-2026/public/data` is a symlink
to `data_viz/`, which `.gitignore` ignores except for an explicit allow-list. A
new table the app fetches must be un-ignored there or it never gets committed,
and the Pages build fails its own bundle check. The six the app reads are
listed under [The piece](#the-piece).

**pyaesa refuses to start because the country set changed.** Clear the computed
phases and keep notebook 02's output:

```bash
mkdir -p asr/_stale && mv asr/B1_asocc/iso3 asr/B2_acc asr/C_asr asr/_stale/
```

**Keep `figures=False` in notebook 03.** pyaesa would otherwise render about two
thousand PNGs that nothing here reads. (Under `dynamic_ar6` it is far worse:
14,568 files, five-plus hours, and then a `KeyError: ''` inside pyaesa's own
`render_asr_figures` — *after* the results are written but *before* the export
cells run.)

---
