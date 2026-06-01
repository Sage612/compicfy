import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BATCH_SIZE = 30 // comics to process per run

// ── Logging helper ────────────────────────────────────────────────
interface IDCheckLog {
  comic_id: string
  comic_title: string
  comic_author?: string
  databases_checked: string[]
  ids_found: {
    mangaupdates_id?: string
    mangabaka_id?: string
    mangadex_id?: string
    anilist_id?: string
    mal_id?: string
    kuroiru_id?: string
  }
  status: 'found_all' | 'found_some' | 'found_none'
  total_ids_found: number
  timestamp: string
}

async function logIDCheck(
  supabase: any,
  log: IDCheckLog
) {
  try {
    await supabase.from('activity_logs').insert({
      user_id: null,
      action: 'id_check',
      entity_type: 'recommendations',
      entity_id: log.comic_id,
      details: {
        comic_title: log.comic_title,
        comic_author: log.comic_author,
        databases_checked: log.databases_checked,
        ids_found: log.ids_found,
        status: log.status,
        total_ids_found: log.total_ids_found,
        timestamp: log.timestamp,
      },
    })
  } catch (err) {
    console.error('Failed to log ID check:', err)
  }
}

// ── Helpers ───────────────────────────────────────────────────────
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

// ── MangaUpdates ──────────────────────────────────────────────────
async function findMangaUpdatesID(
  title: string,
  author?: string | null
): Promise<string | null> {
  try {
    const res = await fetch('https://api.mangaupdates.com/v1/series/search', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ search: title, perpage: 5 }),
    })
    if (!res.ok) return null

    const data = await res.json()
    const results = data.results ?? []
    const candidates = results.map((r: any) => ({
      id: String(r.record?.series_id ?? ''),
      title: r.record?.title ?? '',
    }))

    return findBestMatch(title, candidates)
  } catch {
    return null
  }
}

// ── MangaBaka ──────────────────────────────────────────────────────
async function findMangaBakaID(
  title: string,
  author?: string | null
): Promise<string | null> {
  try {
    // MangaBaka search API
    const res = await fetch(
      `https://api.mangabaka.dev/series/search?q=${encodeURIComponent(title)}&limit=5`,
      { next: { revalidate: 0 } }
    )
    if (!res.ok) return null

    const data = await res.json()
    const results = data.data ?? data.results ?? []
    const candidates = results.map((r: any) => ({
      id: String(r.id ?? r.series_id ?? ''),
      title: r.title ?? r.name ?? '',
    }))

    return findBestMatch(title, candidates)
  } catch {
    return null
  }
}

// ── MangaDex ──────────────────────────────────────────────────────
async function findMangaDexID(
  title: string,
  author?: string | null
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.mangadex.org/manga?title=${encodeURIComponent(title)}&limit=5`,
      { next: { revalidate: 0 } }
    )
    if (!res.ok) return null

    const data = await res.json()
    const results = data.data ?? []
    const candidates = results.map((r: any) => {
      const attr = r.attributes ?? {}
      const titleEn = attr.title?.en || Object.values(attr.title ?? {})[0] || ''
      return {
        id: String(r.id ?? ''),
        title: String(titleEn),
      }
    })

    return findBestMatch(title, candidates)
  } catch {
    return null
  }
}

// ── AniList ───────────────────────────────────────────────────────
async function findAniListID(
  title: string,
  author?: string | null
): Promise<string | null> {
  try {
    const gql = `
      query($search: String) {
        Page(perPage: 5) {
          media(search: $search, type: MANGA, sort: SEARCH_MATCH) {
            id
            title { english romaji }
          }
        }
      }
    `
    const res = await fetch('https://graphql.anilist.co', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ query: gql, variables: { search: title } }),
    })
    if (!res.ok) return null

    const data = await res.json()
    const results = data?.data?.Page?.media ?? []
    const candidates = results.map((r: any) => ({
      id: String(r.id ?? ''),
      title: r.title?.english || r.title?.romaji || '',
    }))

    return findBestMatch(title, candidates)
  } catch {
    return null
  }
}

// ── Jikan (MAL) ───────────────────────────────────────────────────
async function findJikanID(
  title: string,
  author?: string | null
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(title)}&limit=5`,
      { next: { revalidate: 0 } }
    )
    if (!res.ok) return null

    const data = await res.json()
    const results = data.data ?? []
    const candidates = results.map((r: any) => ({
      id: String(r.mal_id ?? ''),
      title: r.title_english || r.title || '',
    }))

    return findBestMatch(title, candidates)
  } catch {
    return null
  }
}

// ── Kuroiru ───────────────────────────────────────────────────────
async function findKuroiruID(
  title: string,
  author?: string | null
): Promise<string | null> {
  try {
    // Kuroiru search endpoint
    const res = await fetch(
      `https://api.kuroiru.co/search?q=${encodeURIComponent(title)}&type=manga&limit=5`,
      { next: { revalidate: 0 } }
    )
    if (!res.ok) return null

    const data = await res.json()
    const results = data.results ?? data.data ?? []
    const candidates = results.map((r: any) => ({
      id: String(r.id ?? r.slug ?? ''),
      title: r.title ?? r.name ?? '',
    }))

    return findBestMatch(title, candidates)
  } catch {
    return null
  }
}

// ── Main ID finder ────────────────────────────────────────────────
async function findExternalIds(
  title: string,
  author?: string | null
): Promise<{
  mangaupdates_id?: string
  mangabaka_id?: string
  mangadex_id?: string
  anilist_id?: string
  mal_id?: string
  kuroiru_id?: string
}> {
  const ids: Record<string, string | undefined> = {}
  const checked = ['MangaUpdates', 'MangaBaka', 'MangaDex', 'AniList', 'Jikan', 'Kuroiru']

  // Run all searches in parallel with individual fallbacks
  const [mu, mb, md, al, jikan, kuroiru] = await Promise.allSettled([
    findMangaUpdatesID(title, author),
    findMangaBakaID(title, author),
    findMangaDexID(title, author),
    findAniListID(title, author),
    findJikanID(title, author),
    findKuroiruID(title, author),
  ])

  if (mu.status === 'fulfilled' && mu.value) ids.mangaupdates_id = mu.value
  if (mb.status === 'fulfilled' && mb.value) ids.mangabaka_id = mb.value
  if (md.status === 'fulfilled' && md.value) ids.mangadex_id = md.value
  if (al.status === 'fulfilled' && al.value) ids.anilist_id = al.value
  if (jikan.status === 'fulfilled' && jikan.value) ids.mal_id = jikan.value
  if (kuroiru.status === 'fulfilled' && kuroiru.value) ids.kuroiru_id = kuroiru.value

  return ids
}

// ── Main handler ──────────────────────────────────────────────────
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

  // Get approved comics with missing or incomplete IDs
  // Consider a comic "incomplete" if it doesn't have at least 2 IDs
  const { data: comics } = await supabase
    .from('recommendations')
    .select('id, title, author')
    .eq('is_approved', true)
    .limit(BATCH_SIZE)

  if (!comics || comics.length === 0) {
    return NextResponse.json({ 
      message: 'No comics to process',
      processed: 0,
      found_all: 0,
      found_some: 0,
      found_none: 0,
    })
  }

  let foundAll = 0
  let foundSome = 0
  let foundNone = 0
  const logs: IDCheckLog[] = []

  for (const comic of comics) {
    const timestamp = new Date().toISOString()

    try {
      // Find all available IDs
      const ids = await findExternalIds(comic.title, comic.author)
      const totalFound = Object.values(ids).filter(Boolean).length

      // Determine status
      let status: 'found_all' | 'found_some' | 'found_none' = 'found_none'
      if (totalFound === 6) status = 'found_all'
      else if (totalFound > 0) status = 'found_some'

      // Update the comic with all found IDs
      if (totalFound > 0) {
        await supabase
          .from('recommendations')
          .update({
            mangaupdates_id: ids.mangaupdates_id,
            mangabaka_id: ids.mangabaka_id,
            mangadex_id: ids.mangadex_id,
            anilist_id: ids.anilist_id,
            mal_id: ids.mal_id,
            kuroiru_id: ids.kuroiru_id,
          })
          .eq('id', comic.id)

        if (status === 'found_all') foundAll++
        else if (status === 'found_some') foundSome++
      } else {
        foundNone++
      }

      // Log the attempt
      const logEntry: IDCheckLog = {
        comic_id: comic.id,
        comic_title: comic.title,
        comic_author: comic.author,
        databases_checked: ['MangaUpdates', 'MangaBaka', 'MangaDex', 'AniList', 'Jikan', 'Kuroiru'],
        ids_found: ids,
        status,
        total_ids_found: totalFound,
        timestamp,
      }

      logs.push(logEntry)

      // Rate limit — wait 200ms between requests to avoid hammering APIs
      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (err: any) {
      console.error(`Failed to find IDs for ${comic.title}:`, err)
      
      logs.push({
        comic_id: comic.id,
        comic_title: comic.title,
        comic_author: comic.author,
        databases_checked: ['MangaUpdates', 'MangaBaka', 'MangaDex', 'AniList', 'Jikan', 'Kuroiru'],
        ids_found: {},
        status: 'found_none',
        total_ids_found: 0,
        timestamp,
      })
      
      foundNone++
    }
  }

  // Bulk log all attempts
  try {
    for (const log of logs) {
      await logIDCheck(supabase, log)
    }
  } catch (err) {
    console.error('Failed to log ID checks:', err)
  }

  return NextResponse.json({
    processed: comics.length,
    foundAll,
    foundSome,
    foundNone,
    logs_count: logs.length,
    logs: logs.slice(0, 5), // Return first 5 for brevity
  })
}