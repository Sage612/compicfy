import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BATCH_SIZE         = 5
const COOLDOWN_HOURS     = 5
const API_DELAY_MS       = 600
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

// ── Normalize ─────────────────────────────────────────────────────
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// ── Smart match ───────────────────────────────────────────────────
// Strategy:
//   Pass 1: exact title   + author/artist confirmation  → most confident
//   Pass 2: exact title   only                          → accepted
//   Pass 3: contains match + author/artist confirmation → handles "(2022)" suffix variants
//   Pass 4: never         — no match without some signal
//
// "Contains match" means: after normalizing both strings,
//   one starts-with or fully contains the other.
//   e.g. "the novels extra" is contained in "the novels extra 2022" → match
//
// Author/artist confirmation uses bidirectional includes so name order
// differences ("Lee, Sung-Woo" vs "Sung Woo Lee") still resolve.

function smartMatch(
  query:       string,
  candidates:  { id: string; title: string; author?: string; artist?: string }[],
  authorHint?: string | null,
  artistHint?: string | null,
): string | null {
  const nq = normalize(query)
  const na = authorHint ? normalize(authorHint) : null
  const nr = artistHint ? normalize(artistHint) : null

  const authorArtistConfirmed = (c: { author?: string; artist?: string }): boolean => {
    if (!na && !nr) return false
    const ca = c.author ? normalize(c.author) : ''
    const cr = c.artist ? normalize(c.artist) : ''
    const authorMatch = na ? (ca.includes(na) || na.includes(ca)) : false
    const artistMatch = nr ? (cr.includes(nr) || nr.includes(cr)) : false
    return authorMatch || artistMatch
  }

  // Pass 1 — exact title + author/artist
  if (na || nr) {
    for (const c of candidates) {
      if (normalize(c.title) === nq && authorArtistConfirmed(c)) return c.id
    }
  }

  // Pass 2 — exact title only
  for (const c of candidates) {
    if (normalize(c.title) === nq) return c.id
  }

  // Pass 3 — bidirectional contains + author/artist required
  // Handles DB titles like "The Novel's Extra (2022)" when we search "The Novel's Extra"
  if (na || nr) {
    for (const c of candidates) {
      const ct = normalize(c.title)
      const isContained = ct.includes(nq) || nq.includes(ct)
      if (isContained && ct !== nq && authorArtistConfirmed(c)) return c.id
    }
  }

  return null
}

// ── Build all query titles ─────────────────────────────────────────
// Uses the main title + any alternative_titles stored on the rec.
// We deduplicate and try each until we get a match.
function buildQueryTitles(title: string, alternativeTitles?: string[] | null): string[] {
  const seen = new Set<string>()
  const out:  string[] = []
  for (const t of [title, ...(alternativeTitles ?? [])]) {
    const n = normalize(t)
    if (n && !seen.has(n)) { seen.add(n); out.push(t) }
  }
  return out
}

// ── MangaUpdates ──────────────────────────────────────────────────
async function findMangaUpdatesID(
  titles: string[], author?: string | null, artist?: string | null,
): Promise<string | null> {
  for (const title of titles) {
    try {
      await new Promise(r => setTimeout(r, API_DELAY_MS))
      const res = await fetchWithTimeout('https://api.mangaupdates.com/v1/series/search', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ search: title, perpage: 15 }),
      })
      if (!res.ok) continue
      const data       = await res.json()
      const candidates = (data.results ?? []).map((r: any) => ({
        id:     String(r.record?.series_id ?? ''),
        title:  r.record?.title ?? '',
        author: r.record?.author ?? '',
        artist: r.record?.artist ?? '',
      }))
      const match = smartMatch(title, candidates, author, artist)
      if (match) return match
    } catch (err) {
      console.error(`MU error for "${title}":`, err)
    }
  }
  return null
}

// ── MangaBaka ─────────────────────────────────────────────────────
// Fixed domain: api.mangabaka.org (was api.mangabaka.dev — now 404s)
async function findMangaBakaID(
  titles: string[], author?: string | null, artist?: string | null,
): Promise<string | null> {
  for (const title of titles) {
    try {
      await new Promise(r => setTimeout(r, API_DELAY_MS))
      const res = await fetchWithTimeout(
        `https://api.mangabaka.org/series/search?q=${encodeURIComponent(title)}&limit=15`,
      )
      if (!res.ok) continue
      const data       = await res.json()
      const candidates = (data.data ?? data.results ?? []).map((r: any) => ({
        id:     String(r.id ?? r.series_id ?? ''),
        title:  r.title ?? r.name ?? '',
        author: r.author ?? '',
        artist: r.artist ?? '',
      }))
      const match = smartMatch(title, candidates, author, artist)
      if (match) return match
    } catch (err) {
      console.error(`MB error for "${title}":`, err)
    }
  }
  return null
}

// ── MangaDex ──────────────────────────────────────────────────────
async function findMangaDexID(
  titles: string[], author?: string | null, artist?: string | null,
): Promise<string | null> {
  for (const title of titles) {
    try {
      await new Promise(r => setTimeout(r, API_DELAY_MS))
      const res = await fetchWithTimeout(
        `https://api.mangadex.org/manga?title=${encodeURIComponent(title)}&limit=15&includes[]=author&includes[]=artist`,
      )
      if (!res.ok) continue
      const data       = await res.json()
      const candidates = (data.data ?? []).map((r: any) => {
        const attr       = r.attributes ?? {}
        // MangaDex stores titles in multiple languages — try en first, then any
        const titleEn    = attr.title?.en || Object.values(attr.title ?? {})[0] || ''
        const rels       = r.relationships ?? []
        const authorName = rels.find((rel: any) => rel.type === 'author')?.attributes?.name ?? ''
        const artistName = rels.find((rel: any) => rel.type === 'artist')?.attributes?.name ?? ''
        return { id: String(r.id ?? ''), title: String(titleEn), author: authorName, artist: artistName }
      })
      const match = smartMatch(title, candidates, author, artist)
      if (match) return match
    } catch (err) {
      console.error(`MD error for "${title}":`, err)
    }
  }
  return null
}

// ── AniList ───────────────────────────────────────────────────────
async function findAniListID(
  titles: string[], author?: string | null, artist?: string | null,
): Promise<string | null> {
  for (const title of titles) {
    try {
      await new Promise(r => setTimeout(r, API_DELAY_MS))
      const gql = `query($search:String){Page(perPage:15){media(search:$search,type:MANGA,sort:SEARCH_MATCH){id title{english romaji native}staff(perPage:10){edges{role node{name{full}}}}}}}`
      const res = await fetchWithTimeout('https://graphql.anilist.co', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ query: gql, variables: { search: title } }),
      })
      if (!res.ok) continue
      const data       = await res.json()
      const candidates = (data?.data?.Page?.media ?? []).map((r: any) => {
        const edges      = r.staff?.edges ?? []
        const authorName = edges.find((e: any) => e.role?.toLowerCase().includes('story'))?.node?.name?.full ?? ''
        const artistName = edges.find((e: any) => e.role?.toLowerCase().includes('art'))?.node?.name?.full ?? ''
        return {
          id:     String(r.id ?? ''),
          title:  r.title?.english || r.title?.romaji || r.title?.native || '',
          author: authorName,
          artist: artistName,
        }
      })
      const match = smartMatch(title, candidates, author, artist)
      if (match) return match
    } catch (err) {
      console.error(`AL error for "${title}":`, err)
    }
  }
  return null
}

// ── Jikan (MAL) ───────────────────────────────────────────────────
async function findJikanID(
  titles: string[], author?: string | null, artist?: string | null,
): Promise<string | null> {
  for (const title of titles) {
    try {
      await new Promise(r => setTimeout(r, API_DELAY_MS))
      const res = await fetchWithTimeout(
        `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(title)}&limit=15`,
      )
      if (!res.ok) continue
      const data       = await res.json()
      const candidates = (data.data ?? []).map((r: any) => {
        const authors    = r.authors ?? []
        const authorName = authors.find((a: any) => a.type === 'Story')?.name ?? authors[0]?.name ?? ''
        const artistName = authors.find((a: any) => a.type === 'Art')?.name ?? ''
        return {
          id:     String(r.mal_id ?? ''),
          title:  r.title_english || r.title || '',
          author: authorName,
          artist: artistName,
        }
      })
      const match = smartMatch(title, candidates, author, artist)
      if (match) return match
    } catch (err) {
      console.error(`Jikan error for "${title}":`, err)
    }
  }
  return null
}

// ── Main ID finder ────────────────────────────────────────────────
async function findExternalIds(
  title:             string,
  author?:           string | null,
  artist?:           string | null,
  alternativeTitles?: string[] | null,
): Promise<Record<string, string | undefined>> {
  const ids:    Record<string, string | undefined> = {}
  const titles = buildQueryTitles(title, alternativeTitles)

  const muId  = await findMangaUpdatesID(titles, author, artist)
  if (muId)  ids.mangaupdates_id = muId

  const mbId  = await findMangaBakaID(titles, author, artist)
  if (mbId)  ids.mangabaka_id = mbId

  const mdId  = await findMangaDexID(titles, author, artist)
  if (mdId)  ids.mangadex_id = mdId

  const alId  = await findAniListID(titles, author, artist)
  if (alId)  ids.anilist_id = alId

  const malId = await findJikanID(titles, author, artist)
  if (malId) ids.mal_id = malId

  return ids
}

// ── Logging ───────────────────────────────────────────────────────
interface IDCheckLog {
  comic_id:          string
  comic_title:       string
  comic_author?:     string
  comic_artist?:     string
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
    comic.anilist_id,      comic.mal_id,
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
    .select('id, title, alternative_titles, author, artist, mangaupdates_id, mangabaka_id, mangadex_id, anilist_id, mal_id, last_id_check')
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

      // All 5 IDs already confirmed — skip
      if (currentIdCount === 5) {
        skippedComplete++
        await supabase.from('recommendations').update({ last_id_check: timestamp }).eq('id', comic.id)
        logs.push({
          comic_id: comic.id, comic_title: comic.title,
          databases_checked: [], ids_found: {},
          status: 'skipped_complete', total_ids_found: 5,
          reason: 'Already complete', timestamp,
        })
        continue
      }

      const ids        = await findExternalIds(comic.title, comic.author, comic.artist, comic.alternative_titles)
      const totalFound = Object.values(ids).filter(Boolean).length

      // Merge: never overwrite a confirmed existing ID
      const mergedIds = {
        mangaupdates_id: comic.mangaupdates_id || ids.mangaupdates_id,
        mangabaka_id:    comic.mangabaka_id    || ids.mangabaka_id,
        mangadex_id:     comic.mangadex_id     || ids.mangadex_id,
        anilist_id:      comic.anilist_id      || ids.anilist_id,
        mal_id:          comic.mal_id          || ids.mal_id,
      }

      const newIdCount = countExternalIds(mergedIds)
      let status: IDCheckLog['status'] = 'found_none'
      if (newIdCount === 5)    status = 'found_all'
      else if (totalFound > 0) status = 'found_some'

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
        comic_id:          comic.id,
        comic_title:       comic.title,
        comic_author:      comic.author,
        comic_artist:      comic.artist,
        databases_checked: ['MU', 'MB', 'MD', 'AL', 'Jikan'],
        ids_found:         mergedIds,
        status,
        total_ids_found:   newIdCount,
        timestamp,
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