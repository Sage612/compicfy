import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

// ── Genre colour map ──────────────────────────────────────────────
const GENRE_COLORS: Record<string, string> = {
  Action:          '#ef4444',
  Adventure:       '#f97316',
  Comedy:          '#eab308',
  Drama:           '#ea580c',
  Fantasy:         '#3b82f6',
  Horror:          '#6b7280',
  Mystery:         '#64748b',
  Romance:         '#ec4899',
  'Sci-Fi':        '#06b6d4',
  'Slice of Life': '#10b981',
  Sports:          '#f59e0b',
  Supernatural:    '#a855f7',
  Thriller:        '#dc2626',
  Isekai:          '#6366f1',
  'Martial Arts':  '#e11d48',
  'School Life':   '#0ea5e9',
  Historical:      '#78716c',
  Psychological:   '#d946ef',
  Shounen:         '#3b82f6',
  Shoujo:          '#f472b6',
  Seinen:          '#71717a',
  Josei:           '#fb7185',
  Yuri:            '#c084fc',
  Yaoi:            '#818cf8',
  Mecha:           '#14b8a6',
}

const DEFAULT_COLOR = '#3b82f6'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const username    = searchParams.get('username')    ?? 'user'
  const displayName = searchParams.get('name')        ?? username
  const genresParam = searchParams.get('genres')      ?? ''
  const avatar      = searchParams.get('avatar')      ?? null

  // Parse genres — format: "Action:40,Fantasy:30,Romance:20,Comedy:10"
  const genreEntries = genresParam
    .split(',')
    .map(g => {
      const [name, pct] = g.split(':')
      return { name: decodeURIComponent(name ?? ''), pct: parseInt(pct ?? '0') }
    })
    .filter(g => g.name && g.pct > 0)
    .slice(0, 6)  // max 6 genres shown

  const total = genreEntries.reduce((s, g) => s + g.pct, 0)

  // Normalise so they add to 100
  const genres = genreEntries.map(g => ({
    ...g,
    pct: Math.round((g.pct / total) * 100),
    color: GENRE_COLORS[g.name] ?? DEFAULT_COLOR,
  }))

  return new ImageResponse(
    (
      <div
        style={{
          width:           '1200px',
          height:          '630px',
          display:         'flex',
          flexDirection:   'column',
          backgroundColor: '#0a0a0f',
          position:        'relative',
          overflow:        'hidden',
          fontFamily:      'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Background glow */}
        <div style={{
          position:     'absolute',
          top:          '-150px',
          left:         '-100px',
          width:        '600px',
          height:       '600px',
          borderRadius: '50%',
          background:   'radial-gradient(ellipse, #3b82f618 0%, transparent 70%)',
          filter:       'blur(80px)',
          display:      'flex',
        }} />
        <div style={{
          position:     'absolute',
          bottom:       '-100px',
          right:        '-100px',
          width:        '500px',
          height:       '500px',
          borderRadius: '50%',
          background:   'radial-gradient(ellipse, #ec489918 0%, transparent 70%)',
          filter:       'blur(80px)',
          display:      'flex',
        }} />

        {/* Top accent bar — multicolour from genres */}
        <div style={{
          position: 'absolute',
          top:      0,
          left:     0,
          right:    0,
          height:   '4px',
          display:  'flex',
        }}>
          {genres.map((g, i) => (
            <div key={i} style={{
              flex:       g.pct,
              background: g.color,
              display:    'flex',
            }} />
          ))}
        </div>

        {/* Main content */}
        <div style={{
          display:        'flex',
          flex:           1,
          flexDirection:  'column',
          padding:        '60px 80px',
          gap:            '40px',
          justifyContent: 'center',
        }}>

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>

            {/* User info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {avatar && (
                <div style={{
                  width:        '72px',
                  height:       '72px',
                  borderRadius: '50%',
                  overflow:     'hidden',
                  border:       '3px solid rgba(255,255,255,0.15)',
                  display:      'flex',
                  flexShrink:   0,
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ fontSize: '28px', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.5px', display: 'flex' }}>
                  {displayName}
                </div>
                <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.40)', display: 'flex' }}>
                  @{username} on ComPicfy
                </div>
              </div>
            </div>

            {/* DNA label */}
            <div style={{
              display:        'flex',
              flexDirection:  'column',
              alignItems:     'flex-end',
              gap:            '4px',
            }}>
              <div style={{
                fontSize:      '13px',
                fontWeight:    800,
                color:         'rgba(255,255,255,0.30)',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                display:       'flex',
              }}>
                Manga DNA
              </div>
              <div style={{
                fontSize:      '11px',
                color:         'rgba(255,255,255,0.20)',
                display:       'flex',
              }}>
                compicfy.com
              </div>
            </div>
          </div>

          {/* Genre bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {genres.map((g, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>

                {/* Genre name */}
                <div style={{
                  width:      '140px',
                  fontSize:   '17px',
                  fontWeight: 700,
                  color:      'rgba(255,255,255,0.80)',
                  flexShrink: 0,
                  display:    'flex',
                }}>
                  {g.name}
                </div>

                {/* Bar track */}
                <div style={{
                  flex:         1,
                  height:       '24px',
                  borderRadius: '12px',
                  background:   'rgba(255,255,255,0.06)',
                  position:     'relative',
                  overflow:     'hidden',
                  display:      'flex',
                }}>
                  {/* Fill */}
                  <div style={{
                    width:        `${g.pct}%`,
                    height:       '100%',
                    borderRadius: '12px',
                    background:   `linear-gradient(90deg, ${g.color}cc, ${g.color})`,
                    display:      'flex',
                    boxShadow:    `0 0 20px ${g.color}66`,
                  }} />
                </div>

                {/* Percentage */}
                <div style={{
                  width:      '52px',
                  fontSize:   '20px',
                  fontWeight: 900,
                  color:      g.color,
                  textAlign:  'right',
                  flexShrink: 0,
                  display:    'flex',
                  justifyContent: 'flex-end',
                }}>
                  {g.pct}%
                </div>
              </div>
            ))}
          </div>

          {/* Bottom tagline */}
          <div style={{
            display:    'flex',
            alignItems: 'center',
            gap:        '10px',
            marginTop:  'auto',
          }}>
            <div style={{
              fontSize:      '14px',
              color:         'rgba(255,255,255,0.25)',
              letterSpacing: '0.5px',
              display:       'flex',
            }}>
              What's your manga DNA? Find out on ComPicfy →
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
