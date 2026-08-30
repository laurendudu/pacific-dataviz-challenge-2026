import { useEffect, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import {
  PACIFIC_ZOOM_PROGRESS,
  openingMorphDone,
  subscribeOpeningGate,
  getOpeningGate,
} from '../../scenes/GlobeScene'

/**
 * Charts that already have a real page on the site. Add a row when a new
 * beat lands — schema pies stay off this list until they are their own chart.
 */
export const CHARTS = [
  {
    id: 'pacific-ghg',
    label: 'The Pacific’s contribution to global GHG emissions',
    target: { type: 'globe', progress: PACIFIC_ZOOM_PROGRESS },
  },
  {
    id: 'budget',
    label: 'Global GHG emissions and budget',
    target: { type: 'hash', id: 'budget' },
  },
  {
    id: 'global-asr',
    label: 'Introducing Absolute Sustainability Ratios',
    target: { type: 'hash', id: 'budget', progress: 0.76 },
  },
  {
    id: 'allocation',
    label: 'Introducing allocation principles',
    target: { type: 'hash', id: 'allocation' },
  },
  {
    id: 'ranking',
    label: 'Ranking the Pacific and the world',
    target: { type: 'hash', id: 'ranking' },
  },
  {
    id: 'pacific-vs-world',
    label: 'Pacific vs the world',
    target: { type: 'hash', id: 'pacific-vs-world' },
  },
  {
    id: 'palau',
    label: 'The case of Palau',
    target: { type: 'hash', id: 'palau' },
  },
  {
    id: 'allocation-map',
    label: 'Allocation across the Pacific',
    target: { type: 'hash', id: 'allocation-map' },
  },
  {
    id: 'asr',
    label: 'A fair share',
    target: { type: 'hash', id: 'asr' },
  },
]

const BUDGET_ACTIVE_AT = 0.42

function sectionIsActive(id) {
  const el = document.getElementById(id)
  if (!el) return false
  return el.getBoundingClientRect().top < window.innerHeight * BUDGET_ACTIVE_AT
}

/** 0→1 through a pinned scene; 0 if the section is missing or not tall enough. */
function sectionProgress(id) {
  const el = document.getElementById(id)
  if (!el) return 0
  const travel = el.offsetHeight - window.innerHeight
  if (travel <= 0) return 0
  return Math.min(1, Math.max(0, -el.getBoundingClientRect().top / travel))
}

function scrollToGlobeProgress(progress, instant) {
  const globe = document.getElementById('globe')
  if (!globe) return
  const travel = globe.offsetHeight - window.innerHeight
  const top = globe.offsetTop + progress * Math.max(0, travel)
  window.scrollTo({ top, behavior: instant ? 'auto' : 'smooth' })
}

function scrollToSection(id, instant, progress) {
  if (progress != null) {
    const el = document.getElementById(id)
    if (!el) return
    const travel = Math.max(0, el.offsetHeight - window.innerHeight)
    window.scrollTo({
      top: el.offsetTop + progress * travel,
      behavior: instant ? 'auto' : 'smooth',
    })
    return
  }
  document.getElementById(id)?.scrollIntoView({
    behavior: instant ? 'auto' : 'smooth',
    block: 'start',
  })
}

function goToChart(chart, { frozen, instant }) {
  if (frozen) {
    const url = new URL(window.location.href)
    if (chart.target.type === 'globe') {
      url.searchParams.set('p', String(chart.target.progress))
      url.hash = ''
    } else {
      url.searchParams.delete('p')
      url.hash = chart.target.id
    }
    window.location.assign(url.toString())
    return
  }

  if (chart.target.type === 'hash') {
    scrollToSection(chart.target.id, instant, chart.target.progress)
    return
  }
  scrollToGlobeProgress(chart.target.progress, instant)
}

/** Drives the shell column: open after the damped photoreal→schematic morph. */
export function useChartTimeline({ globeProgress = null, frozen = false } = {}) {
  const [visible, setVisible] = useState(
    () => getOpeningGate() || (globeProgress != null && openingMorphDone(globeProgress)),
  )
  const [activeId, setActiveId] = useState(CHARTS[0].id)

  useEffect(() => subscribeOpeningGate(setVisible), [])

  useEffect(() => {
    const read = () => {
      setActiveId(
        sectionIsActive('asr') ? 'asr'
          : sectionIsActive('allocation-map') ? 'allocation-map'
          : sectionIsActive('palau') ? 'palau'
          : sectionIsActive('pacific-vs-world') ? 'pacific-vs-world'
          : sectionIsActive('ranking') ? 'ranking'
          : sectionIsActive('allocation') ? 'allocation'
            : sectionProgress('budget') > 0.42 ? 'global-asr'
              : sectionIsActive('budget') ? 'budget'
                : 'pacific-ghg',
      )
    }

    if (frozen) {
      read()
      return
    }

    let frame = 0
    const onScroll = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        read()
      })
    }

    read()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [frozen])

  return { visible, activeId }
}

export function Timeline({ visible, activeId, frozen = false }) {
  const reduceMotion = useReducedMotion()
  const instant = !!reduceMotion

  /* Always mounted — the shell panel itself slides in. Remounting via
     AnimatePresence during the handoff competed with the globe for frames. */
  return (
    <nav
      className="chart-timeline"
      aria-label="Charts"
      aria-hidden={!visible}
    >
      <ol className="chart-timeline__list">
        {CHARTS.map((chart) => {
          const active = chart.id === activeId
          return (
            <li key={chart.id} className="chart-timeline__item">
              <button
                type="button"
                className={`chart-timeline__btn${active ? ' is-active' : ''}`}
                aria-current={active ? 'step' : undefined}
                tabIndex={visible ? 0 : -1}
                onClick={() => goToChart(chart, { frozen, instant })}
              >
                <span className="chart-timeline__dot" aria-hidden="true" />
                <span className="chart-timeline__label">{chart.label}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
