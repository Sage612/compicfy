import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BATCH_SIZE         = 5
const COOLDOWN_HOURS     = 5
const API_DELAY_MS       = 600
const REQUEST_TIMEOUT_MS = 8000
const LOCK_NAME          = 'id_checker'
const LOCK_DURATION_MS   = 55_000 // just under the 1-minute cron interval

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

// ── Candidate shape ───────────────────────────────────────────────
interface Candidate {
  id:      string
  title:   string
  author?: string
  artist?: string
  year?:   number | null
}

// ── Smart match — now disambiguates by year when title/author ties exist ──
function smartMatch(
  query:      string,
  candidates: Candidate[],
  authorHint?: string | null,
  artistHint?: string | null,
  yearHint?:   number | null,
): string | null {
  const nq = normalize(query)
  const na = authorHint ? normalize(authorHint) : null
  const nr = artistHint ? normalize(artistHint) : null

  const authorArtistConfirmed = (c: Candidate): boolean => {
    if (!na && !nr) return false
    const ca = c.author ? normalize(c.author) : ''
    const cr = c.artist ? normalize(c.artist) : ''
    const authorMatch = na ? (ca.includes(na) || na.includes(ca)) : false
    const artistMatch = nr ? (cr.includes(nr) || nr.includes(cr)) : false
    return authorMatch || artistMatch
  }

  // ±1 year slack — sources disagree on "release year" vs "first chapter year"
  // often enough that exact equality is too strict.
  const yearConfirmed = (c: Candidate): boolean => {
    if (!yearHint || !c.year) return false
    return Math.abs(c.year - yearHint) <= 1
  }

  const exactTitleMatches = candidates.filter(c => normalize(c.title) === nq)

  // Pass 0 — exact title + year confirmed. Strongest available signal,
  // and the one that actually fixes the "multiple entries, same title,
  // different printing/adaptation" problem (e.g. Novel's Extra on MU).
  if (yearHint) {
    const yearMatch = exactTitleMatches.find(yearConfirmed)
    if (yearMatch) return yearMatch.id
  }

  // Pass 1 — exact title + author/artist + year ALL agree, when multiple
  // candidates tie on title alone. Covers cases where author/artist data
  // is too thin to disambiguate alone but year tips it.
  if ((na || nr) && yearHint && exactTitleMatches.length > 1) {
    const best = exactTitleMatches.find(c => authorArtistConfirmed(c) && yearConfirmed(c))
    if (best) return best.id
  }

  // Pass 2 — exact title + author/artist (no year available/confirmed)
  if (na || nr) {
    const match = exactTitleMatches.find(authorArtistConfirmed)
    if (match) return match.id
  }

  // Pass 3 — exact title only. True fallback now — only reached when no
  // year and no author/artist signal exists to disambiguate ties.
  if (exactTitleMatches.length > 0) return exactTitleMatches[0].id

  // Pass 4 — bidirectional contains + author/artist required
  if (na || nr) {
    for (const c of candidates) {
      const ct = normalize(c.title)
      const isContained = ct.includes(nq) || nq.includes(ct)
      if (isContained && ct !== nq && authorArtistConfirmed(c)) return c.id
    }
  }

  // Pass 5 — bidirectional contains + year confirmed (no author/artist available)
  if (yearHint) {
    for (const c of candidates) {
      const ct = normalize(c.title)
      const isContained = ct.includes(nq) || nq.includes(ct)
      if (isContained && ct !== nq && yearConfirmed(c)) return c.id
    }
  }

  return null
}

// ── Build all query titles ─────────────────────────────────────────
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
  titles: string[], author?: string | null, artist?: string | null, year?: number | null,
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
      const candidates: Candidate[] = (data.results ?? []).map((r: any) => ({
        id:     String(r.record?.series_id ?? ''),
        title:  r.record?.title ?? '',
        author: r.record?.author ?? '',
        artist: r.record?.artist ?? '',
        // MangaUpdates exposes "year" directly on the record
        year:   r.record?.year ? Number(r.record.year) : null,
      }))
      const match = smartMatch(title, candidates, author, artist, year)
      if (match) return match
    } catch (err) {
      console.error(`MU error for "${title}":`, err)
    }
  }
  return null
}

// ── MangaDex ──────────────────────────────────────────────────────
async function findMangaDexID(
  titles: string[], author?: string | null, artist?: string | null, year?: number | null,
): Promise<string | null> {
  for (const title of titles) {
    try {
      await new Promise(r => setTimeout(r, API_DELAY_MS))
      const res = await fetchWithTimeout(
        `https://api.mangadex.org/manga?title=${encodeURIComponent(title)}&limit=15&includes[]=author&includes[]=artist`,
      )
      if (!res.ok) continue
      const data       = await res.json()
      const candidates: Candidate[] = (data.data ?? []).map((r: any) => {
        const attr       = r.attributes ?? {}
        const titleEn    = attr.title?.en || Object.values(attr.title ?? {})[0] || ''
        const rels       = r.relationships ?? []
        const authorName = rels.find((rel: any) => rel.type === 'author')?.attributes?.name ?? ''
        const artistName = rels.find((rel: any) => rel.type === 'artist')?.attributes?.name ?? ''
        return {
          id:     String(r.id ?? ''),
          title:  String(titleEn),
          author: authorName,
          artist: artistName,
          // MangaDex exposes "year" directly on attributes
          year:   attr.year ? Number(attr.year) : null,
        }
      })
      const match = smartMatch(title, candidates, author, artist, year)
      if (match) return match
    } catch (err) {
      console.error(`MD error for "${title}":`, err)
    }
  }
  return null
}

// ── AniList ───────────────────────────────────────────────────────
async function findAniListID(
  titles: string[], author?: string | null, artist?: string | null, year?: number | null,
): Promise<string | null> {
  for (const title of titles) {
    try {
      await new Promise(r => setTimeout(r, API_DELAY_MS))
      const gql = `query($search:String){Page(perPage:15){media(search:$search,type:MANGA,sort:SEARCH_MATCH){id title{english romaji native}startDate{year}staff(perPage:10){edges{role node{name{full}}}}}}}`
      const res = await fetchWithTimeout('https://graphql.anilist.co', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ query: gql, variables: { search: title } }),
      })
      if (!res.ok) continue
      const data       = await res.json()
      const candidates: Candidate[] = (data?.data?.Page?.media ?? []).map((r: any) => {
        const edges      = r.staff?.edges ?? []
        const authorName = edges.find((e: any) => e.role?.toLowerCase().includes('story'))?.node?.name?.full ?? ''
        const artistName = edges.find((e: any) => e.role?.toLowerCase().includes('art'))?.node?.name?.full ?? ''
        return {
          id:     String(r.id ?? ''),
          title:  r.title?.english || r.title?.romaji || r.title?.native || '',
          author: authorName,
          artist: artistName,
          // AniList exposes year via startDate.year
          year:   r.startDate?.year ? Number(r.startDate.year) : null,
        }
      })
      const match = smartMatch(title, candidates, author, artist, year)
      if (match) return match
    } catch (err) {
      console.error(`AL error for "${title}":`, err)
    }
  }
  return null
}

// ── Jikan (MAL) ───────────────────────────────────────────────────
async function findJikanID(
  titles: string[], author?: string | null, artist?: string | null, year?: number | null,
): Promise<string | null> {
  for (const title of titles) {
    try {
      await new Promise(r => setTimeout(r, API_DELAY_MS))
      const res = await fetchWithTimeout(
        `https://api.jikan.moe/v4/manga?q=${encodeURIComponent(title)}&limit=15`,
      )
      if (!res.ok) continue
      const data       = await res.json()
      const candidates: Candidate[] = (data.data ?? []).map((r: any) => {
        const authors    = r.authors ?? []
        const authorName = authors.find((a: any) => a.type === 'Story')?.name ?? authors[0]?.name ?? ''
        const artistName = authors.find((a: any) => a.type === 'Art')?.name ?? ''
        // Jikan exposes "published.from" as an ISO date string
        const publishedYear = r.published?.from ? new Date(r.published.from).getFullYear() : null
        return {
          id:     String(r.mal_id ?? ''),
          title:  r.title_english || r.title || '',
          author: authorName,
          artist: artistName,
          year:   publishedYear,
        }
      })
      const match = smartMatch(title, candidates, author, artist, year)
      if (match) return match
    } catch (err) {
      console.error(`Jikan error for "${title}":`, err)
    }
  }
  return null
}

// ── Main ID finder (MangaBaka removed — API non-functional) ────────
async function findExternalIds(
  title:              string,
  author?:            string | null,
  artist?:            string | null,
  alternativeTitles?: string[] | null,
  year?:              number | null,
): Promise<Record<string, string | undefined>> {
  const ids:    Record<string, string | undefined> = {}
  const titles = buildQueryTitles(title, alternativeTitles)

  const muId  = await findMangaUpdatesID(titles, author, artist, year)
  if (muId)  ids.mangaupdates_id = muId

  const mdId  = await findMangaDexID(titles, author, artist, year)
  if (mdId)  ids.mangadex_id = mdId

  const alId  = await findAniListID(titles, author, artist, year)
  if (alId)  ids.anilist_id = alId

  const malId = await findJikanID(titles, author, artist, year)
  if (malId) ids.mal_id = malId

  return ids
}

// ── Logging ───────────────────────────────────────────────────────
interface IDCheckLog {
  comic_id:          string
  comic_title:       string
  comic_author?:     string
  comic_artist?:     string
  comic_year?:       number | null
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

// Total external ID sources tracked: MangaUpdates, MangaDex, AniList, MAL (MangaBaka removed)
const TOTAL_ID_SOURCES = 4

function countExternalIds(comic: any): number {
  return [
    comic.mangaupdates_id, comic.mangadex_id,
    comic.anilist_id,      comic.mal_id,
  ].filter(id => id && String(id).trim()).length
}

// ── Lock helpers ──────────────────────────────────────────────────
async function acquireLock(supabase: any): Promise<boolean> {
  const { data: existing } = await supabase
    .from('cron_locks')
    .select('locked_until')
    .eq('job_name', LOCK_NAME)
    .maybeSingle()

  if (existing && new Date(existing.locked_until) > new Date()) {
    return false // still locked by a previous, still-running invocation
  }

  await supabase
    .from('cron_locks')
    .upsert({ job_name: LOCK_NAME, locked_until: new Date(Date.now() + LOCK_DURATION_MS).toISOString() })

  return true
}

async function releaseLock(supabase: any) {
  await supabase.from('cron_locks').delete().eq('job_name', LOCK_NAME)
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

  const gotLock = await acquireLock(supabase)
  if (!gotLock) {
    return NextResponse.json({ message: 'Previous run still in progress, skipping this tick' })
  }

  try {
    const cooloffCutoff = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000).toISOString()

    const { data: comics, error } = await supabase
      .from('recommendations')
      .select('id, title, alternative_titles, author, artist, year_released, mangaupdates_id, mangadex_id, anilist_id, mal_id, last_id_check')
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

        if (currentIdCount === TOTAL_ID_SOURCES) {
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
          comic.year_released ?? null,
        )
        const totalFound = Object.values(ids).filter(Boolean).length

        const mergedIds = {
          mangaupdates_id: comic.mangaupdates_id || ids.mangaupdates_id,
          mangadex_id:     comic.mangadex_id     || ids.mangadex_id,
          anilist_id:      comic.anilist_id      || ids.anilist_id,
          mal_id:          comic.mal_id          || ids.mal_id,
        }

        const newIdCount = countExternalIds(mergedIds)
        let status: IDCheckLog['status'] = 'found_none'
        if (newIdCount === TOTAL_ID_SOURCES) status = 'found_all'
        else if (totalFound > 0)             status = 'found_some'

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
          comic_year:        comic.year_released ?? null,
          databases_checked: ['MU', 'MD', 'AL', 'Jikan'],
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
  } finally {
    await releaseLock(supabase)
  }
}