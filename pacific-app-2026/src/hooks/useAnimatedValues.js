import { useEffect, useRef, useState } from 'react'
import { animate, motionValue } from 'motion/react'

const EASE = [0.4, 0, 0.2, 1]

/**
 * Ease every number in `targets` toward its new value when the object
 * identity changes (pass a stable per-beat record).
 */
export function useAnimatedValues(targets, { duration = 0.7, reduceMotion = false } = {}) {
  const keysRef = useRef(Object.keys(targets))
  const keys = keysRef.current
  const mvs = useRef(null)
  if (!mvs.current) {
    mvs.current = Object.fromEntries(keys.map((k) => [k, motionValue(targets[k])]))
  }

  const [values, setValues] = useState(targets)

  useEffect(() => {
    const apply = () => {
      const next = {}
      for (const k of keys) next[k] = mvs.current[k].get()
      setValues(next)
    }
    const offs = keys.map((k) => mvs.current[k].on('change', apply))
    return () => {
      for (const off of offs) off()
    }
  }, [keys])

  useEffect(() => {
    if (reduceMotion) {
      for (const k of keys) mvs.current[k].set(targets[k])
      setValues({ ...targets })
      return
    }
    const controls = keys.map((k) =>
      animate(mvs.current[k], targets[k], { duration, ease: EASE }),
    )
    return () => {
      for (const c of controls) c.stop()
    }
  }, [targets, duration, reduceMotion, keys])

  return values
}
