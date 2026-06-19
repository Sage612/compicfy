import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BATCH_SIZE         = 5
const COOLDOWN_HOURS     = 5
const API_DELAY_MS       = 600
const REQUEST_TIMEOUT_MS = 8000


const RECHECK_FLAG = 'id_needs_recheck'

interface MangaDexCandidate {
  id:     string
  title:  string
  author: string
  artist: string
  mu:     string | null
  mal:    string | null
  al:     string | null
  kt:     string | null
}

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
  return str.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim()
}

// ── Smart match ───────────────────────────────────────────────────
// Pass 1: exact title + author/artist confirmation  → most trusted
// Pass 2: exact title only                          → accepted
// Pass 3: bidirectional contains + author/artist    → handles "(2022)" suffix variants
function smartMatch(
  query:       string,
  candidates:  { id: string; title: string; author?: string; artist?: string }[],
  authorHint?: string | null,
  artistHint?: string | null,
): string | null {
  const nq = normalize(query)
  const na = authorHint ? normalize(authorHint) : null
  const nr = artistHint ? normalize(artistHint) : null

  const confirmed = (c: { author?: string; artist?: string }): boolean => {
    if (!na && !nr) return false
    const ca = c.author ? normalize(c.author) : ''
    const cr = c.artist ? normalize(c.artist) : ''
    return (na ? ca.includes(na) || na.includes(ca) : false) ||
           (nr ? cr.includes(nr) || nr.includes(cr) : false)
  }

  // Pass 1 — exact + confirmed
  if (na || nr) {
    for (const c of candidates) {
      if (normalize(c.title) === nq && confirmed(c)) return c.id
    }
  }

  // Pass 2 — exact title only
  for (const c of candidates) {
    if (normalize(c.title) === nq) return c.id
  }

  // Pass 3 — contains match + author/artist required
  // e.g. "The Novel's Extra" matches "The Novel's Extra (2022)"
  if (na || nr) {
    for (const c of candidates) {
      const ct = normalize(c.title)
      if ((ct.includes(nq) || nq.includes(ct)) && ct !== nq && confirmed(c)) return c.id
    }
  }

  return null
}

function buildQueryTitles(title: string, alternativeTitles?: string[] | null): string[] {
  const seen = new Set<string>()
  const out:  string[] = []
  for (const t of [title, ...(alternativeTitles ?? [])]) {
    const n = normalize(t)
    if (n && !seen.has(n)) { seen.add(n); out.push(t) }
  }
  return out
}

async function findMangaDexIDAndCrossLinks(
  titles: string[],
  author?: string | null,
  artist?: string | null,
): Promise<{ mangadex_id: string | null; crossLinks: Record<string, string> }> {
  for (const title of titles) {
    try {
      await new Promise(r => setTimeout(r, API_DELAY_MS))
      const res = await fetchWithTimeout(
        `https://api.mangadex.org/manga?title=${encodeURIComponent(title)}&limit=15&includes[]=author&includes[]=artist`,
      )
      if (!res.ok) continue
      const data = await res.json()

      const entries: MangaDexCandidate[] = (data.data ?? []).map((r: any) => {
        const attr       = r.attributes ?? {}
        const titleEn    = attr.title?.en || Object.values(attr.title ?? {})[0] || ''
        const rels       = r.relationships ?? []
        const authorName = rels.find((rel: any) => rel.type === 'author')?.attributes?.name ?? ''
        const artistName = rels.find((rel: any) => rel.type === 'artist')?.attributes?.name ?? ''
        const links      = attr.links ?? {}
        return {
          id:     String(r.id ?? ''),
          title:  String(titleEn),
          author: authorName,
          artist: artistName,
          mu:     links.mu  ? String(links.mu)  : null,
          mal:    links.mal ? String(links.mal)  : null,
          al:     links.al  ? String(links.al)   : null,
          kt:     links.kt  ? String(links.kt)   : null,
        }
      })

      const matchId = smartMatch(title, entries, author, artist)
      if (matchId) {
        const matched = entries.find((e: MangaDexCandidate) => e.id === matchId)
        const crossLinks: Record<string, string> = {}
        if (matched?.mu)  crossLinks.mangaupdates_id = matched.mu
        if (matched?.mal) crossLinks.mal_id          = matched.mal
        if (matched?.al)  crossLinks.anilist_id      = matched.al
        if (matched?.kt)  crossLinks.kitsu_id        = matched.kt
        return { mangadex_id: matchId, crossLinks }
      }
    } catch (err) {
      console.error(`MD error for "${title}":`, err)
    }
  }
  return { mangadex_id: null, crossLinks: {} }
}

// ── Enrich from existing MangaDex ID ─────────────────────────────
// Already have mangadex_id but missing others → fetch its links directly.
// Zero search needed, guaranteed same series.
async function enrichFromMangaDexLinks(mangadexId: string): Promise<Record<string, string>> {
  try {
    await new Promise(r => setTimeout(r, API_DELAY_MS))
    const res = await fetchWithTimeout(`https://api.mangadex.org/manga/${mangadexId}`)
    if (!res.ok) return {}
    const data  = await res.json()
    const links = data?.data?.attributes?.links ?? {}
    const out: Record<string, string> = {}
    if (links.mu)  out.mangaupdates_id = String(links.mu)
    if (links.mal) out.mal_id          = String(links.mal)
    if (links.al)  out.anilist_id      = String(links.al)
    if (links.kt)  out.kitsu_id        = String(links.kt)
    return out
  } catch (err) {
    console.error(`MD enrich error for ${mangadexId}:`, err)
    return {}
  }
}

// ── MangaUpdates — fallback search ────────────────────────────────
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

// ── AniList — fallback search ─────────────────────────────────────
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

// ── Jikan (MAL) — fallback search ────────────────────────────────
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

async function findExternalIds(
  title:               string,
  author?:             string | null,
  artist?:             string | null,
  alternativeTitles?:  string[] | null,
  existingMangaDexId?: string | null,
  forceRecheck?:       boolean,
): Promise<Record<string, string | undefined>> {
  const ids:    Record<string, string | undefined> = {}
  const titles = buildQueryTitles(title, alternativeTitles)

  // If recheck forced, skip the existing MD id enrichment
  // and do a fresh search so wrong IDs get replaced
  const useExistingMD = existingMangaDexId && !forceRecheck

  // Step 1: enrich from existing MangaDex ID
  if (useExistingMD) {
    const crossLinks = await enrichFromMangaDexLinks(existingMangaDexId!)
    Object.assign(ids, crossLinks)
    ids.mangadex_id = existingMangaDexId!
  }

  // Step 2: search MangaDex if still needed
  if (!ids.mangadex_id) {
    const { mangadex_id, crossLinks } = await findMangaDexIDAndCrossLinks(titles, author, artist)
    if (mangadex_id) {
      ids.mangadex_id = mangadex_id
      Object.assign(ids, crossLinks)
    }
  }

  // Step 3: individual fallbacks for anything still missing
  if (!ids.mangaupdates_id) {
    const muId = await findMangaUpdatesID(titles, author, artist)
    if (muId) ids.mangaupdates_id = muId
  }

  if (!ids.anilist_id) {
    const alId = await findAniListID(titles, author, artist)
    if (alId) ids.anilist_id = alId
  }

  if (!ids.mal_id) {
    const malId = await findJikanID(titles, author, artist)
    if (malId) ids.mal_id = malId
  }

  // kitsu_id comes entirely from MangaDex cross-links (kt field)
  // No separate Kitsu search needed — it's in the cross-links above

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
  recheck?:          boolean
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

// 5 sources: MU, MD, AL, MAL, Kitsu
// Kitsu comes via MangaDex cross-links so no separate search,
// but it still counts as a tracked ID
const TOTAL_ID_SOURCES = 5

function countExternalIds(comic: any): number {
  return [
    comic.mangaupdates_id,
    comic.mangadex_id,
    comic.anilist_id,
    comic.mal_id,
    comic.kitsu_id,
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
    .select('id, title, alternative_titles, author, artist, mangaupdates_id, mangadex_id, anilist_id, mal_id, kitsu_id, id_needs_recheck, last_id_check')
    .eq('is_approved', true)
    .or(`last_id_check.is.null,last_id_check.lt.${cooloffCutoff},id_needs_recheck.eq.true`)
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
    const timestamp    = new Date().toISOString()
    const forceRecheck = !!(comic as any).id_needs_recheck

    try {
      const currentIdCount = countExternalIds(comic)

      // Skip only if complete AND not flagged for recheck
      if (currentIdCount === TOTAL_ID_SOURCES && !forceRecheck) {
        skippedComplete++
        await supabase.from('recommendations').update({ last_id_check: timestamp }).eq('id', comic.id)
        logs.push({
          comic_id: comic.id, comic_title: comic.title,
          databases_checked: [], ids_found: {},
          status: 'skipped_complete', total_ids_found: TOTAL_ID_SOURCES,
          reason: 'Already complete', timestamp,
        })
        continue
      }

      const ids = await findExternalIds(
        comic.title,
        comic.author,
        comic.artist,
        comic.alternative_titles,
        comic.mangadex_id,
        forceRecheck,
      )

      const totalFound = Object.values(ids).filter(Boolean).length

      // If recheck: replace all IDs with fresh results
      // If normal:  never overwrite a confirmed existing ID
      const mergedIds = forceRecheck
        ? {
            mangaupdates_id: ids.mangaupdates_id || null,
            mangadex_id:     ids.mangadex_id     || null,
            anilist_id:      ids.anilist_id       || null,
            mal_id:          ids.mal_id           || null,
            kitsu_id:        ids.kitsu_id         || null,
          }
        : {
            mangaupdates_id: comic.mangaupdates_id || ids.mangaupdates_id,
            mangadex_id:     comic.mangadex_id     || ids.mangadex_id,
            anilist_id:      comic.anilist_id      || ids.anilist_id,
            mal_id:          comic.mal_id          || ids.mal_id,
            kitsu_id:        (comic as any).kitsu_id || ids.kitsu_id,
          }

      const newIdCount = countExternalIds(mergedIds)
      let status: IDCheckLog['status'] = 'found_none'
      if (newIdCount === TOTAL_ID_SOURCES) status = 'found_all'
      else if (totalFound > 0)             status = 'found_some'

      const updatePayload: any = {
        ...mergedIds,
        last_id_check:    timestamp,
        id_needs_recheck: false, // always clear the flag after processing
      }

      await supabase.from('recommendations')
        .update(updatePayload)
        .eq('id', comic.id)

      if (status === 'found_all') foundAll++
      else if (totalFound > 0)   foundSome++
      else                       foundNone++

      logs.push({
        comic_id:          comic.id,
        comic_title:       comic.title,
        comic_author:      comic.author,
        comic_artist:      comic.artist,
        databases_checked: ['MD-crosslinks', 'MU', 'AL', 'Jikan'],
        ids_found:         mergedIds,
        status,
        total_ids_found:   newIdCount,
        recheck:           forceRecheck,
        timestamp,
      })

    } catch (err: any) {
      console.error(`Error processing ${comic.title}:`, err)
      foundNone++
      await supabase.from('recommendations')
        .update({ last_id_check: new Date().toISOString(), id_needs_recheck: false })
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