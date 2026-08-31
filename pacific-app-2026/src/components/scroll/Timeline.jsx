import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import {
  PACIFIC_ZOOM_PROGRESS,
  openingMorphDone,
  subscribeOpeningGate,
  getOpeningGate,
} from '../../scenes/GlobeScene'
import { SWARM_ASR_BEAT, SWARM_BEAT_COUNT } from '../../scenes/SwarmScene'

/**
 * Charts that already have a real page on the site. Add a row when a new
 * beat lands. Schema pies stay off this list until they are their own chart.
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
    /* Beat 0 is the two swarms; later beats are the ASR item below. */
    target: { type: 'hash', id: 'budget', beat: 0 },
  },
  {
    id: 'global-asr',
    label: 'Introducing Absolute Sustainability Ratios',
    target: { type: 'hash', id: 'budget', beat: SWARM_BEAT_COUNT - 1 },
  },
  {
    id: 'asr-viz',
    label: 'Visualizing Absolute Sustainability Ratios',
    target: { type: 'hash', id: 'asr-viz' },
  },
  {
    id: 'allocation',
    label: 'Allocating the budget to the Pacific',
    target: { type: 'hash', id: 'allocation' },
  },
  {
    id: 'ranking',
    label: 'Who gets a fair share?',
    target: { type: 'hash', id: 'ranking' },
  },
  {
    id: 'pacific-vs-world',
    label: 'Redistributing the responsibility',
    target: { type: 'hash', id: 'pacific-vs-world' },
  },
  {
    id: 'palau',
    label: 'The case of Palau',
    target: { type: 'hash', id: 'palau' },
  },
  {
    id: 'credits',
    label: 'Credits',
    target: { type: 'hash', id: 'colophon', progress: 0 },
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

function scrollToSection(id, instant, { progress, beat } = {}) {
  const el = document.getElementById(id)
  if (!el) return
  const origin = el.getBoundingClientRect().top + window.scrollY
  if (beat != null) {
    window.scrollTo({
      top: origin + beat * window.innerHeight,
      behavior: instant ? 'auto' : 'smooth',
    })
    return
  }
  /* Default: last pinned frame, so toggles / final layout are already on. */
  const travel = Math.max(0, el.offsetHeight - window.innerHeight)
  const t = progress != null ? progress : 1
  window.scrollTo({
    top: origin + t * travel,
    behavior: instant ? 'auto' : 'smooth',
  })
}

function readActiveChartId() {
  if (sectionIsActive('colophon')) return 'credits'
  if (sectionIsActive('palau')) return 'palau'
  if (sectionIsActive('pacific-vs-world')) return 'pacific-vs-world'
  if (sectionIsActive('ranking')) return 'ranking'
  if (sectionIsActive('allocation')) return 'allocation'
  if (sectionIsActive('asr-viz')) return 'asr-viz'
  if (sectionProgress('budget') > (SWARM_ASR_BEAT - 0.15) / Math.max(1, SWARM_BEAT_COUNT - 1)) {
    return 'global-asr'
  }
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
    scrollToSection(chart.target.id, instant, {
      progress: chart.target.progress,
      beat: chart.target.beat,
    })
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
  /* Grows only: scrolling back must not hide a milestone already earned. */
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
  const shown = CHARTS.slice(0, Math.max(1, Math.min(revealedCount, CHARTS.length)))
  /* Deep-link / refresh already past the first beat: paint the earned list
     without a stacked enter. Later beats still fade in. */
  const skipEnter = useRef(shown.length > 1)
  useEffect(() => {
    skipEnter.current = false
  }, [])

  /* Always mounted: the shell panel itself slides in. Remounting via
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
                onClick={() => goToChart(chart, { frozen, instant: true })}
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
