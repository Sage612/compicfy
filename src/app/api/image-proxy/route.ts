import { NextRequest, NextResponse } from 'next/server'

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
  // Naver/LINE Webtoon CDN
  'webtoon-phinf.pstatic.net',
  'phinf.pstatic.net',
  'lethinhf.pstatic.net',
  'naver.net',
  'pstatic.net',
  'static.mantacdn.net',
  'imgg.mangaina.com',
  'tapas.io',
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

// Some CDNs validate the Referer header — map domains to the correct origin
const REFERER_MAP: Record<string, string> = {
  'pstatic.net':  'https://www.webtoons.com',
  'naver.net':    'https://www.webtoons.com',
  'webtoons.com': 'https://www.webtoons.com',
  'tapas.io':     'https://tapas.io',
  'comick.dev':   'https://comick.app',
  'comick.app':   'https://comick.app',
}

const PLACEHOLDER = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400">
  <rect width="300" height="400" fill="#1a1b1e"/>
  <text x="150" y="185" text-anchor="middle" fill="#444" font-size="48">📖</text>
  <text x="150" y="230" text-anchor="middle" fill="#555" font-size="13" font-family="sans-serif">Cover unavailable</text>
</svg>`

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) {
    return new NextResponse(PLACEHOLDER, {
      headers: { 'Content-Type': 'image/svg+xml' },
    })
  }

  // data: URIs cannot be proxied server-side — should never reach here
  // but guard anyway
  if (url.startsWith('data:')) {
    return new NextResponse(PLACEHOLDER, {
      headers: { 'Content-Type': 'image/svg+xml' },
    })
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return new NextResponse(PLACEHOLDER, {
      headers: { 'Content-Type': 'image/svg+xml' },
    })
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return new NextResponse(PLACEHOLDER, {
      headers: { 'Content-Type': 'image/svg+xml' },
    })
  }

  const host = parsed.hostname.toLowerCase()
  const allowed = ALLOWED_HOSTS.some(h => host === h || host.endsWith(`.${h}`))
  if (!allowed) {
    console.warn(`[image-proxy] Unlisted host: ${host}`)
  }

  // Pick the right Referer for domains that validate it
  const referer = Object.entries(REFERER_MAP).find(
    ([domain]) => host === domain || host.endsWith(`.${domain}`)
  )?.[1] ?? parsed.origin

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept':          'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer':         referer,
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) {
      throw new Error(`Source returned ${response.status}`)
    }

    const contentType = response.headers.get('content-type') ?? 'image/jpeg'

    if (!contentType.startsWith('image/')) {
      throw new Error('Not an image')
    }

    const buffer = await response.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type':  contentType,
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        'X-Proxy':       'ComPicfy-image-proxy',
      },
    })
  } catch (err) {
    console.error(`[image-proxy] Failed to fetch ${url}:`, err)
    return new NextResponse(PLACEHOLDER, {
      headers: {
        'Content-Type':  'image/svg+xml',
        'Cache-Control': 'public, s-maxage=300',
      },
    })
  }
}