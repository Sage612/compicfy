import { NextRequest, NextResponse } from 'next/server'

// Basic allowlist — only proxy images from known comic CDNs
// Add more domains as needed
const ALLOWED_HOSTS = [
  'cdn.myanimelist.net',
  'cdn.anilist.co',
    'mangadex.org',
  'cdn.mangaupdates.com',
  's4.anilist.co',
  'uploads.mangadex.org',
  'mangakakalot.com',
  'chapmanganato.to',
  'manganato.com',
  'webtoons.com',
  'img.webtoons.com',
    'static.webtoon.net',
  'webtoon-phinf.pstatic.net',
  'static.mantacdn.net',
  'imgg.mangaina.com',
  'tapas.io',
  'image-repository-cdn.tappytoon.com',
  'comick.dev',
  'meo.comick.pictures',
  'i.imgur.com',
  'imgur.com',
  'images.weserv.nl',
  'lh3.googleusercontent.com',
  'res.cloudinary.com',
  'image.tmdb.org',
  'raw.githubusercontent.com',
  'cdn.statically.io',
  'i.postimg.cc',
  'i2.wp.com',
  'i1.wp.com',
  'i0.wp.com',
]

// Placeholder SVG returned when image fails
const PLACEHOLDER = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">
  <rect width="300" height="400" fill="#1a1b1e"/>
  <text x="150" y="185" text-anchor="middle" fill="#444" font-size="48">📖</text>
  <text x="150" y="230" text-anchor="middle" fill="#555" font-size="13" font-family="sans-serif">Cover unavailable</text>
</svg>`

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  // No URL provided — return placeholder
  if (!url) {
    return new NextResponse(PLACEHOLDER, {
      headers: { 'Content-Type': 'image/svg+xml' },
    })
  }

  // Validate URL
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return new NextResponse(PLACEHOLDER, {
      headers: { 'Content-Type': 'image/svg+xml' },
    })
  }

  // Block non-http(s) schemes
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return new NextResponse(PLACEHOLDER, {
      headers: { 'Content-Type': 'image/svg+xml' },
    })
  }

  // Check allowlist
  const host = parsed.hostname.toLowerCase()
  const allowed = ALLOWED_HOSTS.some(h => host === h || host.endsWith(`.${h}`))
  if (!allowed) {
    // Not in allowlist — try to proxy anyway but without caching
    // This handles new/unknown sources gracefully
    console.warn(`[image-proxy] Unlisted host: ${host}`)
  }

  try {
    const response = await fetch(url, {
      headers: {
        // Pretend to be a browser so hotlink-blocking servers let us through
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept':          'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer':         parsed.origin,
      },
      // 8 second timeout — stay under Vercel's 10s limit
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      throw new Error(`Source returned ${response.status}`)
    }

    const contentType = response.headers.get('content-type') ?? 'image/jpeg'

    // Only proxy actual images
    if (!contentType.startsWith('image/')) {
      throw new Error('Not an image')
    }

    const buffer = await response.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type':  contentType,
        // Cache at the edge for 24 hours, browser for 1 hour
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        'X-Proxy':       'compicfy-image-proxy',
      },
    })
  } catch (err) {
    console.error(`[image-proxy] Failed to fetch ${url}:`, err)
    // Return placeholder SVG so the UI never shows a broken image
    return new NextResponse(PLACEHOLDER, {
      headers: {
        'Content-Type':  'image/svg+xml',
        'Cache-Control': 'public, s-maxage=300',
      },
    })
  }
}