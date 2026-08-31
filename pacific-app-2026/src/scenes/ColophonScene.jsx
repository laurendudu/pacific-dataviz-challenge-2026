/**
 * The last screen: who made it, what it was made from, where the code lives.
 *
 * Not a pinned scene — the reader has finished, and a colophon that fights
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

/**
 * Every source that reaches the published piece, and what it carries.
 * Mirrors the ✅ rows of the README's "Data sources" tables.
 */
const DATA_SOURCES = [
  {
    name: 'Pacific Data Hub .Stat Explorer (SPC)',
    url: 'https://stats.pacificdata.org/',
    use: 'every Pacific series — GHG emissions per capita, disaster losses, energy, tourism, population, waste and marine protection, including all of Palau’s profile',
  },
  {
    name: 'Our World in Data — CO₂ and greenhouse gas emissions',
    url: 'https://github.com/owid/co2-data',
    use: 'total GHG emissions for every non-Pacific country (wrapping EDGAR and the Global Carbon Project) — the world side of the ranking and the overshoot maths',
  },
  {
    name: 'ND-GAIN Country Index (University of Notre Dame)',
    url: 'https://gain.nd.edu/our-work/country-index/',
    use: 'climate exposure for 192 countries — the scatter’s headline x axis',
  },
  {
    name: 'UN SDG Global Database',
    url: 'https://unstats.un.org/sdgs/dataportal',
    use: 'direct economic loss from disasters as a share of GDP (SDG 11.5.2, Sendai Framework) — the second scatter axis',
  },
  {
    name: 'World Bank Indicators API',
    url: 'https://data.worldbank.org/',
    use: 'oil, coal and gas rents as a share of GDP — who was paid for the overshoot — plus the population and GDP behind the fair-share rules',
  },
  {
    name: 'Bjørn & Hauschild (2015)',
    url: 'https://doi.org/10.1007/s11367-015-0899-2',
    use: 'the 2 °C climate carrying capacity of 6.81 GtCO₂-eq/yr — the budget every fair-share rule divides',
  },
  {
    name: 'world-atlas / Natural Earth',
    url: 'https://github.com/topojson/world-atlas',
    use: 'country outlines for the map and the globe (public domain)',
  },
  {
    name: 'NASA Visible Earth',
    url: 'https://visibleearth.nasa.gov/',
    use: 'the Blue Marble colour and topography textures on the globe (public domain)',
  },
]

/** The stack, both halves: the app the reader is in and the pipeline behind it. */
const BUILT_WITH = [
  {
    name: 'React 19',
    url: 'https://react.dev/',
    use: 'all rendering — every chart is JSX',
  },
  {
    name: 'D3 7',
    url: 'https://d3js.org/',
    use: 'maths only — scales, shapes, projections, interpolation; it never touches the DOM',
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
    use: 'the data pipeline — pandas, sdmx1 for the Pacific Data Hub, and pyaesa for the allocation maths',
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
            <dt>Data</dt>
            <dd>
              <ul className="colophon__sources">
                {DATA_SOURCES.map((s) => (
                  <li key={s.name}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.name}
                    </a>{' '}
                    — {s.use}
                  </li>
                ))}
              </ul>
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
                    </a>{' '}
                    — {t.use}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>
      </div>
    </section>
  )
}
