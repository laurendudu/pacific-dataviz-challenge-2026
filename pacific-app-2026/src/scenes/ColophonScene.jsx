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

export function ColophonScene() {
  return (
    <section className="colophon" id="colophon">
      <div className="colophon__inner">
        <p className="colophon__eyebrow">Colophon</p>
        <h2 className="colophon__title">Made in the open, from open data.</h2>

        <p className="colophon__lede">
          Every figure on this page comes from a public dataset, and every step
          between the download and the drawing is in the repository — the
          notebooks that fetch and compute, and the app that renders.
        </p>

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
            <dt>Data</dt>
            <dd>
              Pacific Data Hub .Stat (SPC), Global Carbon Budget, World Bank
              WDI, UN World Population Prospects
            </dd>
          </div>
          <div>
            <dt>Built with</dt>
            <dd>React, D3 for the maths, Motion for the scroll</dd>
          </div>
        </dl>

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

        <p className="colophon__fine">
          The datasets keep the licences of their publishers; see the
          repository for the full source list.
        </p>
      </div>
    </section>
  )
}
