import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
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
    label: 'Who\'s best in class?',
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

function readActiveChartId() {
  if (sectionIsActive('asr')) return 'asr'
  if (sectionIsActive('allocation-map')) return 'allocation-map'
  if (sectionIsActive('palau')) return 'palau'
  if (sectionIsActive('pacific-vs-world')) return 'pacific-vs-world'
  if (sectionIsActive('ranking')) return 'ranking'
  if (sectionIsActive('allocation')) return 'allocation'
  if (sectionProgress('budget') > 0.42) return 'global-asr'
  if (sectionIsActive('budget')) return 'budget'
  return 'pacific-ghg'
}

function chartIndex(id) {
  const i = CHARTS.findIndex((c) => c.id === id)
  return i < 0 ? 0 : i
}

const ITEM_ENTER = {
  duration: 0.4,
  ease: [0.4, 0, 0.2, 1],
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
  const [activeId, setActiveId] = useState(() => readActiveChartId())
  /* Grows only — scrolling back must not hide a milestone already earned. */
  const [revealedCount, setRevealedCount] = useState(
    () => chartIndex(readActiveChartId()) + 1,
  )

  useEffect(() => subscribeOpeningGate(setVisible), [])

  useEffect(() => {
    const read = () => {
      const id = readActiveChartId()
      setActiveId((was) => (was === id ? was : id))
      const next = chartIndex(id) + 1
      setRevealedCount((n) => (next > n ? next : n))
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

  return { visible, activeId, revealedCount }
}

export function Timeline({
  visible,
  activeId,
  revealedCount = 1,
  frozen = false,
}) {
  const reduceMotion = useReducedMotion()
  const instant = !!reduceMotion
  const shown = CHARTS.slice(0, Math.max(1, Math.min(revealedCount, CHARTS.length)))
  /* Deep-link / refresh already past the first beat: paint the earned list
     without a stacked enter. Later beats still fade in. */
  const skipEnter = useRef(shown.length > 1)
  useEffect(() => {
    skipEnter.current = false
  }, [])

  /* Always mounted — the shell panel itself slides in. Remounting via
     AnimatePresence during the handoff competed with the globe for frames. */
  return (
    <nav
      className="chart-timeline"
      aria-label="Charts"
      aria-hidden={!visible}
    >
      <ol className="chart-timeline__list">
        {shown.map((chart, i) => {
          const active = chart.id === activeId
          return (
            <motion.li
              key={chart.id}
              className="chart-timeline__item"
              layout={!reduceMotion}
              initial={reduceMotion || skipEnter.current || i === 0 ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={ITEM_ENTER}
            >
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
            </motion.li>
          )
        })}
      </ol>
    </nav>
  )
}
