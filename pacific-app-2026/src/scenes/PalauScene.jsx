import { Scene } from '../components/scroll/Scene'
import { DotDistribution } from '../components/chart/DotDistribution'
import { IndexedLines } from '../components/chart/IndexedLines'
import { usePalauCase, TEST_YEARS } from '../data/palau'

/**
 * The case of Palau — three hypotheses for the highest ASR in the project,
 * each with the evidence that tests it. Two survive as description, one is
 * ruled out as a cause; the piece says so rather than picking the tidy story.
 *
 * Cards appear in turn with scroll progress and stay, so the reader ends up
 * looking at the whole case file at once.
 */

const STEPS = [0.04, 0.3, 0.56, 0.82]

export function PalauScene() {
  return (
    <Scene id="palau" pages={4}>
      {(progress) => <PalauCase progress={progress} />}
    </Scene>
  )
}

function PalauCase({ progress }) {
  const { headline, visitors, power, test, loading, error } = usePalauCase()
  const shown = STEPS.map((t) => progress >= t)

  return (
    <div className="palau">
      <header className="palau__head">
        <p className="palau__eyebrow">The case of Palau</p>
        <h2 className="palau__title">
          {headline ? formatCount(headline.population) : '—'} people.{' '}
          <em>{headline ? `${Math.round(headline.asr)}×` : '—'}</em> a fair share
          of the carbon budget.
        </h2>
        <p className="palau__lede">
          The highest ratio in this story, by a distance — Fiji, the next
          Pacific country, sits at 3.4. Three explanations suggest themselves.
          Two of them hold.
        </p>
      </header>

      {error ? (
        <p className="palau__status">The Palau evidence files are unavailable.</p>
      ) : null}
      {loading ? <p className="palau__status">Loading the case…</p> : null}

      {visitors && power && test ? (
        <div className="palau__cards">
          <Hypothesis
            shown={shown[0]}
            n="Hypothesis 1"
            claim="It is the visitors"
            body={`Palau hosts several times its own population every year. If arrivals
                   carried the emissions, this is where they would come from.`}
            verdict="consistent"
            verdictLabel="Consistent — but see the test"
            figure={
              <DotDistribution
                values={visitors.values}
                subject={visitors.palau}
                subjectLabel="Palau"
                others={visitors.pacific}
                median={visitors.median}
                ticks={[0.01, 0.1, 1, 10, 100]}
                tickFormat={formatRatio}
                axisLabel="tourist arrivals per resident, 2019"
                title="Tourist arrivals per resident, every country, 2019"
                desc={`Palau at ${formatRatio(visitors.palau)} arrivals per resident, rank
                       ${visitors.rank} of ${visitors.count}.`}
              />
            }
            evidence={
              <>
                <strong>{formatRatio(visitors.palau)}</strong> arrivals per resident —{' '}
                {ordinal(visitors.rank)} of {visitors.count} countries, and{' '}
                {Math.round(visitors.palau / visitors.median)}× the world median.
              </>
            }
          />

          <Hypothesis
            shown={shown[1]}
            n="Hypothesis 2"
            claim="It is the diesel"
            body={`Two diesel power stations run an island whose grid, water and
                   airport are sized for far more people than live on it.`}
            verdict="supported"
            verdictLabel="Supported"
            figure={
              <DotDistribution
                values={power.values}
                subject={power.palau}
                subjectLabel="Palau"
                others={power.pacific}
                median={power.median}
                ticks={[10, 100, 1000, 10000]}
                tickFormat={formatKwh}
                axisLabel="kWh generated per resident, 2023"
                title="Electricity generated per resident, every country, 2023"
                desc={`Palau at ${formatKwh(power.palau)} kWh per resident against a world
                       median of ${formatKwh(power.median)}.`}
              />
            }
            evidence={
              <>
                <strong>{formatKwh(power.palau)} kWh</strong> per resident,{' '}
                {(power.palau / power.median).toFixed(1)}× the world median — and{' '}
                <strong>{Math.round(power.oilShare)}% oil-fired</strong> against a world
                median of {Math.round(power.oilMedian)}%.
              </>
            }
          />

          <Hypothesis
            shown={shown[2]}
            n="The test"
            claim="Then the visitors stopped"
            body={`COVID closed the borders. If tourism drove the emissions, a 96%
                   collapse in arrivals had to pull them down with it.`}
            verdict="refuted"
            verdictLabel="Rules out visitors as the direct cause"
            figure={
              <IndexedLines
                series={test.series}
                years={TEST_YEARS}
                baseYear={test.baseYear}
                title="Arrivals, emissions and electricity, indexed to 2019 = 100"
                desc={`Arrivals fall to ${Math.round(test.arrivalsLow)} while emissions
                       reach ${Math.round(test.emissionsEnd.value)} and generation
                       ${Math.round(test.generationEnd.value)}.`}
              />
            }
            evidence={
              <>
                Arrivals fell to <strong>{Math.round(test.arrivalsLow)}</strong> on the
                index. Emissions went <strong>up</strong>, to{' '}
                {Math.round(test.emissionsEnd.value)} by {test.emissionsEnd.year};
                generation barely moved. Over the whole window the two correlate at{' '}
                <strong>+0.02</strong>.
              </>
            }
          />
        </div>
      ) : null}

      <footer className={`palau__close${shown[3] ? ' is-shown' : ''}`}>
        <p>
          So the honest reading is structural, not causal. Palau runs an
          energy system sized for the people who visit, and the emissions are
          divided by the people who stay. Tourism explains why the
          infrastructure is that big — it is not what the meter is measuring.
        </p>
        <p className="palau__source">
          Arrivals and generation: Pacific Data Hub .Stat (SPC), <code>DF_TOURISM_ARRIVALS</code>,{' '}
          <code>DF_OVERSEAS_VISITORS</code>, <code>DF_POWER_GEN</code>. World distributions:
          World Bank and Our World in Data. Emissions: SPC GHG per capita, the same series
          behind every ASR here — EDGAR puts Palau in the same range, Our World in Data
          roughly a fifth of it.
        </p>
      </footer>
    </div>
  )
}

function Hypothesis({ shown, n, claim, body, figure, evidence, verdict, verdictLabel }) {
  return (
    <article className={`palau-card${shown ? ' is-shown' : ''}`}>
      <p className="palau-card__n">{n}</p>
      <h3 className="palau-card__claim">{claim}</h3>
      <p className="palau-card__body">{body}</p>
      <div className="palau-card__figure">{shown ? figure : null}</div>
      <p className="palau-card__evidence">{evidence}</p>
      <p className={`palau-verdict palau-verdict--${verdict}`}>
        <span className="palau-verdict__mark" aria-hidden="true">
          {verdict === 'supported' ? '✓' : verdict === 'refuted' ? '✕' : '~'}
        </span>
        {verdictLabel}
      </p>
    </article>
  )
}

const formatCount = (v) => v.toLocaleString('en-GB')
const formatRatio = (v) => (v >= 10 ? v.toFixed(0) : v >= 1 ? v.toFixed(1) : v.toFixed(2))
const formatKwh = (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(Math.round(v)))

function ordinal(n) {
  const rest = n % 100
  if (rest >= 11 && rest <= 13) return `${n}th`
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
}
