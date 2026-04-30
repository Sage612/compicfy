import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export interface SearchResult {
  id:        string
  title:     string
  type:      string
  cover_url: string | null
  author:    string | null
  genres:    string[]
  status:    string
  // ── source metadata ──
  source:    'local' | 'jikan' | 'mangadex' | 'anilist' | 'mangaupdates'
  // ── prefill data for submission form (external results only) ──
  prefill?: {
    title:              string
    type:               string
    status:             string
    genres:             string[]
    description:        string
    author:             string
    artist:             string
    cover_url:          string
    year_released:      number | null
    chapter_count:      number | null
    alternative_titles: string[]
    score:              number | null
  }
}

// ── DB search ─────────────────────────────────────────────────────
async function searchLocal(
  q: string,
  limit: number,
  adult: boolean
): Promise<SearchResult[]> {
  try {
    const supabase = await createClient()
    const words    = q.split(/\s+/).filter(Boolean)

    let query = supabase
      .from('recommendations')
      .select('id, title, type, cover_url, author, genres, status')
      .eq('is_approved', true)

    if (!adult) query = query.not('content_rating', 'in', '("adult","mature")')

    if (words.length === 1) {
      query = query.or(
        `title.ilike.%${words[0]}%,author.ilike.%${words[0]}%,artist.ilike.%${words[0]}%`
      )
    } else {
      for (const word of words) {
        query = query.ilike('title', `%${word}%`)
      }
    }

    const { data } = await query.order('score', { ascending: false }).limit(limit)

    const lower  = q.toLowerCase()
    const ranked = ((data ?? []) as any[]).sort((a, b) => {
      const aT = a.title.toLowerCase()
      const bT = b.title.toLowerCase()
      if (aT === lower && bT !== lower) return -1
      if (bT === lower && aT !== lower) return 1
      if (aT.startsWith(lower) && !bT.startsWith(lower)) return -1
      if (bT.startsWith(lower) && !aT.startsWith(lower)) return 1
      return 0
    })

    return ranked.map(r => ({ ...r, source: 'local' as const }))
  } catch {
    return []
  }
}

// ── External search (proxied through /api/manga-search) ───────────
async function searchExternal(q: string): Promise<SearchResult[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://compicfy.cloud'
    const res = await fetch(
      `${baseUrl}/api/manga-search?q=${encodeURIComponent(q)}`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data.results ?? []) as SearchResult[]
  } catch {
    return []
  }
}

// ── Deduplicate by normalised title ───────────────────────────────
function dedup(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>()
  return results.filter(r => {
    const key = r.title.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ── Handler ───────────────────────────────────────────────────────
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q     = searchParams.get('q')?.trim() ?? ''
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '8'), 20)
  const adult = searchParams.get('adult') === 'true'

  if (q.length < 2) return NextResponse.json({ results: [] })

  // Always search DB. If we get enough hits, skip external APIs entirely
  // to keep the response fast. External search runs in parallel but we
  // only wait for it when local results are sparse (<3 hits).
  const localPromise    = searchLocal(q, limit, adult)
  const externalPromise = searchExternal(q)   // starts immediately in bg

  const localResults = await localPromise

  let combined: SearchResult[]

  if (localResults.length >= 3) {
    // Enough local results — return immediately, skip external wait
    combined = localResults
  } else {
    // Sparse local results — wait for external and merge
    const externalResults = await externalPromise

    // Filter out external results whose title already exists locally
    const localTitles = new Set(
      localResults.map(r => r.title.toLowerCase().replace(/[^a-z0-9]/g, ''))
    )
    const newExternal = externalResults.filter(r => {
      const key = r.title.toLowerCase().replace(/[^a-z0-9]/g, '')
      return !localTitles.has(key)
    })

    // Local first, then external
    combined = dedup([...localResults, ...newExternal])
  }

  return NextResponse.json({ results: combined.slice(0, limit + 6) })
}