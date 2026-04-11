import { ImageResponse } from 'next/og'
import type { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // Optional params so comic pages can pass their own title/cover
  const title       = searchParams.get('title')       ?? 'Find your next obsession.'
  const description = searchParams.get('description') ?? 'Community-powered comic discovery. Browse, recommend, and vote.'
  const cover       = searchParams.get('cover')       ?? null
  const type        = searchParams.get('type')        ?? null

  const typeColors: Record<string, string> = {
    manga:   '#f43f5e',
    manhwa:  '#8b5cf6',
    manhua:  '#f59e0b',
    webtoon: '#14b8a6',
    comic:   '#3b82f6',
  }
  const accentColor = type ? (typeColors[type] ?? '#7c3aed') : '#7c3aed'

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
        {/* Background glow blobs */}
        <div style={{
          position:        'absolute',
          top:             '-100px',
          left:            '50%',
          transform:       'translateX(-50%)',
          width:           '800px',
          height:          '400px',
          borderRadius:    '50%',
          background:      `radial-gradient(ellipse, ${accentColor}22 0%, transparent 70%)`,
          filter:          'blur(60px)',
        }} />
        <div style={{
          position:        'absolute',
          bottom:          '-80px',
          right:           '-80px',
          width:           '500px',
          height:          '400px',
          borderRadius:    '50%',
          background:      'radial-gradient(ellipse, #f43f5e18 0%, transparent 70%)',
          filter:          'blur(60px)',
        }} />

        {/* Top border accent */}
        <div style={{
          position:   'absolute',
          top:        0,
          left:       0,
          right:      0,
          height:     '3px',
          background: `linear-gradient(90deg, transparent, ${accentColor}, #f43f5e, transparent)`,
        }} />

        {/* Main content */}
        <div style={{
          display:        'flex',
          flex:           1,
          padding:        '60px',
          gap:            '60px',
          alignItems:     'center',
        }}>

          {/* Left — text */}
          <div style={{
            display:       'flex',
            flexDirection: 'column',
            flex:          1,
            gap:           '24px',
          }}>

            {/* Logo */}
            <div style={{
              display:        'flex',
              alignItems:     'center',
              gap:            '12px',
            }}>
              <div style={{
                width:        '40px',
                height:       '40px',
                borderRadius: '10px',
                background:   `linear-gradient(135deg, ${accentColor}, #7c3aed)`,
                display:      'flex',
                alignItems:   'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  width:        '20px',
                  height:       '20px',
                  display:      'flex',
                  flexDirection: 'column',
                  gap:          '3px',
                }}>
                  {[22, 18, 14].map((w, i) => (
                    <div key={i} style={{
                      width:        `${w}px`,
                      height:       '3px',
                      borderRadius: '2px',
                      background:   'rgba(255,255,255,0.9)',
                    }} />
                  ))}
                </div>
              </div>
              <span style={{
                fontSize:   '22px',
                fontWeight: 900,
                color:      '#ffffff',
                letterSpacing: '-0.5px',
              }}>
                Compic<span style={{ color: accentColor }}>fy</span>
              </span>
            </div>

            {/* Type badge if present */}
            {type && (
              <div style={{
                display:      'inline-flex',
                alignItems:   'center',
                padding:      '4px 12px',
                borderRadius: '999px',
                background:   `${accentColor}22`,
                border:       `1px solid ${accentColor}44`,
                color:        accentColor,
                fontSize:     '13px',
                fontWeight:   700,
                textTransform: 'capitalize',
                width:        'fit-content',
              }}>
                {type}
              </div>
            )}

            {/* Title */}
            <div style={{
              fontSize:     cover ? '42px' : '56px',
              fontWeight:   900,
              color:        '#ffffff',
              lineHeight:   1.1,
              letterSpacing: '-1px',
              maxWidth:     '640px',
            }}>
              {title}
            </div>

            {/* Description */}
            <div style={{
              fontSize:   '20px',
              color:      'rgba(255,255,255,0.55)',
              lineHeight: 1.5,
              maxWidth:   '580px',
            }}>
              {description.slice(0, 120)}{description.length > 120 ? '…' : ''}
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
              }} />
              <span style={{
                fontSize:  '14px',
                color:     'rgba(255,255,255,0.35)',
                fontWeight: 600,
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
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover}
                alt={title}
                style={{
                  width:      '100%',
                  height:     '100%',
                  objectFit:  'cover',
                }}
              />
              {/* Overlay gradient */}
              <div style={{
                position:   'absolute',
                inset:      0,
                background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)',
              }} />
            </div>
          )}

          {/* Right — decorative stack (homepage OG) */}
          {!cover && (
            <div style={{
              display:        'flex',
              flexDirection:  'column',
              gap:            '12px',
              opacity:        0.4,
              transform:      'rotate(6deg)',
            }}>
              {['#f43f5e', '#8b5cf6', '#14b8a6', '#f59e0b'].map((color, i) => (
                <div key={i} style={{
                  width:        `${180 - i * 20}px`,
                  height:       '8px',
                  borderRadius: '4px',
                  background:   color,
                }} />
              ))}
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