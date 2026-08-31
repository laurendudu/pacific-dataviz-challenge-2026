/**
 * The last screen: who made it, what it was made from, where the code lives.
 *
 * Not a pinned scene: the reader has finished, and a colophon that fights
 * the scroll is a colophon nobody reaches the bottom of.
 */

const SITE_URL = 'https://laurendudu.github.io/pacific-dataviz-challenge-2026/'
const REPO_URL = 'https://github.com/laurendudu/pacific-dataviz-challenge-2026'
const AUTHOR = 'Lauren Durivault'
const AUTHOR_URL = 'https://github.com/laurendudu'

/**
 * LinkedIn's share-offsite endpoint takes the page URL and reads the rest
 * (title, description, image) from that page's own Open Graph tags, so there
 * is nothing to pass but the link itself.
 */
const LINKEDIN_URL = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SITE_URL)}`

const PYAESA_URL = 'https://github.com/AESAtoolkit/pyaesa'

/** A Pacific Data Hub .Stat Explorer link for one SPC dataflow. */
const pdh = (id) =>
  `https://stats.pacificdata.org/vis?lc=en&df[ds]=ds:SPC2&df[id]=${id}&df[ag]=SPC`

/**
 * Every dataset that reaches the published piece, linked to the dataset
 * itself rather than its platform's home page. Mirrors the ✅ rows of
 * NOTES.md's "Data sources" tables. An item may carry several links when the
 * "dataset" is really a set of sibling series (the World Bank rents).
 */
const DATA_GROUPS = [
  {
    title: 'Pacific Data Hub: SPC .Stat (SDMX)',
    items: [
      {
        links: [{ label: 'Climate Change indicators (DF_CLIMATE_CHANGE)', url: pdh('DF_CLIMATE_CHANGE') }],
        use: 'GHG emissions per capita for the Pacific islands, the Pacific end of the fair-share maths',
      },
      {
        links: [{ label: 'SDG Goal 11 (DF_SDG_11)', url: pdh('DF_SDG_11') }],
        use: 'disaster loss as a share of GDP (SDG 11.5.2) for 12 Pacific islands',
      },
      {
        links: [{ label: 'Energy indicators (DF_ENERGY)', url: pdh('DF_ENERGY') }],
        use: 'installed capacity, electricity generated and primary energy (Palau’s outlier family)',
      },
      {
        links: [{ label: 'Tourist arrivals (DF_TOURISM_ARRIVALS)', url: pdh('DF_TOURISM_ARRIVALS') }],
        use: 'visitor arrivals: Palau’s 5.3 visitors per resident, the ruled-out hypothesis',
      },
      {
        links: [{ label: 'Population projections (DF_POP_PROJ)', url: pdh('DF_POP_PROJ') }],
        use: 'mid-year population estimates, the denominator of every per-resident figure',
      },
      {
        links: [{ label: 'Solid waste (DF_WASTE)', url: pdh('DF_WASTE') }],
        use: 'municipal solid waste per person per day',
      },
      {
        links: [{ label: 'World Development Indicators for the Pacific (DF_WBWDI)', url: pdh('DF_WBWDI') }],
        use: 'energy intensity (World Bank WDI republished by SPC for consistent Pacific coverage)',
      },
    ],
  },
  {
    title: 'Additional sources',
    items: [
      {
        links: [{ label: 'Our World in Data: CO₂ and greenhouse gas emissions', url: 'https://github.com/owid/co2-data' }],
        use: 'total GHG emissions for every non-Pacific country (wrapping EDGAR and the Global Carbon Project)',
      },
      {
        links: [{ label: 'ND-GAIN Country Index (University of Notre Dame)', url: 'https://gain.nd.edu/our-work/country-index/download-data/' }],
        use: 'climate exposure for 192 countries, the scatter’s headline x axis',
      },
      {
        links: [{ label: 'UN SDG Global Database, indicator 11.5.2', url: 'https://unstats.un.org/sdgs/dataportal' }],
        use: 'direct economic loss from disasters as a share of GDP (Sendai Framework), 149 countries',
      },
      {
        prefix: 'World Bank fossil-fuel rents: ',
        links: [
          { label: 'oil', url: 'https://data.worldbank.org/indicator/NY.GDP.PETR.RT.ZS' },
          { label: 'coal', url: 'https://data.worldbank.org/indicator/NY.GDP.COAL.RT.ZS' },
          { label: 'gas', url: 'https://data.worldbank.org/indicator/NY.GDP.NGAS.RT.ZS' },
        ],
        use: 'rents as a share of GDP, summed: who was paid for the overshoot',
      },
    ],
  },
  {
    title: 'Accessed via pyaesa',
    items: [
      {
        links: [{ label: 'World Bank World Development Indicators', url: 'https://databank.worldbank.org/source/world-development-indicators' }],
        use: 'population and GDP (PPP) for every country, the denominators of the fair-share rules',
      },
      {
        links: [{ label: 'Bjørn & Hauschild (2015)', url: 'https://doi.org/10.1007/s11367-015-0899-2' }],
        use: 'the 2 °C climate carrying capacity of 6.81 GtCO₂-eq/yr, the budget every fair-share rule divides',
      },
    ],
  },
  {
    title: 'Map and globe assets',
    items: [
      {
        links: [{ label: 'world-atlas 110m TopoJSON', url: 'https://github.com/topojson/world-atlas' }],
        use: 'country outlines, derived from Natural Earth (public domain)',
      },
      {
        links: [{ label: 'NASA Blue Marble / Visible Earth', url: 'https://visibleearth.nasa.gov/' }],
        use: 'the colour and topography textures on the globe (public domain)',
      },
    ],
  },
]

/** The stack, both halves: the app the reader is in and the pipeline behind it. */
const BUILT_WITH = [
  {
    name: 'React 19',
    url: 'https://react.dev/',
    use: 'all rendering; every chart is JSX',
  },
  {
    name: 'D3 7',
    url: 'https://d3js.org/',
    use: 'maths only: scales, shapes, projections, interpolation; it never touches the DOM',
  },
  {
    name: 'Motion',
    url: 'https://motion.dev/',
    use: 'the scroll-driven and enter/exit animation',
  },
  {
    name: 'react-globe.gl + three.js',
    url: 'https://github.com/vasturiano/react-globe.gl',
    use: 'the WebGL globe that opens the piece',
  },
  {
    name: 'Vite',
    url: 'https://vite.dev/',
    use: 'dev server and build, deployed to GitHub Pages via GitHub Actions',
  },
  {
    name: 'Python + Jupyter',
    url: 'https://jupyter.org/',
    use: 'the data pipeline: pandas, sdmx1 for the Pacific Data Hub, and pyaesa for the allocation maths',
  },
]

export function ColophonScene() {
  return (
    <section className="colophon" id="colophon">
      <div className="colophon__inner">
        <h2 className="colophon__title">About this project</h2>

        <p className="colophon__lede">
         All data used in the project is publicly available.
        </p>

        <div className="colophon__actions">
          <a
            className="colophon__btn colophon__btn--primary"
            href={LINKEDIN_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Share on LinkedIn
          </a>
          <a
            className="colophon__btn"
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Source code on GitHub
          </a>
        </div>

        <dl className="colophon__meta">
          <div>
            <dt>Author</dt>
            <dd>
              <a href={AUTHOR_URL} target="_blank" rel="noopener noreferrer">
                {AUTHOR}
              </a>
            </dd>
          </div>
          <div>
            <dt>Entry</dt>
            <dd>Pacific Dataviz Challenge 2026</dd>
          </div>
          <div>
            <dt>Special mention</dt>
            <dd>
              The calculations follow the AESA (absolute environmental
              sustainability assessment) literature, computed with{' '}
              <a
                href={PYAESA_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                pyaesa
              </a>
              , an open-source Python package for conducting AESA studies.
            </dd>
          </div>
          <div>
            <dt>Built with</dt>
            <dd>
              <ul className="colophon__sources">
                {BUILT_WITH.map((t) => (
                  <li key={t.name}>
                    <a href={t.url} target="_blank" rel="noopener noreferrer">
                      {t.name}
                    </a>{': '}
                    {t.use}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt>Data</dt>
            <dd>
              {DATA_GROUPS.map((group) => (
                <div className="colophon__sourcegroup" key={group.title}>
                  <p className="colophon__sourcegroup-title">{group.title}</p>
                  <ul className="colophon__sources">
                    {group.items.map((item) => (
                      <li key={item.links[0].url}>
                        {item.prefix}
                        {item.links.map((link, i) => (
                          <span key={link.url}>
                            {i > 0 && ' · '}
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {link.label}
                            </a>
                          </span>
                        ))}{': '}
                        {item.use}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
