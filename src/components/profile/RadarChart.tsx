// Pure SVG radar chart: no dependencies, no client JS needed.
// Works with any number of axes from 3 up. Each point's distance from the
// centre is relative to the largest value, so the shape stays readable even
// when the top genre is only 40%. The real percentages are shown as labels.

export interface RadarPoint {
  axis: string
  pct:  number
}

// ── Fallback: favourite genres bucketed into 4 broad archetypes ─────────
// Only used when a profile has too little activity for a real genre profile.
// Each genre sits in exactly ONE bucket (the first version double-counted
// Thriller and ignored Shounen).
const ARCHETYPE_MAP: Record<string, string[]> = {
  'Dark Fantasy':  ['Fantasy', 'Horror', 'Supernatural', 'Mystery', 'Historical'],
  'Action':        ['Action', 'Adventure', 'Isekai', 'Martial Arts', 'Sports', 'Mecha', 'Sci-Fi', 'Shounen'],
  'Psychological': ['Psychological', 'Thriller', 'Drama', 'Seinen'],
  'Romance':       ['Romance', 'Shoujo', 'Josei', 'Yuri', 'Yaoi', 'Comedy', 'Slice of Life', 'School Life'],
}

export function computeArchetypeScores(genres: string[]): RadarPoint[] {
  const axes = Object.keys(ARCHETYPE_MAP)
  const raw = axes.map(axis => ({
    axis,
    hits: genres.filter(g => ARCHETYPE_MAP[axis].includes(g)).length,
  }))
  const total = raw.reduce((s, r) => s + r.hits, 0)
  if (total === 0) return []
  return raw.map(r => ({ axis: r.axis, pct: Math.round((r.hits / total) * 100) }))
}

// ── Chart ───────────────────────────────────────────────────────────────
const W = 400
const H = 300
const CX = W / 2
const CY = H / 2
const R = 95
const LEVELS = 4

function truncate(s: string, max = 14): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

interface Props {
  points?: RadarPoint[]
  /** Older name for `points`, still used by MangaDNACard. */
  scores?: RadarPoint[]
  color?:  string
  /** Optional max width in px (MangaDNACard passes one). */
  size?:   number
}

export function RadarChart({ points: pointsProp, scores, color = 'var(--color-primary)', size }: Props) {
  const points = pointsProp ?? scores ?? []
  if (points.length < 3) return null

  const n   = points.length
  const max = Math.max(...points.map(p => p.pct), 1)
  const ang = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2

  const at = (i: number, frac: number, radius = R) => ({
    x: CX + radius * frac * Math.cos(ang(i)),
    y: CY + radius * frac * Math.sin(ang(i)),
  })

  const data = points.map((p, i) => at(i, p.pct / max))
  const dataPath = data.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      style={size ? { maxWidth: size } : undefined}
      role="img"
      aria-label={`Taste radar: ${points.map(p => `${p.axis} ${p.pct}%`).join(', ')}`}
    >
      {/* Grid rings */}
      {Array.from({ length: LEVELS }, (_, k) => {
        const frac = (k + 1) / LEVELS
        const ring = points.map((_, i) => at(i, frac)).map(p => `${p.x},${p.y}`).join(' ')
        return (
          <polygon key={k} points={ring} fill="none" stroke="currentColor" strokeOpacity={0.12} strokeWidth={1} />
        )
      })}

      {/* Spokes */}
      {points.map((_, i) => {
        const o = at(i, 1)
        return <line key={i} x1={CX} y1={CY} x2={o.x} y2={o.y} stroke="currentColor" strokeOpacity={0.12} strokeWidth={1} />
      })}

      {/* Data shape */}
      <polygon
        points={dataPath}
        style={{ fill: color, stroke: color }}
        fillOpacity={0.25}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {data.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3.5} style={{ fill: color }} />
      ))}

      {/* Labels, anchored away from the chart so long names never clip */}
      {points.map((p, i) => {
        const c = Math.cos(ang(i))
        const s = Math.sin(ang(i))
        const l = at(i, 1, R + 14)
        const anchor = c > 0.25 ? 'start' : c < -0.25 ? 'end' : 'middle'
        const dy = s < -0.5 ? -6 : s > 0.5 ? 6 : 0
        return (
          <text
            key={i}
            x={l.x}
            y={l.y + dy}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize={12}
            fontWeight={600}
            fill="currentColor"
            fillOpacity={0.75}
          >
            {truncate(p.axis)}
          </text>
        )
      })}
    </svg>
  )
}