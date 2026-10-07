'use client'

// ── Genre → archetype bucketing ──────────────────────────────────────
// The mockup's "Comic DNA" radar uses 4 fixed axes (Dark Fantasy, System,
// Psychological, Romance) rather than raw genres. Real profiles have up
// to ~24 possible genres, so we bucket them into these 4 broad axes
// instead of introducing new DB fields — this is derived purely from
// the `genres` array MangaDNACard already receives.

const ARCHETYPE_MAP: Record<string, string[]> = {
  'Dark Fantasy': ['Fantasy', 'Horror', 'Supernatural', 'Thriller', 'Mystery', 'Historical'],
  'System':       ['Isekai', 'Action', 'Adventure', 'Sports', 'Martial Arts', 'Mecha', 'Sci-Fi'],
  'Psychological':['Psychological', 'Drama', 'Seinen', 'Thriller'],
  'Romance':      ['Romance', 'Shoujo', 'Josei', 'Yuri', 'Yaoi', 'Comedy', 'Slice of Life', 'School Life'],
}

const AXES = ['Dark Fantasy', 'System', 'Psychological', 'Romance'] as const

export interface ArchetypeScore {
  axis: typeof AXES[number]
  pct:  number
}

export function computeArchetypeScores(genres: string[]): ArchetypeScore[] {
  if (!genres.length) return AXES.map(axis => ({ axis, pct: 0 }))

  const raw = AXES.map(axis => {
    const bucket = ARCHETYPE_MAP[axis]
    const hits   = genres.filter(g => bucket.includes(g)).length
    return { axis, hits }
  })

  const total = raw.reduce((sum, r) => sum + r.hits, 0)
  if (total === 0) return AXES.map(axis => ({ axis, pct: 0 }))

  return raw.map(r => ({ axis: r.axis, pct: Math.round((r.hits / total) * 100) }))
}

interface RadarChartProps {
  scores: ArchetypeScore[]
  size?:  number
  color?: string
}

export function RadarChart({ scores, size = 260, color = '#f97316' }: RadarChartProps) {
  const center = size / 2
  const radius = size * 0.32
  const levels = 4 // grid rings

  const angleFor = (i: number) => (Math.PI * 2 * i) / scores.length - Math.PI / 2

  const pointFor = (i: number, valuePct: number) => {
    const angle = angleFor(i)
    const r = radius * (valuePct / 100)
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    }
  }

  const labelPointFor = (i: number) => {
    const angle = angleFor(i)
    const r = radius + 28
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    }
  }

  const dataPoints = scores.map((s, i) => pointFor(i, s.pct))
  const dataPath = dataPoints.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="auto" role="img" aria-label="Taste breakdown radar chart">
      {/* Background grid rings */}
      {Array.from({ length: levels }, (_, ringIdx) => {
        const ringPct = ((ringIdx + 1) / levels) * 100
        const ringPoints = scores.map((_, i) => pointFor(i, ringPct))
        const ringPath = ringPoints.map(p => `${p.x},${p.y}`).join(' ')
        return (
          <polygon
            key={ringIdx}
            points={ringPath}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.12}
            strokeWidth={1}
          />
        )
      })}

      {/* Axis lines */}
      {scores.map((_, i) => {
        const outer = pointFor(i, 100)
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={outer.x}
            y2={outer.y}
            stroke="currentColor"
            strokeOpacity={0.12}
            strokeWidth={1}
          />
        )
      })}

      {/* Data shape */}
      <polygon
        points={dataPath}
        fill={color}
        fillOpacity={0.25}
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill={color} />
      ))}

      {/* Axis labels */}
      {scores.map((s, i) => {
        const lp = labelPointFor(i)
        return (
          <text
            key={i}
            x={lp.x}
            y={lp.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={11}
            fontWeight={600}
            fill="currentColor"
            className="text-muted-foreground"
          >
            {s.axis}
          </text>
        )
      })}
    </svg>
  )
}