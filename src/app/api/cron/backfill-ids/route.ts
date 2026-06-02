import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BATCH_SIZE = 10 // Reduced from 30 to avoid timeouts
const COOLDOWN_HOURS = 48
const API_DELAY_MS = 500 // Wait 500ms between each API call
const REQUEST_TIMEOUT_MS = 8000 // 8 second timeout per request

// ── Helpers ───────────────────────────────────────────────────────

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function findBestMatch(query: string, candidates: { id: string; title: string }[]): string | null {
  const normalizedQuery = normalize(query)

  for (const candidate of candidates) {
    const normalizedTitle = normalize(candidate.title)
    if (normalizedTitle === normalizedQuery) return candidate.id
    if (normalizedTitle.includes(normalizedQuery) || normalizedQuery.includes(normalizedTitle)) return candidate.id
  }

  const queryFirstWord = normalizedQuery.split(' ')[0]
  if (queryFirstWord.length >= 4) {
    for (const candidate of candidates) {
      if (normalize(candidate.title).startsWith(queryFirstWord)) return candidate.id
    }
  }

  return null
}

// ── Fetch with timeout ────────────────────────────────────────────
async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeoutId)
    return response
  } catch (err: any) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`)
    }
    throw err
  }
}

// ── MangaUpdates ──────────────────────────────────────────────────
async function findMangaUpdatesID(title: string): Promise<string | null> {
  try {
    await new Promise(resolve => setTimeout(resolve, API_DELAY_MS))
    
    const res = await fetchWithTimeout('https://api.mangaupdates.com/v1/series/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ search: title, perpage: 5 }),
    })
    
    if (!res.ok) return null
    const data = await res.json()
    const results = data.results ?? []
    const candidates = results.map((r: any) => ({
      id: String(r.record?.series_id ?? ''),
      title: r.record?.title ?? '',
    }))
    return findBestMatch(title, candidates)
  } catch (err) {
    console.error(`MU error for "${title}":`, err)
    return null
  }
}

// ── MangaBaka ─────────────────────────────────────────────────────
async function findMangaBakaID(title: string): Promise<string | null> {
  try {
    await new Promise(resolve => setTimeout(resolve, API_DELAY_MS))
    
    const res = await fetchWithTimeout(
      `https://api.mangabaka.dev/series/search?q=${encodeURIComponent(title)}&limit=5`,
      { method: 'GET' }
    )
    
    if (!res.ok) return null
    const data = await res.json()
    const results = data.data ?? data.results ?? []
    const candidates = results.map((r: any) => ({
      id: String(r.id ?? r.series_id ?? ''),
      title: r.title ?? r.name ?? '',
    }))
    return findBestMatch(title, candidates)
  } catch (err) {
    console.error(`MB error for "${title}":`, err)
    return null
  }
}

// ── MangaDex ──────────────────────────────────────────────────────
async function findMangaDexID(title: string): Promise<string | null> {
  try {
    await new Promise(resolve => setTimeout(resolve, API_DELAY_MS))
    
    const res = await fetchWithTimeout(
      `https://api.mangadex.org/manga?title=${encodeURIComponent(title)}&limit=5`,
      { method: 'GET' }
    )
    
    if (!res.ok) return null
    const data = await res.json()
    const results = data.data ?? []
    const candidates = results.map((r: any) => {
      const attr = r.attributes ?? {}
      const titleEn = attr.title?.en || Object.values(attr.title ?? {})[0] || ''
      return { id: String(r.id ?? ''), title: String(titleEn) }
    })
    return findBestMatch(title, candidates)
  } catch (err) {
    console.error(`MD error for "${title}":`, err)
    return null
  }
}

// ── AniList ───────────────────────────────────────────────────────
async function findAniListID(title: string): Promise<string | null> {
  try {
    await new Promise(resolve => setTimeout(resolve, API_DELAY_MS))
    
    const gql = `query($search: String) { Page(perPage: 5) { media(search: $search, type: MANGA, sort: SEARCH_MATCH) { id title { english romaji } } } }`
    const res = await fetchWithTimeout('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: gql, variables: { search: title } }),
    })
    
    if (!res.ok) return null
    const data = await res.json()
    const results = data?.data?.Page?.media ?? []
    const candidates = results.map((r: any) => ({
      id: String(r.id ?? ''),
      title: r.title?.english || r.title?.romaji || '',
    }))
    return findBestMatch(title, candidates)
  } catch (err) {
    console.error(`AL error for "${title}":`, err)
    return null
  }
}

// ── Jikan (MAL) ───────────────────────────────────────────────────
async function findJikanID(title: string): Promise<string | null> {
  try {
    await new Promise(resolve => setTimeout(resolve, API_DELAY_MS))
    
    const res = await fetchWithTimeout(
      `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(title)}&limit=5`,
      { method: 'GET' }
    )
    
    if (!res.ok) return null
    const data = await res.json()
    const results = data.data ?? []
    const candidates = results.map((r: any) => ({
      id: String(r.mal_id ?? ''),
      title: r.title_english || r.title || '',
    }))
    return findBestMatch(title, candidates)
  } catch (err) {
    console.error(`Jikan error for "${title}":`, err)
    return null
  }
}

// ── Kuroiru ───────────────────────────────────────────────────────
async function findKuroiruID(title: string): Promise<string | null> {
  try {
    await new Promise(resolve => setTimeout(resolve, API_DELAY_MS))
    
    const res = await fetchWithTimeout(
      `https://api.kuroiru.co/search?q=${encodeURIComponent(title)}&type=manga&limit=5`,
      { method: 'GET' }
    )
    
    if (!res.ok) return null
    const data = await res.json()
    const results = data.results ?? data.data ?? []
    const candidates = results.map((r: any) => ({
      id: String(r.id ?? r.slug ?? ''),
      title: r.title ?? r.name ?? '',
    }))
    return findBestMatch(title, candidates)
  } catch (err) {
    console.error(`Kuroiru error for "${title}":`, err)
    return null
  }
}

// ── Main ID finder - SEQUENTIAL not parallel ──────────────────────
async function findExternalIds(title: string, author?: string | null): Promise<Record<string, string | undefined>> {
  const ids: Record<string, string | undefined> = {}

  // Run SEQUENTIALLY with delays to avoid overwhelming APIs
  const muId = await findMangaUpdatesID(title)
  if (muId) ids.mangaupdates_id = muId

  const mbId = await findMangaBakaID(title)
  if (mbId) ids.mangabaka_id = mbId

  const mdId = await findMangaDexID(title)
  if (mdId) ids.mangadex_id = mdId

  const alId = await findAniListID(title)
  if (alId) ids.anilist_id = alId

  const malId = await findJikanID(title)
  if (malId) ids.mal_id = malId

  const kId = await findKuroiruID(title)
  if (kId) ids.kuroiru_id = kId

  return ids
}

// ── Logging ───────────────────────────────────────────────────────
interface IDCheckLog {
  comic_id: string
  comic_title: string
  comic_author?: string
  databases_checked: string[]
  ids_found: Record<string, string | undefined>
  status: 'found_all' | 'found_some' | 'found_none' | 'skipped_complete'
  total_ids_found: number
  reason?: string
  timestamp: string
}

async function logIDCheck(supabase: any, log: IDCheckLog) {
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
        reason: log.reason,
        timestamp: log.timestamp,
      },
    })
  } catch (err) {
    console.error('Failed to log:', err)
  }
}

function countExternalIds(comic: any): number {
  return [comic.mangaupdates_id, comic.mangabaka_id, comic.mangadex_id, comic.anilist_id, comic.mal_id, comic.kuroiru_id]
    .filter(id => id && String(id).trim()).length
}

// ── Main handler ──────────────────────────────────────────────────
export async function GET(req: Request) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const cooloffCutoff = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000).toISOString()

  const { data: comics, error } = await supabase
    .from('recommendations')
    .select('id, title, author, mangaupdates_id, mangabaka_id, mangadex_id, anilist_id, mal_id, kuroiru_id, last_id_check')
    .eq('is_approved', true)
    .or(`last_id_check.is.null,last_id_check.lt.${cooloffCutoff}`)
    .limit(BATCH_SIZE)

  if (error) {
    console.error('DB error:', error)
    return NextResponse.json({ error: 'DB fetch failed' }, { status: 500 })
  }

  if (!comics || comics.length === 0) {
    return NextResponse.json({ message: 'No comics need checking', processed: 0, found_all: 0, found_some: 0, found_none: 0, skipped_complete: 0 })
  }

  let foundAll = 0, foundSome = 0, foundNone = 0, skippedComplete = 0
  const logs: IDCheckLog[] = []

  for (const comic of comics) {
    const timestamp = new Date().toISOString()

    try {
      const currentIdCount = countExternalIds(comic)

      if (currentIdCount === 6) {
        skippedComplete++
        await supabase.from('recommendations').update({ last_id_check: timestamp }).eq('id', comic.id)
        logs.push({
          comic_id: comic.id,
          comic_title: comic.title,
          databases_checked: [],
          ids_found: {},
          status: 'skipped_complete',
          total_ids_found: 6,
          reason: 'Already complete',
          timestamp,
        })
        continue
      }

      // Find IDs (sequential, with delays)
      const ids = await findExternalIds(comic.title, comic.author)
      const totalFound = Object.values(ids).filter(Boolean).length

      const mergedIds = {
        mangaupdates_id: ids.mangaupdates_id || comic.mangaupdates_id,
        mangabaka_id: ids.mangabaka_id || comic.mangabaka_id,
        mangadex_id: ids.mangadex_id || comic.mangadex_id,
        anilist_id: ids.anilist_id || comic.anilist_id,
        mal_id: ids.mal_id || comic.mal_id,
        kuroiru_id: ids.kuroiru_id || comic.kuroiru_id,
      }

      const newIdCount = countExternalIds(mergedIds)
      let status: 'found_all' | 'found_some' | 'found_none' = 'found_none'
      if (newIdCount === 6) status = 'found_all'
      else if (totalFound > 0) status = 'found_some'

      if (totalFound > 0) {
        await supabase.from('recommendations').update({
          ...mergedIds,
          last_id_check: timestamp,
        }).eq('id', comic.id)

        if (status === 'found_all') foundAll++
        else foundSome++
      } else {
        await supabase.from('recommendations').update({ last_id_check: timestamp }).eq('id', comic.id)
        foundNone++
      }

      logs.push({
        comic_id: comic.id,
        comic_title: comic.title,
        comic_author: comic.author,
        databases_checked: ['MU', 'MB', 'MD', 'AL', 'Jikan', 'Kuroiru'],
        ids_found: mergedIds,
        status,
        total_ids_found: newIdCount,
        timestamp,
      })
    } catch (err: any) {
      console.error(`Error processing ${comic.title}:`, err)
      foundNone++
      await supabase.from('recommendations').update({ last_id_check: new Date().toISOString() }).eq('id', comic.id)
      logs.push({
        comic_id: comic.id,
        comic_title: comic.title,
        databases_checked: [],
        ids_found: {},
        status: 'found_none',
        total_ids_found: 0,
        reason: err?.message ?? 'Unknown error',
        timestamp,
      })
    }
  }

  // Log all
  for (const log of logs) {
    await logIDCheck(supabase, log)
  }

  return NextResponse.json({
    processed: comics.length,
    found_all: foundAll,
    found_some: foundSome,
    found_none: foundNone,
    skipped_complete: skippedComplete,
    logs_count: logs.length,
  })
}