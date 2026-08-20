# Pacific Dataviz Challenge 2026

## Architecture rule: D3 = math, React = rendering

**This is non-negotiable.** Every chart in `pacific-app-2026/` computes with D3 and draws with React.

- **D3 does math only.** Scales, layouts, projections, path-string generators, interpolators, formatters. Numbers in, numbers (or a path `d` string) out.
- **React does all rendering.** Charts return JSX — `<svg>`, `<g>`, `<path>`, `<circle>`, `<rect>`, `<text>`. No D3 ever touches the DOM.

### Allowed D3 modules
`d3-scale`, `d3-array`, `d3-shape`, `d3-hierarchy`, `d3-geo`, `d3-force`, `d3-interpolate`, `d3-color`, `d3-scale-chromatic`, `d3-format`, `d3-time`, `d3-time-format`, `d3-delaunay`, `d3-sankey`, `d3-contour`, `d3-polygon`, `d3-random`, `d3-ease`

### Banned D3 modules
`d3-selection`, `d3-transition`, `d3-axis`, `d3-zoom`, `d3-brush`, `d3-drag`, `d3-fetch`

Never write `d3.select(...)`, `.append(...)`, `.attr(...)`, or `.data().enter()`.

### Consequences in practice
| Need | Do this | Not this |
|---|---|---|
| Axes | Map over `scale.ticks()` into JSX `<line>` / `<text>` | `d3.axisBottom()` |
| Animation | `react-spring`, or `d3-interpolate` driven by React state | `.transition()` |
| Zoom / pan / brush | React state + event handlers | `d3-zoom`, `d3-brush` |
| Data loading | `fetch` or a static import | `d3.csv()`, `d3.json()` |
| Shapes | `d3.line()(data)` → `<path d={result} />` | `.append('path')` |

Compute D3 values in the component body wrapped in `useMemo`, keyed on data + dimensions.

Most D3 examples online are written in the banned rendering style — **refactor them into JSX, don't copy them.**
Reference: https://www.react-graph-gallery.com/react-d3-dataviz-course

## Other project rules
- All data and tools must be **publicly available open data** (competition requirement).
- At least one official dataset from Pacific Data Hub .Stat Explorer (SPC SDMX) must be used.
- Full storytelling plan lives in `PLAN.md`.
