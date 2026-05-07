import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  // Verify cron secret
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get all approved ongoing comics with no external IDs
  const { data: comics } = await supabase
    .from('recommendations')
    .select('id, title, author')
    .eq('is_approved', true)
    .eq('status', 'ongoing')
    .is('mangaupdates_id', null)
    .is('anilist_id', null)
    .is('mal_id', null)
    .is('mangadex_id', null)
    .limit(50) // process 50 at a time to avoid timeout

  if (!comics || comics.length === 0) {
    return NextResponse.json({ message: 'No comics to backfill', processed: 0 })
  }

  let matched  = 0
  let failed   = 0
  const results = []

  for (const comic of comics) {
    try {
      const ids = await findExternalIds(comic.title, comic.author)

      if (ids.mangaupdates_id || ids.anilist_id || ids.mal_id || ids.mangadex_id) {
        await supabase
          .from('recommendations')
          .update(ids)
          .eq('id', comic.id)

        matched++
        results.push({ title: comic.title, ...ids })
      } else {
        failed++
        results.push({ title: comic.title, status: 'no_match' })
      }

      // Rate limit — wait 300ms between requests to avoid hammering APIs
      await new Promise(resolve => setTimeout(resolve, 300))

    } catch (err) {
      console.error(`Failed to backfill ${comic.title}:`, err)
      failed++
    }
  }

  return NextResponse.json({
    processed: comics.length,
    matched,
    failed,
    results,
  })
}

async function findExternalIds(title: string, author?: string | null): Promise<{
  mangaupdates_id?: string
  anilist_id?:      string
  mal_id?:          string
  mangadex_id?:     string
}> {
  const ids: Record<string, string> = {}

  // 1. Try MangaUpdates first
  try {
    const res = await fetch('https://api.mangaupdates.com/v1/series/search', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ search: title, perpage: 5 }),
    })
    if (res.ok) {
      const data = await res.json()
      const results = data.results ?? []

      // Find best match by title similarity
      const match = findBestMatch(title, results.map((r: any) => ({
        id:    String(r.record?.series_id ?? ''),
        title: r.record?.title ?? '',
      })))

      if (match) ids.mangaupdates_id = match
    }
  } catch {}

  // 2. Try AniList
  try {
    const gql = `
      query($search: String) {
        Page(perPage: 5) {
          media(search: $search, type: MANGA, sort: SEARCH_MATCH) {
            id
            title { romaji english }
          }
        }
      }
    `
    const res = await fetch('https://graphql.anilist.co', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ query: gql, variables: { search: title } }),
    })
    if (res.ok) {
      const data = await res.json()
      const items = data?.data?.Page?.media ?? []

      const match = findBestMatch(title, items.map((item: any) => ({
        id:    String(item.id),
        title: item.title?.english || item.title?.romaji || '',
      })))

      if (match) ids.anilist_id = match
    }
  } catch {}

  // 3. Try MAL via Jikan
  try {
    const res = await fetch(
      `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(title)}&limit=5`
    )
    if (res.ok) {
      const data = await res.json()
      const items = data.data ?? []

      const match = findBestMatch(title, items.map((item: any) => ({
        id:    String(item.mal_id),
        title: item.title_english || item.title || '',
      })))

      if (match) ids.mal_id = match
    }
  } catch {}

  return ids
}

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function findBestMatch(
  query: string,
  candidates: { id: string; title: string }[]
): string | null {
  const normalizedQuery = normalize(query)

  for (const candidate of candidates) {
    const normalizedTitle = normalize(candidate.title)

    // Exact match
    if (normalizedTitle === normalizedQuery) return candidate.id

    // One contains the other
    if (
      normalizedTitle.includes(normalizedQuery) ||
      normalizedQuery.includes(normalizedTitle)
    ) return candidate.id
  }

  // Fuzzy — first word match as last resort
  const queryFirstWord = normalizedQuery.split(' ')[0]
  if (queryFirstWord.length >= 4) {
    for (const candidate of candidates) {
      if (normalize(candidate.title).startsWith(queryFirstWord)) {
        return candidate.id
      }
    }
  }

  return null
}