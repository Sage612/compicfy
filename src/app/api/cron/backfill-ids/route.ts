import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BATCH_SIZE         = 5
const COOLDOWN_HOURS     = 5
const API_DELAY_MS       = 600
const REQUEST_TIMEOUT_MS = 8000
const LOCK_NAME          = 'id_checker'
const LOCK_DURATION_MS   = 55_000
const YEAR_TOLERANCE     = 1
const TIME_BUDGET_MS = 22_000
const FULL_REVERIFY_DAYS = 21

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
  id:         string
  title:      string
  author?:    string
  artist?:    string
  year?:      number | null
  format:     NormalizedFormat
  altTitles?: string[]
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
  const formatFiltered = candidates.filter(c => c.format === expectedFormat)
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
): Promise<{ id: string | null; year: number | null; altTitles: string[] }> {
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
      const candidatesNoFormat = rawResults.slice(0, 3).map((r: any) => ({
        id:        String(r.record?.series_id ?? ''),
        title:     r.record?.title ?? '',
        author:    r.record?.author ?? '',
        artist:    r.record?.artist ?? '',
        year:      r.record?.year ? Number(r.record.year) : null,
        // MangaUpdates' `associated` array carries alternate/synonym
        // titles for a series — this is exactly the field that would
        // have caught "The Patron of Villains" / "Raising Villains the
        // Right Way" / "Became a Supporter of Villains" as the same
        // series, had it been captured before now.
        altTitles: Array.isArray(r.record?.associated)
          ? r.record.associated.map((a: any) => a?.title).filter(Boolean)
          : [],
      }))

      const candidates: Candidate[] = await Promise.all(
        candidatesNoFormat.map(async (c) => ({
          ...c,
          format: c.id ? await fetchMUDetailType(c.id) : 'other' as NormalizedFormat,
        }))
      )

      const matchId = smartMatch(title, candidates, author, artist, year, yearConfidence, 'manga')
      if (matchId) {
        const matched = candidates.find(c => c.id === matchId)
        return { id: matchId, year: matched?.year ?? null, altTitles: matched?.altTitles ?? [] }
      }
    } catch (err) {
      console.error(`MU error for "${title}":`, err)
    }
  }
  return { id: null, year: null, altTitles: [] }
}

async function findMangaDexID(
  titles: string[], author?: string | null, artist?: string | null,
  year?: number | null, yearConfidence?: 'unverified' | 'confirmed',
): Promise<{ id: string | null; year: number | null; altTitles: string[] }> {
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
        // MangaDex's altTitles is an array of { [langCode]: string }
        // objects — flatten every language's value into one list.
        const altTitles: string[] = Array.isArray(attr.altTitles)
          ? attr.altTitles.flatMap((obj: any) => Object.values(obj ?? {})).filter(Boolean)
          : []
        return {
          id:     String(r.id ?? ''),
          title:  String(titleEn),
          author: authorName,
          artist: artistName,
          year:   attr.year ? Number(attr.year) : null,
          format: 'manga' as NormalizedFormat,
          altTitles,
        }
      })
      const matchId = smartMatch(title, candidates, author, artist, year, yearConfidence, 'manga')
      if (matchId) {
        const matched = candidates.find(c => c.id === matchId)
        return { id: matchId, year: matched?.year ?? null, altTitles: matched?.altTitles ?? [] }
      }
    } catch (err) {
      console.error(`MD error for "${title}":`, err)
    }
  }
  return { id: null, year: null, altTitles: [] }
}

async function findAniListID(
  titles: string[], author?: string | null, artist?: string | null,
  year?: number | null, yearConfidence?: 'unverified' | 'confirmed',
): Promise<{ id: string | null; year: number | null; altTitles: string[] }> {
  for (const title of titles) {
    try {
      await new Promise(r => setTimeout(r, API_DELAY_MS))
      const gql = `query($search:String){Page(perPage:15){media(search:$search,type:MANGA,sort:SEARCH_MATCH){id title{english romaji native}synonyms format startDate{year}staff(perPage:10){edges{role node{name{full}}}}}}}`
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
        const primaryTitle = r.title?.english || r.title?.romaji || r.title?.native || ''
        // Include romaji/native when they differ from whichever variant
        // became the primary title, plus AniList's own synonyms array —
        // this is often where fan-translation alt-titles like "Became a
        // Supporter of Villains" would actually surface.
        const altTitles = [
          r.title?.romaji,
          r.title?.native,
          ...(Array.isArray(r.synonyms) ? r.synonyms : []),
        ].filter((t: string | undefined): t is string => !!t && t !== primaryTitle)
        return {
          id:     String(r.id ?? ''),
          title:  primaryTitle,
          author: authorName,
          artist: artistName,
          year:   r.startDate?.year ? Number(r.startDate.year) : null,
          format: normalizeFormat(r.format ?? null),
          altTitles,
        }
      })
      const matchId = smartMatch(title, candidates, author, artist, year, yearConfidence, 'manga')
      if (matchId) {
        const matched = candidates.find(c => c.id === matchId)
        return { id: matchId, year: matched?.year ?? null, altTitles: matched?.altTitles ?? [] }
      }
    } catch (err) {
      console.error(`AL error for "${title}":`, err)
    }
  }
  return { id: null, year: null, altTitles: [] }
}

async function findJikanID(
  titles: string[], author?: string | null, artist?: string | null,
  year?: number | null, yearConfidence?: 'unverified' | 'confirmed',
): Promise<{ id: string | null; year: number | null; altTitles: string[] }> {
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
        const primaryTitle  = r.title_english || r.title || ''
        // Jikan's `titles` array is type-tagged (Default/English/
        // Japanese/Synonym) — take anything that isn't identical to
        // the primary title. Falls back to title_synonyms on older
        // response shapes that don't include the titles array.
        const altTitles: string[] = Array.isArray(r.titles)
          ? r.titles.map((t: any) => t?.title).filter((t: string) => t && t !== primaryTitle)
          : (Array.isArray(r.title_synonyms) ? r.title_synonyms : [])
        return {
          id:     String(r.mal_id ?? ''),
          title:  primaryTitle,
          author: authorName,
          artist: artistName,
          year:   publishedYear,
          format: normalizeFormat(r.type ?? null),
          altTitles,
        }
      })
      const matchId = smartMatch(title, candidates, author, artist, year, yearConfidence, 'manga')
      if (matchId) {
        const matched = candidates.find(c => c.id === matchId)
        return { id: matchId, year: matched?.year ?? null, altTitles: matched?.altTitles ?? [] }
      }
    } catch (err) {
      console.error(`Jikan error for "${title}":`, err)
    }
  }
  return { id: null, year: null, altTitles: [] }
}

async function findExternalIds(
  title:              string,
  author?:            string | null,
  artist?:            string | null,
  alternativeTitles?: string[] | null,
  year?:              number | null,
  yearConfidence?:    'unverified' | 'confirmed',
): Promise<{
  ids:              Record<string, string | undefined>
  years:            Record<string, number | null>
  discoveredTitles: string[]
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

  // Merge alt titles harvested from all 4 sources into one deduped
  // list, dropping anything identical to the comic's own title, capped
  // at 5 — same cap rule the MangaSearch autofill path uses, kept
  // consistent so it doesn't matter which path populated the field.
  const normalizedMain = normalize(title)
  const merged = [
    ...(mu.altTitles ?? []),
    ...(md.altTitles ?? []),
    ...(al.altTitles ?? []),
    ...(mal.altTitles ?? []),
  ]
  const seen = new Set<string>()
  const discoveredTitles: string[] = []
  for (const t of merged) {
    const n = normalize(t)
    if (!n || n === normalizedMain || seen.has(n)) continue
    seen.add(n)
    discoveredTitles.push(t)
    if (discoveredTitles.length >= 5) break
  }

  return { ids, years, discoveredTitles }
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
  alt_titles_added?: string[]
  reason?:           string
 full_reverify?:    boolean
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
    const cooloffCutoff  = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000).toISOString()
    const reverifyCutoff = new Date(Date.now() - FULL_REVERIFY_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const { data: comics, error } = await supabase
      .from('recommendations')
      .select('id, title, alternative_titles, author, artist, year_released, year_confidence, mangaupdates_id, mangadex_id, anilist_id, mal_id, last_id_check, last_full_reverify')
      .eq('is_approved', true)
      .or(`last_id_check.is.null,last_id_check.lt.${cooloffCutoff},last_full_reverify.is.null,last_full_reverify.lt.${reverifyCutoff}`)
      .limit(BATCH_SIZE)

    if (error) {
      console.error('DB error:', error)
      return NextResponse.json({ error: 'DB fetch failed' }, { status: 500 })
    }

    if (!comics || comics.length === 0) {
      return NextResponse.json({ message: 'No comics need checking', processed: 0 })
    }

    let foundAll = 0, foundSome = 0, foundNone = 0, skippedComplete = 0, yearsCorrected = 0, altTitlesBackfilled = 0
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

        const dueForFullReverify =
          !comic.last_full_reverify ||
          new Date(comic.last_full_reverify) < new Date(reverifyCutoff)

        const hasNoAltTitles = !comic.alternative_titles || comic.alternative_titles.length === 0

        // Skip-complete no longer skips comics that still have no
        // alt-titles — even a comic with all 4 IDs found and a
        // confirmed year is worth one more pass if alternative_titles
        // is empty, since that's the exact gap that let near-duplicate
        // titles slip through undetected.
        if (currentIdCount === TOTAL_ID_SOURCES && yearConfidence === 'confirmed' && !dueForFullReverify && !hasNoAltTitles) {
          skippedComplete++
          await supabase.from('recommendations').update({ last_id_check: timestamp }).eq('id', comic.id)
          logs.push({
            comic_id: comic.id, comic_title: comic.title,
            comic_year_before: comic.year_released, comic_year_after: comic.year_released,
            year_corrected: false,
            databases_checked: [], ids_found: {}, outlier_sources: [],
            status: 'skipped_complete', total_ids_found: TOTAL_ID_SOURCES,
            reason: 'Already complete, year confirmed, and alt titles present', timestamp,
          })
          continue
        }

        const { ids, years, discoveredTitles } = await findExternalIds(
          comic.title, comic.author, comic.artist, comic.alternative_titles,
          comic.year_released ?? null, yearConfidence,
        )
        const totalFound = Object.values(ids).filter(Boolean).length

        const mergedIds = dueForFullReverify
          ? {
              mangaupdates_id: ids.mangaupdates_id ?? comic.mangaupdates_id,
              mangadex_id:     ids.mangadex_id     ?? comic.mangadex_id,
              anilist_id:      ids.anilist_id      ?? comic.anilist_id,
              mal_id:          ids.mal_id          ?? comic.mal_id,
            }
          : {
              mangaupdates_id: comic.mangaupdates_id || ids.mangaupdates_id,
              mangadex_id:     comic.mangadex_id     || ids.mangadex_id,
              anilist_id:      comic.anilist_id      || ids.anilist_id,
              mal_id:          comic.mal_id          || ids.mal_id,
            }

        const { consensusYear, outlierSources } = deriveYearConsensus(years)

        const updatePayload: Record<string, any> = { ...mergedIds, last_id_check: timestamp }

        // Backfill alternative_titles only if the comic doesn't already
        // have any — never overwrites titles a user or MangaSearch
        // autofill already set, only fills a genuine gap.
        let altTitlesAdded: string[] = []
        if (hasNoAltTitles && discoveredTitles.length > 0) {
          updatePayload.alternative_titles = discoveredTitles
          altTitlesAdded = discoveredTitles
          altTitlesBackfilled++
        }

        if (dueForFullReverify) {
          updatePayload.last_full_reverify = timestamp
        }
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
          alt_titles_added:   altTitlesAdded.length > 0 ? altTitlesAdded : undefined,
          full_reverify:      dueForFullReverify,
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
      processed:              logs.length,
      fetched_this_batch:     comics.length,
      found_all:              foundAll,
      found_some:             foundSome,
      found_none:             foundNone,
      skipped_complete:       skippedComplete,
      years_corrected:        yearsCorrected,
      alt_titles_backfilled:  altTitlesBackfilled,
      logs_count:             logs.length,
      timed_out_early:        timedOutEarly,
    })
  } finally {
    await releaseLock(supabase)
  }
}
