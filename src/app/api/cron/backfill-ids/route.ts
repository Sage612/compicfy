import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BATCH_SIZE        = 10
const COOLDOWN_HOURS    = 48
const API_DELAY_MS      = 600
const REQUEST_TIMEOUT_MS = 8000

// ── Fetch with timeout ────────────────────────────────────────────
async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timeoutId  = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeoutId)
    return response
  } catch (err: any) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') throw new Error(`Request timeout after ${timeoutMs}ms`)
    throw err
  }
}

// ── Exact match only ──────────────────────────────────────────────
// Returns an ID only if the candidate title is an exact match
// (case-insensitive, punctuation-stripped). No partial matches.
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function exactMatch(
  query: string,
  candidates: { id: string; title: string; author?: string }[],
  authorHint?: string | null,
): string | null {
  const nq = normalize(query)

  // Pass 1 — exact title + author match (most confident)
  if (authorHint) {
    const na = normalize(authorHint)
    for (const c of candidates) {
      if (normalize(c.title) === nq && c.author && normalize(c.author).includes(na)) {
        return c.id
      }
    }
  }

  // Pass 2 — exact title match only
  for (const c of candidates) {
    if (normalize(c.title) === nq) return c.id
  }

  // No match — return nothing rather than a wrong ID
  return null
}

// ── MangaUpdates ──────────────────────────────────────────────────
async function findMangaUpdatesID(title: string, author?: string | null): Promise<string | null> {
  try {
    await new Promise(r => setTimeout(r, API_DELAY_MS))
    const res = await fetchWithTimeout('https://api.mangaupdates.com/v1/series/search', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ search: title, perpage: 10 }),
    })
    if (!res.ok) return null
    const data       = await res.json()
    const candidates = (data.results ?? []).map((r: any) => ({
      id:     String(r.record?.series_id ?? ''),
      title:  r.record?.title ?? '',
      author: r.record?.author ?? '',
    }))
    return exactMatch(title, candidates, author)
  } catch (err) {
    console.error(`MU error for "${title}":`, err)
    return null
  }
}

// ── MangaDex ──────────────────────────────────────────────────────
async function findMangaDexID(title: string, author?: string | null): Promise<string | null> {
  try {
    await new Promise(r => setTimeout(r, API_DELAY_MS))
    const res = await fetchWithTimeout(
      `https://api.mangadex.org/manga?title=${encodeURIComponent(title)}&limit=10&includes[]=author`,
    )
    if (!res.ok) return null
    const data       = await res.json()
    const candidates = (data.data ?? []).map((r: any) => {
      const attr      = r.attributes ?? {}
      const titleEn   = attr.title?.en || Object.values(attr.title ?? {})[0] || ''
      const authorRel = r.relationships?.find((rel: any) => rel.type === 'author')
      const authorName = authorRel?.attributes?.name ?? ''
      return { id: String(r.id ?? ''), title: String(titleEn), author: authorName }
    })
    return exactMatch(title, candidates, author)
  } catch (err) {
    console.error(`MD error for "${title}":`, err)
    return null
  }
}

// ── AniList ───────────────────────────────────────────────────────
async function findAniListID(title: string, author?: string | null): Promise<string | null> {
  try {
    await new Promise(r => setTimeout(r, API_DELAY_MS))
    const gql = `query($search:String){Page(perPage:10){media(search:$search,type:MANGA,sort:SEARCH_MATCH){id title{english romaji native}staff(perPage:5){edges{role node{name{full}}}}}}}`
    const res = await fetchWithTimeout('https://graphql.anilist.co', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ query: gql, variables: { search: title } }),
    })
    if (!res.ok) return null
    const data       = await res.json()
    const candidates = (data?.data?.Page?.media ?? []).map((r: any) => {
      const staff      = r.staff?.edges ?? []
      const storyStaff = staff.find((e: any) => e.role?.toLowerCase().includes('story'))
      const authorName = storyStaff?.node?.name?.full ?? ''
      return {
        id:     String(r.id ?? ''),
        title:  r.title?.english || r.title?.romaji || r.title?.native || '',
        author: authorName,
      }
    })
    return exactMatch(title, candidates, author)
  } catch (err) {
    console.error(`AL error for "${title}":`, err)
    return null
  }
}

// ── Jikan (MAL) ───────────────────────────────────────────────────
async function findJikanID(title: string, author?: string | null): Promise<string | null> {
  try {
    await new Promise(r => setTimeout(r, API_DELAY_MS))
    const res = await fetchWithTimeout(
      `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(title)}&limit=10`,
    )
    if (!res.ok) return null
    const data       = await res.json()
    const candidates = (data.data ?? []).map((r: any) => ({
      id:     String(r.mal_id ?? ''),
      title:  r.title_english || r.title || '',
      author: (r.authors ?? []).map((a: any) => a.name).join(' '),
    }))
    return exactMatch(title, candidates, author)
  } catch (err) {
    console.error(`Jikan error for "${title}":`, err)
    return null
  }
}

// ── MangaBaka ─────────────────────────────────────────────────────
async function findMangaBakaID(title: string, author?: string | null): Promise<string | null> {
  try {
    await new Promise(r => setTimeout(r, API_DELAY_MS))
    const res = await fetchWithTimeout(
      `https://api.mangabaka.dev/series/search?q=${encodeURIComponent(title)}&limit=10`,
    )
    if (!res.ok) return null
    const data       = await res.json()
    const candidates = (data.data ?? data.results ?? []).map((r: any) => ({
      id:     String(r.id ?? r.series_id ?? ''),
      title:  r.title ?? r.name ?? '',
      author: r.author ?? '',
    }))
    return exactMatch(title, candidates, author)
  } catch (err) {
    console.error(`MB error for "${title}":`, err)
    return null
  }
}

// ── Kuroiru ───────────────────────────────────────────────────────
async function findKuroiruID(title: string, author?: string | null): Promise<string | null> {
  try {
    await new Promise(r => setTimeout(r, API_DELAY_MS))
    const res = await fetchWithTimeout(
      `https://api.kuroiru.co/search?q=${encodeURIComponent(title)}&type=manga&limit=10`,
    )
    if (!res.ok) return null
    const data       = await res.json()
    const candidates = (data.results ?? data.data ?? []).map((r: any) => ({
      id:     String(r.id ?? r.slug ?? ''),
      title:  r.title ?? r.name ?? '',
      author: r.author ?? '',
    }))
    return exactMatch(title, candidates, author)
  } catch (err) {
    console.error(`Kuroiru error for "${title}":`, err)
    return null
  }
}

// ── Main ID finder — sequential ───────────────────────────────────
async function findExternalIds(title: string, author?: string | null): Promise<Record<string, string | undefined>> {
  const ids: Record<string, string | undefined> = {}

  const muId = await findMangaUpdatesID(title, author)
  if (muId) ids.mangaupdates_id = muId

  const mbId = await findMangaBakaID(title, author)
  if (mbId) ids.mangabaka_id = mbId

  const mdId = await findMangaDexID(title, author)
  if (mdId) ids.mangadex_id = mdId

  const alId = await findAniListID(title, author)
  if (alId) ids.anilist_id = alId

  const malId = await findJikanID(title, author)
  if (malId) ids.mal_id = malId

  const kId = await findKuroiruID(title, author)
  if (kId) ids.kuroiru_id = kId

  return ids
}

// ── Logging ───────────────────────────────────────────────────────
interface IDCheckLog {
  comic_id:          string
  comic_title:       string
  comic_author?:     string
  databases_checked: string[]
  ids_found:         Record<string, string | undefined>
  status:            'found_all' | 'found_some' | 'found_none' | 'skipped_complete'
  total_ids_found:   number
  reason?:           string
  timestamp:         string
}

async function logIDCheck(supabase: any, log: IDCheckLog) {
  try {
    await supabase.from('activity_logs').insert({
      user_id:     null,
      action:      'id_check',
      entity_type: 'recommendations',
      entity_id:   log.comic_id,
      details:     log,
    })
  } catch (err) {
    console.error('Failed to log:', err)
  }
}

function countExternalIds(comic: any): number {
  return [
    comic.mangaupdates_id, comic.mangabaka_id, comic.mangadex_id,
    comic.anilist_id,      comic.mal_id,       comic.kuroiru_id,
  ].filter(id => id && String(id).trim()).length
}

// ── Main handler ──────────────────────────────────────────────────
export async function GET(req: Request) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
    return NextResponse.json({ message: 'No comics need checking', processed: 0 })
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
          comic_id: comic.id, comic_title: comic.title,
          databases_checked: [], ids_found: {},
          status: 'skipped_complete', total_ids_found: 6,
          reason: 'Already complete', timestamp,
        })
        continue
      }

      const ids        = await findExternalIds(comic.title, comic.author)
      const totalFound = Object.values(ids).filter(Boolean).length

      // Merge: only overwrite nulls — never overwrite an existing ID
      const mergedIds = {
        mangaupdates_id: comic.mangaupdates_id || ids.mangaupdates_id,
        mangabaka_id:    comic.mangabaka_id    || ids.mangabaka_id,
        mangadex_id:     comic.mangadex_id     || ids.mangadex_id,
        anilist_id:      comic.anilist_id      || ids.anilist_id,
        mal_id:          comic.mal_id          || ids.mal_id,
        kuroiru_id:      comic.kuroiru_id      || ids.kuroiru_id,
      }

      const newIdCount = countExternalIds(mergedIds)
      let status: IDCheckLog['status'] = 'found_none'
      if (newIdCount === 6)      status = 'found_all'
      else if (totalFound > 0)   status = 'found_some'

      if (totalFound > 0) {
        await supabase.from('recommendations')
          .update({ ...mergedIds, last_id_check: timestamp })
          .eq('id', comic.id)
        if (status === 'found_all') foundAll++
        else foundSome++
      } else {
        await supabase.from('recommendations')
          .update({ last_id_check: timestamp })
          .eq('id', comic.id)
        foundNone++
      }

      logs.push({
        comic_id: comic.id, comic_title: comic.title, comic_author: comic.author,
        databases_checked: ['MU', 'MB', 'MD', 'AL', 'Jikan', 'Kuroiru'],
        ids_found: mergedIds, status, total_ids_found: newIdCount, timestamp,
      })

    } catch (err: any) {
      console.error(`Error processing ${comic.title}:`, err)
      foundNone++
      await supabase.from('recommendations')
        .update({ last_id_check: new Date().toISOString() })
        .eq('id', comic.id)
      logs.push({
        comic_id: comic.id, comic_title: comic.title,
        databases_checked: [], ids_found: {},
        status: 'found_none', total_ids_found: 0,
        reason: err?.message ?? 'Unknown error', timestamp,
      })
    }
  }

  for (const log of logs) await logIDCheck(supabase, log)

  return NextResponse.json({
    processed:        comics.length,
    found_all:        foundAll,
    found_some:       foundSome,
    found_none:       foundNone,
    skipped_complete: skippedComplete,
    logs_count:       logs.length,
  })
}