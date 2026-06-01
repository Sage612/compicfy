import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BATCH_SIZE = 30
const COOLDOWN_HOURS = 48

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

    if (normalizedTitle === normalizedQuery) return candidate.id
    if (
      normalizedTitle.includes(normalizedQuery) ||
      normalizedQuery.includes(normalizedTitle)
    ) return candidate.id
  }

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
  status: 'found_all' | 'found_some' | 'found_none' | 'skipped_complete'
  total_ids_found: number
  reason?: string
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
        reason: log.reason,
        timestamp: log.timestamp,
      },
    })
  } catch (err) {
    console.error('Failed to log ID check:', err)
  }
}

// ── Helper to count IDs ───────────────────────────────────────────
function countExternalIds(comic: any): number {
  return [
    comic.mangaupdates_id,
    comic.mangabaka_id,
    comic.mangadex_id,
    comic.anilist_id,
    comic.mal_id,
    comic.kuroiru_id,
  ].filter(id => id && String(id).trim()).length
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

  // Calculate cooldown cutoff
  const cooloffCutoff = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000).toISOString()

  // Get approved comics that NEED ID checking
  // Skip: comics with all 6 IDs + recently checked (within cooldown)
  const { data: comics } = await supabase
    .from('recommendations')
    .select('id, title, author, mangaupdates_id, mangabaka_id, mangadex_id, anilist_id, mal_id, kuroiru_id, last_id_check')
    .eq('is_approved', true)
    .or(`last_id_check.is.null,last_id_check.lt.${cooloffCutoff}`)
    .limit(BATCH_SIZE)

  if (!comics || comics.length === 0) {
    return NextResponse.json({
      message: 'No comics need ID checking',
      processed: 0,
      found_all: 0,
      found_some: 0,
      found_none: 0,
      skipped_complete: 0,
    })
  }

  let foundAll = 0
  let foundSome = 0
  let foundNone = 0
  let skippedComplete = 0
  const logs: IDCheckLog[] = []

  for (const comic of comics) {
    const timestamp = new Date().toISOString()

    try {
      // Check if comic already has all 6 IDs
      const currentIdCount = countExternalIds(comic)
      
      if (currentIdCount === 6) {
        // Skip - already complete
        skippedComplete++
        logs.push({
          comic_id: comic.id,
          comic_title: comic.title,
          comic_author: comic.author,
          databases_checked: [],
          ids_found: {
            mangaupdates_id: comic.mangaupdates_id,
            mangabaka_id: comic.mangabaka_id,
            mangadex_id: comic.mangadex_id,
            anilist_id: comic.anilist_id,
            mal_id: comic.mal_id,
            kuroiru_id: comic.kuroiru_id,
          },
          status: 'skipped_complete',
          total_ids_found: 6,
          reason: 'Already has all 6 IDs',
          timestamp,
        })

        // Update timestamp to skip this for another 48 hours
        await supabase
          .from('recommendations')
          .update({ last_id_check: timestamp })
          .eq('id', comic.id)

        continue
      }

      // Find all available IDs
      const ids = await findExternalIds(comic.title, comic.author)
      const totalFound = Object.values(ids).filter(Boolean).length

      // Merge with existing IDs (don't overwrite)
      const mergedIds = {
        mangaupdates_id: ids.mangaupdates_id || comic.mangaupdates_id,
        mangabaka_id: ids.mangabaka_id || comic.mangabaka_id,
        mangadex_id: ids.mangadex_id || comic.mangadex_id,
        anilist_id: ids.anilist_id || comic.anilist_id,
        mal_id: ids.mal_id || comic.mal_id,
        kuroiru_id: ids.kuroiru_id || comic.kuroiru_id,
      }

      // Determine status
      let status: 'found_all' | 'found_some' | 'found_none' = 'found_none'
      const newIdCount = countExternalIds(mergedIds)
      
      if (newIdCount === 6) status = 'found_all'
      else if (totalFound > 0) status = 'found_some'

      // Update the comic with all found IDs
      if (totalFound > 0) {
        await supabase
          .from('recommendations')
          .update({
            mangaupdates_id: mergedIds.mangaupdates_id,
            mangabaka_id: mergedIds.mangabaka_id,
            mangadex_id: mergedIds.mangadex_id,
            anilist_id: mergedIds.anilist_id,
            mal_id: mergedIds.mal_id,
            kuroiru_id: mergedIds.kuroiru_id,
            last_id_check: timestamp,
          })
          .eq('id', comic.id)

        if (status === 'found_all') foundAll++
        else if (status === 'found_some') foundSome++
      } else {
        // Even if nothing found, update timestamp to avoid re-checking too soon
        await supabase
          .from('recommendations')
          .update({ last_id_check: timestamp })
          .eq('id', comic.id)
        
        foundNone++
      }

      // Log the attempt
      const logEntry: IDCheckLog = {
        comic_id: comic.id,
        comic_title: comic.title,
        comic_author: comic.author,
        databases_checked: ['MangaUpdates', 'MangaBaka', 'MangaDex', 'AniList', 'Jikan', 'Kuroiru'],
        ids_found: mergedIds,
        status,
        total_ids_found: newIdCount,
        timestamp,
      }

      logs.push(logEntry)

      // Rate limit
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
        reason: err?.message,
        timestamp,
      })
      
      foundNone++

      // Update timestamp even on error
      await supabase
        .from('recommendations')
        .update({ last_id_check: new Date().toISOString() })
        .eq('id', comic.id)
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
    skippedComplete,
    logs_count: logs.length,
    logs: logs.slice(0, 5),
  })
}