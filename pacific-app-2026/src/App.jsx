import { GlobeScene, Globe } from './scenes/GlobeScene'

/**
 * `?p=0.45` freezes the scene at that scroll progress and renders it
 * full-viewport with no pinning — handy for eyeballing a single beat while
 * tuning the choreography. The normal site is the no-query path.
 */
export default function App() {
  const frozen = new URLSearchParams(window.location.search).get('p')

  if (frozen !== null) {
    return (
      <main style={{ height: '100svh' }}>
        <Globe progress={Number(frozen)} />
      </main>
    )
  }

  return (
    <main>
      <GlobeScene />
    </main>
  )
}
