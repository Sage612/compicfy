import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const title       = searchParams.get('title')       ?? 'Find your next obsession.'
  const description = searchParams.get('description') ?? 'Community-powered comic discovery. Browse, recommend, and vote.'
  const cover       = searchParams.get('cover')       ?? null
  const type        = searchParams.get('type')        ?? null

  const typeColors: Record<string, string> = {
    manga:   '#f43f5e',
    manhwa:  '#0ea5b0',
    manhua:  '#f59e0b',
    webtoon: '#14b8a6',
    comic:   '#3b82f6',
  }
  const accentColor = type ? (typeColors[type] ?? '#3b82f6') : '#3b82f6'
  const shortDesc   = description.slice(0, 120) + (description.length > 120 ? '…' : '')

  return new ImageResponse(
    (
      <div
        style={{
          width:           '1200px',
          height:          '630px',
          display:         'flex',
          flexDirection:   'column',
          backgroundColor: '#0f0f11',
          position:        'relative',
          overflow:        'hidden',
          fontFamily:      'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Background glow top */}
        <div style={{
          position:     'absolute',
          top:          '-100px',
          left:         '50%',
          transform:    'translateX(-50%)',
          width:        '800px',
          height:       '400px',
          borderRadius: '50%',
          background:   `radial-gradient(ellipse, ${accentColor}22 0%, transparent 70%)`,
          filter:       'blur(60px)',
          display:      'flex',
        }} />

        {/* Background glow bottom-right */}
        <div style={{
          position:     'absolute',
          bottom:       '-80px',
          right:        '-80px',
          width:        '500px',
          height:       '400px',
          borderRadius: '50%',
          background:   'radial-gradient(ellipse, #f43f5e18 0%, transparent 70%)',
          filter:       'blur(60px)',
          display:      'flex',
        }} />

        {/* Top border accent */}
        <div style={{
          position:   'absolute',
          top:        0,
          left:       0,
          right:      0,
          height:     '3px',
          background: `linear-gradient(90deg, transparent, ${accentColor}, #f43f5e, transparent)`,
          display:    'flex',
        }} />

        {/* Main content row */}
        <div style={{
          display:     'flex',
          flex:        1,
          padding:     '60px',
          gap:         '60px',
          alignItems:  'center',
        }}>

          {/* Left — text column */}
          <div style={{
            display:       'flex',
            flexDirection: 'column',
            flex:          1,
            gap:           '24px',
          }}>

            {/* Logo row */}
            <div style={{
              display:    'flex',
              alignItems: 'center',
              gap:        '12px',
            }}>
              {/* Logo icon box */}
              <div style={{
                width:          '40px',
                height:         '40px',
                borderRadius:   '10px',
                background:     `linear-gradient(135deg, ${accentColor}, #3b82f6)`,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
              }}>
                {/* Three lines icon — no map, written out explicitly */}
                <div style={{
                  display:       'flex',
                  flexDirection: 'column',
                  gap:           '3px',
                  width:         '20px',
                  height:        '20px',
                  justifyContent: 'center',
                }}>
                  <div style={{ width: '20px', height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.9)', display: 'flex' }} />
                  <div style={{ width: '16px', height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.9)', display: 'flex' }} />
                  <div style={{ width: '12px', height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.9)', display: 'flex' }} />
                </div>
              </div>

              {/* Logo text */}
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{
                  fontSize:      '22px',
                  fontWeight:    900,
                  color:         '#ffffff',
                  letterSpacing: '-0.5px',
                }}>
                  Compic
                </span>
                <span style={{
                  fontSize:      '22px',
                  fontWeight:    900,
                  color:         accentColor,
                  letterSpacing: '-0.5px',
                }}>
                  fy
                </span>
              </div>
            </div>

            {/* Type badge — only rendered when type exists */}
            {type && (
              <div style={{
                display:       'flex',
                alignItems:    'center',
                padding:       '4px 12px',
                borderRadius:  '999px',
                background:    `${accentColor}22`,
                border:        `1px solid ${accentColor}44`,
                color:         accentColor,
                fontSize:      '13px',
                fontWeight:    700,
                textTransform: 'capitalize',
                width:         'fit-content',
              }}>
                {type}
              </div>
            )}

            {/* Title */}
            <div style={{
              display:       'flex',
              fontSize:      cover ? '42px' : '56px',
              fontWeight:    900,
              color:         '#ffffff',
              lineHeight:    1.1,
              letterSpacing: '-1px',
              maxWidth:      '640px',
            }}>
              {title}
            </div>

            {/* Description */}
            <div style={{
              display:    'flex',
              fontSize:   '20px',
              color:      'rgba(255,255,255,0.55)',
              lineHeight: 1.5,
              maxWidth:   '580px',
            }}>
              {shortDesc}
            </div>

            {/* Bottom tag */}
            <div style={{
              display:    'flex',
              alignItems: 'center',
              gap:        '8px',
              marginTop:  'auto',
            }}>
              <div style={{
                width:        '6px',
                height:       '6px',
                borderRadius: '50%',
                background:   accentColor,
                display:      'flex',
              }} />
              <span style={{
                fontSize:      '14px',
                color:         'rgba(255,255,255,0.35)',
                fontWeight:    600,
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}>
                compicfy.cloud
              </span>
            </div>
          </div>

          {/* Right — cover image (comic pages only) */}
          {cover && (
            <div style={{
              position:     'relative',
              width:        '220px',
              height:       '300px',
              borderRadius: '16px',
              overflow:     'hidden',
              flexShrink:   0,
              boxShadow:    `0 0 60px ${accentColor}44, 0 20px 60px rgba(0,0,0,0.6)`,
              border:       '1px solid rgba(255,255,255,0.1)',
              display:      'flex',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover}
                alt={title}
                style={{
                  width:     '100%',
                  height:    '100%',
                  objectFit: 'cover',
                }}
              />
              {/* Overlay gradient */}
              <div style={{
                position:   'absolute',
                inset:      0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)',
                display:    'flex',
              }} />
            </div>
          )}

          {/* Right — decorative stack (no cover / homepage OG) */}
          {!cover && (
            <div style={{
              display:       'flex',
              flexDirection: 'column',
              gap:           '12px',
              opacity:       0.4,
              transform:     'rotate(6deg)',
            }}>
              <div style={{ width: '180px', height: '8px', borderRadius: '4px', background: '#f43f5e', display: 'flex' }} />
              <div style={{ width: '160px', height: '8px', borderRadius: '4px', background: '#3b82f6', display: 'flex' }} />
              <div style={{ width: '140px', height: '8px', borderRadius: '4px', background: '#14b8a6', display: 'flex' }} />
              <div style={{ width: '120px', height: '8px', borderRadius: '4px', background: '#f59e0b', display: 'flex' }} />
            </div>
          )}

        </div>
      </div>
    ),
    {
      width:  1200,
      height: 630,
    }
  )
}
