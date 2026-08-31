# Pacific Dataviz Challenge 2026

Every country's **Absolute Sustainability Ratio** — its emissions divided by its
fair share of a safe global climate budget — under three competing definitions
of "fair", and what those definitions do to the Pacific.

**[Read the piece →](https://laurendudu.github.io/pacific-dataviz-challenge-2026/)**

All data used in the project is publicly available.

## Run it

Python notebooks compute the numbers into `data_viz/*.json`; a React + D3
scrollytelling app in `pacific-app-2026/` reads them and animates eight scenes.

```bash
pip install pyaesa pandas numpy requests sdmx1 pycountry jupyter
```

Run the notebooks from the repo root in order — `01`, `02`, `03`, `04`, `07`,
`08` — then start the app:

```bash
cd pacific-app-2026 && npm install && npm run dev
```

**Author** — [Lauren Durivault](https://github.com/laurendudu)

**Entry** — Pacific Dataviz Challenge 2026

**Special mention** — the calculations follow the AESA (absolute environmental
sustainability assessment) literature, computed with
[pyaesa](https://github.com/AESAtoolkit/pyaesa), an open-source Python package
for conducting AESA studies.

## Built with

- [React 19](https://react.dev/): all rendering; every chart is JSX
- [D3 7](https://d3js.org/): maths only — scales, shapes, projections, interpolation; it never touches the DOM
- [Motion](https://motion.dev/): the scroll-driven and enter/exit animation
- [react-globe.gl + three.js](https://github.com/vasturiano/react-globe.gl): the WebGL globe that opens the piece
- [Vite](https://vite.dev/): dev server and build, deployed to GitHub Pages via GitHub Actions
- [Python + Jupyter](https://jupyter.org/): the data pipeline, with pandas, sdmx1 for the Pacific Data Hub, and pyaesa for the allocation maths

D3 computes, React draws — the architectural rule, and the banned modules, are
in [CLAUDE.md](CLAUDE.md).

## Data

Every dataset that reaches the published piece.

**Pacific Data Hub: SPC .Stat (SDMX)**

- [Climate Change indicators (DF_CLIMATE_CHANGE)](https://stats.pacificdata.org/vis?lc=en&df%5Bds%5D=ds:SPC2&df%5Bid%5D=DF_CLIMATE_CHANGE&df%5Bag%5D=SPC): GHG emissions per capita for the Pacific islands, the Pacific end of the fair-share maths
- [SDG Goal 11 (DF_SDG_11)](https://stats.pacificdata.org/vis?lc=en&df%5Bds%5D=ds:SPC2&df%5Bid%5D=DF_SDG_11&df%5Bag%5D=SPC): disaster loss as a share of GDP (SDG 11.5.2) for 12 Pacific islands
- [Energy indicators (DF_ENERGY)](https://stats.pacificdata.org/vis?lc=en&df%5Bds%5D=ds:SPC2&df%5Bid%5D=DF_ENERGY&df%5Bag%5D=SPC): installed capacity, electricity generated, fuel imports and primary energy (Palau's outlier family)
- [Tourist arrivals (DF_TOURISM_ARRIVALS)](https://stats.pacificdata.org/vis?lc=en&df%5Bds%5D=ds:SPC2&df%5Bid%5D=DF_TOURISM_ARRIVALS&df%5Bag%5D=SPC): visitor arrivals, Palau's 5.3 visitors per resident, the ruled-out hypothesis
- [Population projections (DF_POP_PROJ)](https://stats.pacificdata.org/vis?lc=en&df%5Bds%5D=ds:SPC2&df%5Bid%5D=DF_POP_PROJ&df%5Bag%5D=SPC): mid-year population estimates, the denominator of every per-resident figure
- [Solid waste (DF_WASTE)](https://stats.pacificdata.org/vis?lc=en&df%5Bds%5D=ds:SPC2&df%5Bid%5D=DF_WASTE&df%5Bag%5D=SPC): municipal solid waste per person per day
- [Fisheries NMDI (DF_NMDI_FIS)](https://stats.pacificdata.org/vis?lc=en&df%5Bds%5D=ds:SPC2&df%5Bid%5D=DF_NMDI_FIS&df%5Bag%5D=SPC): marine area protected as a share of territorial waters, Palau's counterpoint
- [World Development Indicators for the Pacific (DF_WBWDI)](https://stats.pacificdata.org/vis?lc=en&df%5Bds%5D=ds:SPC2&df%5Bid%5D=DF_WBWDI&df%5Bag%5D=SPC): energy intensity and forest cover (World Bank WDI republished by SPC for consistent Pacific coverage)

**Read directly**

- [Our World in Data: CO₂ and greenhouse gas emissions](https://github.com/owid/co2-data): total GHG emissions for every non-Pacific country (wrapping EDGAR and the Global Carbon Project)
- [ND-GAIN Country Index (University of Notre Dame)](https://gain.nd.edu/our-work/country-index/download-data/): climate exposure for 192 countries, the scatter's headline x axis
- [UN SDG Global Database, indicator 11.5.2](https://unstats.un.org/sdgs/dataportal): direct economic loss from disasters as a share of GDP (Sendai Framework), 149 countries
- World Bank fossil-fuel rents ([oil](https://data.worldbank.org/indicator/NY.GDP.PETR.RT.ZS) · [coal](https://data.worldbank.org/indicator/NY.GDP.COAL.RT.ZS) · [gas](https://data.worldbank.org/indicator/NY.GDP.NGAS.RT.ZS)): rents as a share of GDP, summed — who was paid for the overshoot

**Via pyaesa**

- [World Bank World Development Indicators](https://databank.worldbank.org/source/world-development-indicators): population and GDP (PPP) for every country, the denominators of the fair-share rules
- [Bjørn & Hauschild (2015)](https://doi.org/10.1007/s11367-015-0899-2): the 2 °C climate carrying capacity of 6.81 GtCO₂-eq/yr, the budget every fair-share rule divides

**Map and globe assets**

- [world-atlas 110m TopoJSON](https://github.com/topojson/world-atlas): country outlines, derived from Natural Earth (public domain)
- [NASA Blue Marble / Visible Earth](https://visibleearth.nasa.gov/): the colour and topography textures on the globe (public domain)

## Method

How the ratio is built, what each notebook does, the sources that did not make
the piece, the caveats, and the things that bite:
**[NOTES.md](NOTES.md)**. Long-form reasoning next to the constants it governs
lives in `config.py`.
