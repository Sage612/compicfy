import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BATCH_SIZE         = 5
const COOLDOWN_HOURS     = 5
const API_DELAY_MS       = 600
const REQUEST_TIMEOUT_MS = 8000
const LOCK_NAME          = 'id_checker'
const LOCK_DURATION_MS   = 55_000
const YEAR_TOLERANCE = 1
const TIME_BUDGET_MS = 22_000

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

function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

type NormalizedFormat = 'manga' | 'novel' | 'other'

function normalizeFormat(raw: string | null | undefined): NormalizedFormat {
  if (!raw) return 'other'
  const r = raw.toLowerCase().trim()

  // Explicitly exclude prose/novel formats — this is the core fix.
  // Light novels, novels, and web novels must never satisfy a manga match.
  if (
    r === 'novel' ||
    r === 'light novel' ||
    r === 'light_novel' ||
    r === 'web novel' ||
    r === 'web_novel' ||
    r.includes('novel')
  ) {
    return 'novel'
  }

  if (
    r === 'manga' ||
    r === 'manhwa' ||
    r === 'manhua' ||
    r === 'comic' ||
    r === 'comics' ||
    r === 'one-shot' ||
    r === 'one_shot' ||
    r === 'oneshot' ||
    r === 'doujinshi' ||
    r === 'oel'
  ) {
    return 'manga'
  }

  return 'other'
}

interface Candidate {
  id:      string
  title:   string
  author?: string
  artist?: string
  year?:   number | null
  format:  NormalizedFormat
}

function smartMatch(
  query:          string,
  candidates:     Candidate[],
  authorHint?:    string | null,
  artistHint?:    string | null,
  yearHint?:      number | null,
  yearConfidence: 'unverified' | 'confirmed' = 'unverified',
  expectedFormat: NormalizedFormat = 'manga',
): string | null {
  const nq = normalize(query)
  const na = authorHint ? normalize(authorHint) : null
  const nr = artistHint ? normalize(artistHint) : null

  // ── HARD FILTER: drop any candidate that isn't the expected format ──
  // This must happen before any title/author/year logic runs. Previously,
  // a light novel with a matching title/author/year would satisfy every
  // downstream check because nothing ever looked at format at all.
  const formatFiltered = candidates.filter(c => c.format === expectedFormat)

  // If filtering wipes out every candidate, it means this source only had
  // e.g. a light novel entry and no manga entry — correctly return null
  // rather than falling back to the wrong-format candidates.
  const pool = formatFiltered

  const authorArtistConfirmed = (c: Candidate): boolean => {
    if (!na && !nr) return false
    const ca = c.author ? normalize(c.author) : ''
    const cr = c.artist ? normalize(c.artist) : ''
    const authorMatch = na ? (ca.includes(na) || na.includes(ca)) : false
    const artistMatch = nr ? (cr.includes(nr) || nr.includes(cr)) : false
    return authorMatch || artistMatch
  }

  const yearConfirmed = (c: Candidate): boolean => {
    if (!yearHint || !c.year) return false
    return Math.abs(c.year - yearHint) <= YEAR_TOLERANCE
  }

  const exactTitleMatches = pool.filter(c => normalize(c.title) === nq)

  if (yearHint && yearConfidence === 'confirmed') {
    const yearMatch = exactTitleMatches.find(yearConfirmed)
    if (yearMatch) return yearMatch.id
  }

  if (na || nr) {
    const match = exactTitleMatches.find(authorArtistConfirmed)
    if (match) return match.id
  }

  if ((na || nr) && yearHint && exactTitleMatches.length > 1) {
    const tiedOnAuthor = exactTitleMatches.filter(authorArtistConfirmed)
    if (tiedOnAuthor.length > 1) {
      const closest = tiedOnAuthor.find(yearConfirmed)
      if (closest) return closest.id
    }
  }

  if (exactTitleMatches.length > 1 && yearHint) {
    const yearTiebreak = exactTitleMatches.find(yearConfirmed)
    if (yearTiebreak) return yearTiebreak.id
  }
  if (exactTitleMatches.length > 0) return exactTitleMatches[0].id

  if (na || nr) {
    for (const c of pool) {
      const ct = normalize(c.title)
      const isContained = ct.includes(nq) || nq.includes(ct)
      if (isContained && ct !== nq && authorArtistConfirmed(c)) return c.id
    }
  }

  if (yearHint && yearConfidence === 'confirmed') {
    for (const c of pool) {
      const ct = normalize(c.title)
      const isContained = ct.includes(nq) || nq.includes(ct)
      if (isContained && ct !== nq && yearConfirmed(c)) return c.id
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

// MangaUpdates' /v1/series/search endpoint does NOT include a `type` field
// in its response — confirmed by direct inspection of production API output.
// The `type` field (Manga/Manhwa/Manhua/Novel/etc.) only exists on the
// /v1/series/{id} DETAIL endpoint. This is the actual root cause of novel
// IDs slipping through: every search-result candidate was silently
// normalizing to format 'other' (since r.record.type was always undefined),
// which should have made every MU candidate fail the 'manga' filter — but
// some searches (e.g. by a Korean alternate title) returned only ONE
// candidate that happened to BE the novel, and with no format signal at
// all from the search response, smartMatch had nothing wrong-looking to
// reject it on title/author/year grounds alone.
//
// Fix: after getting search candidates, fetch the detail endpoint for the
// top few candidates to get their real `type`, and use THAT for format
// filtering instead of the (nonexistent) type field on the search response.
async function fetchMUDetailType(seriesId: string): Promise<NormalizedFormat> {
  try {
    await new Promise(r => setTimeout(r, API_DELAY_MS))
    const res = await fetchWithTimeout(`https://api.mangaupdates.com/v1/series/${seriesId}`)
    if (!res.ok) return 'other'
    const data = await res.json()
    return normalizeFormat(data?.type ?? null)
  } catch (err) {
    console.error(`MU detail fetch error for series ${seriesId}:`, err)
    return 'other'
  }
}

async function findMangaUpdatesID(
  titles: string[], author?: string | null, artist?: string | null,
  year?: number | null, yearConfidence?: 'unverified' | 'confirmed',
): Promise<{ id: string | null; year: number | null }> {
  for (const title of titles) {
    try {
      await new Promise(r => setTimeout(r, API_DELAY_MS))
      const res = await fetchWithTimeout('https://api.mangaupdates.com/v1/series/search', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ search: title, perpage: 15 }),
      })
      if (!res.ok) continue
      const data = await res.json()
      const rawResults = (data.results ?? []) as any[]

      // Build candidates WITHOUT format first — the search endpoint can't
      // tell us that. Cap detail lookups to the top 3 raw results — this
      // covers realistic cases (a manga + its novel counterpart both
      // appearing near the top) without hammering MU's API per title.
      const candidatesNoFormat = rawResults.slice(0, 3).map((r: any) => ({
        id:     String(r.record?.series_id ?? ''),
        title:  r.record?.title ?? '',
        author: r.record?.author ?? '',
        artist: r.record?.artist ?? '',
        year:   r.record?.year ? Number(r.record.year) : null,
      }))

      // Fetch real format from the detail endpoint for each candidate,
      // IN PARALLEL — otherwise 3 sequential detail calls (each preceded
      // by API_DELAY_MS) would stack into 1.8+ seconds just for MU alone,
      // eating into the per-comic TIME_BUDGET_MS. Parallelizing bounds
      // this to roughly the slowest single detail call instead.
      const candidates: Candidate[] = await Promise.all(
        candidatesNoFormat.map(async (c) => ({
          ...c,
          format: c.id ? await fetchMUDetailType(c.id) : 'other' as NormalizedFormat,
        }))
      )

      const matchId = smartMatch(title, candidates, author, artist, year, yearConfidence, 'manga')
      if (matchId) {
        const matched = candidates.find(c => c.id === matchId)
        return { id: matchId, year: matched?.year ?? null }
      }
    } catch (err) {
      console.error(`MU error for "${title}":`, err)
    }
  }
  return { id: null, year: null }
}

async function findMangaDexID(
  titles: string[], author?: string | null, artist?: string | null,
  year?: number | null, yearConfidence?: 'unverified' | 'confirmed',
): Promise<{ id: string | null; year: number | null }> {
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
          year:   attr.year ? Number(attr.year) : null,
          // MangaDex's catalog is comics-only (no light novel entries), so
          // everything returned here is safely treated as 'manga'. This is
          // a structural guarantee from the source, not a guess.
          format: 'manga' as NormalizedFormat,
        }
      })
      const matchId = smartMatch(title, candidates, author, artist, year, yearConfidence, 'manga')
      if (matchId) {
        const matched = candidates.find(c => c.id === matchId)
        return { id: matchId, year: matched?.year ?? null }
      }
    } catch (err) {
      console.error(`MD error for "${title}":`, err)
    }
  }
  return { id: null, year: null }
}

async function findAniListID(
  titles: string[], author?: string | null, artist?: string | null,
  year?: number | null, yearConfidence?: 'unverified' | 'confirmed',
): Promise<{ id: string | null; year: number | null }> {
  for (const title of titles) {
    try {
      await new Promise(r => setTimeout(r, API_DELAY_MS))
      // NOTE: 'format' added to the query so we can filter out NOVEL entries.
      const gql = `query($search:String){Page(perPage:15){media(search:$search,type:MANGA,sort:SEARCH_MATCH){id title{english romaji native}format startDate{year}staff(perPage:10){edges{role node{name{full}}}}}}}`
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
          year:   r.startDate?.year ? Number(r.startDate.year) : null,
          // AniList format enum: MANGA, NOVEL, ONE_SHOT, etc.
          // type:MANGA in the query already excludes anime, but NOVEL
          // (light novels) still comes back under type:MANGA in their schema.
          format: normalizeFormat(r.format ?? null),
        }
      })
      const matchId = smartMatch(title, candidates, author, artist, year, yearConfidence, 'manga')
      if (matchId) {
        const matched = candidates.find(c => c.id === matchId)
        return { id: matchId, year: matched?.year ?? null }
      }
    } catch (err) {
      console.error(`AL error for "${title}":`, err)
    }
  }
  return { id: null, year: null }
}

async function findJikanID(
  titles: string[], author?: string | null, artist?: string | null,
  year?: number | null, yearConfidence?: 'unverified' | 'confirmed',
): Promise<{ id: string | null; year: number | null }> {
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
        const publishedYear = r.published?.from ? new Date(r.published.from).getFullYear() : null
        return {
          id:     String(r.mal_id ?? ''),
          title:  r.title_english || r.title || '',
          author: authorName,
          artist: artistName,
          year:   publishedYear,
          // Jikan/MAL 'type' field: Manga, Novel, Light Novel, Manhwa,
          // Manhua, One-shot, Doujinshi, OEL.
          format: normalizeFormat(r.type ?? null),
        }
      })
      const matchId = smartMatch(title, candidates, author, artist, year, yearConfidence, 'manga')
      if (matchId) {
        const matched = candidates.find(c => c.id === matchId)
        return { id: matchId, year: matched?.year ?? null }
      }
    } catch (err) {
      console.error(`Jikan error for "${title}":`, err)
    }
  }
  return { id: null, year: null }
}

async function findExternalIds(
  title:              string,
  author?:            string | null,
  artist?:            string | null,
  alternativeTitles?: string[] | null,
  year?:              number | null,
  yearConfidence?:    'unverified' | 'confirmed',
): Promise<{
  ids:   Record<string, string | undefined>
  years: Record<string, number | null>
}> {
  const ids:   Record<string, string | undefined> = {}
  const years: Record<string, number | null>       = {}
  const titles = buildQueryTitles(title, alternativeTitles)

  const [mu, md, al, mal] = await Promise.all([
    findMangaUpdatesID(titles, author, artist, year, yearConfidence),
    findMangaDexID(titles, author, artist, year, yearConfidence),
    findAniListID(titles, author, artist, year, yearConfidence),
    findJikanID(titles, author, artist, year, yearConfidence),
  ])

  if (mu.id)  { ids.mangaupdates_id = mu.id;  years.mangaupdates_id = mu.year }
  if (md.id)  { ids.mangadex_id     = md.id;  years.mangadex_id     = md.year }
  if (al.id)  { ids.anilist_id      = al.id;  years.anilist_id      = al.year }
  if (mal.id) { ids.mal_id          = mal.id; years.mal_id          = mal.year }

  return { ids, years }
}

function deriveYearConsensus(
  years: Record<string, number | null>,
): { consensusYear: number | null; outlierSources: string[] } {
  const entries = Object.entries(years).filter(([, y]) => y !== null) as [string, number][]
  if (entries.length === 0) return { consensusYear: null, outlierSources: [] }
  if (entries.length === 1) return { consensusYear: entries[0][1], outlierSources: [] }

  const clusters: { year: number; sources: string[] }[] = []
  for (const [source, year] of entries) {
    const existing = clusters.find(c => Math.abs(c.year - year) <= YEAR_TOLERANCE)
    if (existing) existing.sources.push(source)
    else clusters.push({ year, sources: [source] })
  }
  clusters.sort((a, b) => b.sources.length - a.sources.length)

  const winner = clusters[0]
  if (winner.sources.length < 2) {
    return { consensusYear: null, outlierSources: entries.map(([s]) => s) }
  }

  const outlierSources = entries
    .filter(([s, y]) => !winner.sources.includes(s) || Math.abs(y - winner.year) > YEAR_TOLERANCE)
    .map(([s]) => s)

  return { consensusYear: winner.year, outlierSources }
}

interface IDCheckLog {
  comic_id:          string
  comic_title:       string
  comic_author?:     string
  comic_artist?:     string
  comic_year_before?: number | null
  comic_year_after?:  number | null
  year_corrected:     boolean
  databases_checked: string[]
  ids_found:         Record<string, string | undefined>
  outlier_sources:   string[]
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

const TOTAL_ID_SOURCES = 4

function countExternalIds(comic: any): number {
  return [
    comic.mangaupdates_id, comic.mangadex_id,
    comic.anilist_id,      comic.mal_id,
  ].filter(id => id && String(id).trim()).length
}

async function acquireLock(supabase: any): Promise<boolean> {
  const { data: existing } = await supabase
    .from('cron_locks')
    .select('locked_until')
    .eq('job_name', LOCK_NAME)
    .maybeSingle()

  if (existing && new Date(existing.locked_until) > new Date()) return false

  await supabase
    .from('cron_locks')
    .upsert({ job_name: LOCK_NAME, locked_until: new Date(Date.now() + LOCK_DURATION_MS).toISOString() })

  return true
}

async function releaseLock(supabase: any) {
  await supabase.from('cron_locks').delete().eq('job_name', LOCK_NAME)
}

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
      .select('id, title, alternative_titles, author, artist, year_released, year_confidence, mangaupdates_id, mangadex_id, anilist_id, mal_id, last_id_check')
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

    let foundAll = 0, foundSome = 0, foundNone = 0, skippedComplete = 0, yearsCorrected = 0
    let timedOutEarly = false
    const runStart = Date.now()
    const logs: IDCheckLog[] = []

    for (const comic of comics) {
      if (Date.now() - runStart > TIME_BUDGET_MS) {
        timedOutEarly = true
        break
      }

      const timestamp = new Date().toISOString()

      try {
        const currentIdCount  = countExternalIds(comic)
        const yearConfidence: 'unverified' | 'confirmed' = comic.year_confidence ?? 'unverified'

        if (currentIdCount === TOTAL_ID_SOURCES && yearConfidence === 'confirmed') {
          skippedComplete++
          await supabase.from('recommendations').update({ last_id_check: timestamp }).eq('id', comic.id)
          logs.push({
            comic_id: comic.id, comic_title: comic.title,
            comic_year_before: comic.year_released, comic_year_after: comic.year_released,
            year_corrected: false,
            databases_checked: [], ids_found: {}, outlier_sources: [],
            status: 'skipped_complete', total_ids_found: TOTAL_ID_SOURCES,
            reason: 'Already complete and year confirmed', timestamp,
          })
          continue
        }

        const { ids, years } = await findExternalIds(
          comic.title, comic.author, comic.artist, comic.alternative_titles,
          comic.year_released ?? null, yearConfidence,
        )
        const totalFound = Object.values(ids).filter(Boolean).length

        const mergedIds = {
          mangaupdates_id: comic.mangaupdates_id || ids.mangaupdates_id,
          mangadex_id:     comic.mangadex_id     || ids.mangadex_id,
          anilist_id:      comic.anilist_id      || ids.anilist_id,
          mal_id:          comic.mal_id          || ids.mal_id,
        }

        const { consensusYear, outlierSources } = deriveYearConsensus(years)

        const updatePayload: Record<string, any> = { ...mergedIds, last_id_check: timestamp }
        let yearCorrected = false

        if (consensusYear !== null) {
          const currentYear = comic.year_released ?? null
          const disagrees    = currentYear === null || Math.abs(currentYear - consensusYear) > YEAR_TOLERANCE
          if (disagrees) {
            updatePayload.year_released   = consensusYear
            updatePayload.year_confidence = 'confirmed'
            yearCorrected = true
            yearsCorrected++
          } else if (yearConfidence === 'unverified') {
            updatePayload.year_confidence = 'confirmed'
          }
        }

        if (consensusYear !== null && outlierSources.length > 0) {
          for (const src of outlierSources) {
            updatePayload[src] = null
          }
        }

        await supabase.from('recommendations').update(updatePayload).eq('id', comic.id)

        const newIdCount = countExternalIds({ ...mergedIds, ...updatePayload })
        let status: IDCheckLog['status'] = 'found_none'
        if (newIdCount === TOTAL_ID_SOURCES) status = 'found_all'
        else if (totalFound > 0)             status = 'found_some'
        if (totalFound > 0) { if (status === 'found_all') foundAll++; else foundSome++ }
        else foundNone++

        logs.push({
          comic_id:           comic.id,
          comic_title:        comic.title,
          comic_author:       comic.author,
          comic_artist:       comic.artist,
          comic_year_before:  comic.year_released ?? null,
          comic_year_after:   updatePayload.year_released ?? comic.year_released ?? null,
          year_corrected:     yearCorrected,
          databases_checked:  ['MU', 'MD', 'AL', 'Jikan'],
          ids_found:          mergedIds,
          outlier_sources:    outlierSources,
          status,
          total_ids_found:    newIdCount,
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
          comic_year_before: comic.year_released ?? null, comic_year_after: comic.year_released ?? null,
          year_corrected: false,
          databases_checked: [], ids_found: {}, outlier_sources: [],
          status: 'found_none', total_ids_found: 0,
          reason: err?.message ?? 'Unknown error', timestamp,
        })
      }
    }

    for (const log of logs) await logIDCheck(supabase, log)

    return NextResponse.json({
      processed:          logs.length,
      fetched_this_batch: comics.length,
      found_all:          foundAll,
      found_some:         foundSome,
      found_none:         foundNone,
      skipped_complete:   skippedComplete,
      years_corrected:    yearsCorrected,
      logs_count:         logs.length,
      timed_out_early:    timedOutEarly,
    })
  } finally {
    await releaseLock(supabase)
  }
}