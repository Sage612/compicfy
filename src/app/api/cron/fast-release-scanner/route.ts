// app/api/cron/fast-release-scanner/route.ts
//
// FAST LANE scanner. Runs every 1-2 minutes (set in your cron schedule).
// Job: poll MangaUpdates' /releases/search endpoint for the most recent
// releases, resolve each unique title to a real series_id via a second
// call to /series/search, match against tracked comics by
// mangaupdates_id, and if the reported chapter is higher than what we
// have stored, insert a flag into checker_priority_queue. That's it -
// this endpoint NEVER writes to recommendations.chapter_count, NEVER
// sends notifications, and NEVER decides a chapter update is "real". All
// of that stays the exclusive job of the existing chapter-checker cron,
// which checks this queue first.
//
// Why two calls instead of one: confirmed via a live authenticated call
// that /releases/search's records do NOT include series_id anywhere
// (despite older forum reports and the docs' sample schema suggesting
// otherwise - both turned out to be stale/wrong). /series/search is a
// separate endpoint that DOES reliably return series_id, ranked by match
// quality against a title query. So the real pipeline is:
//   releases/search (get recent titles+chapters, no series_id)
//     -> series/search per UNIQUE title (resolve title -> series_id)
//       -> compare resolved series_id against recommendations.mangaupdates_id
//
// Rate limiting: confirmed via MangaUpdates' own dev on their forum that
// read-only GET/search calls are NOT subject to their documented rate
// limit (that limit is 1-per-5-seconds and only applies to write/update
// actions). Generic DDoS protection still applies and is undocumented,
// so this still dedupes by title and adds a small delay between series
// lookups rather than firing all of them in a burst.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const REQUEST_TIMEOUT_MS = 8000
const RELEASES_PER_PAGE = 50 // how many recent releases to check each run
const SERIES_LOOKUP_DELAY_MS = 150 // small gap between series/search calls, defensive against undocumented DDoS throttling
const SERIES_MATCH_MIN_HIT_TITLE_EQUALS_QUERY = true // see matchBestSeries() below

async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeoutId)
    return response
  } catch (err: any) {
    clearTimeout(timeoutId)
    throw err
  }
}

interface MUReleaseRecord {
  id: number // release id, NOT series id
  title: string
  chapter: string
  volume?: string | null
}

interface MUReleasesSearchResponse {
  total_hits: number
  page: number
  per_page: number
  results: { record: MUReleaseRecord }[]
}

interface MUSeriesRecord {
  series_id: number
  title: string
  type?: string | null
}

interface MUSeriesSearchResult {
  record: MUSeriesRecord
  hit_title: string // the title MU actually matched against, useful for match confidence
}

interface MUSeriesSearchResponse {
  total_hits: number
  page: number
  per_page: number
  results: MUSeriesSearchResult[]
}

/**
 * Given a title and MangaUpdates' series/search results for it, pick the
 * best candidate series_id - or null if nothing looks like a confident
 * match. This is the one place real ambiguity can creep in (unlike the
 * old series_id-in-metadata approach, which had none), so it's kept
 * conservative on purpose: a missed match just means the fast lane skips
 * a comic this cycle and the normal scheduled sweep catches it later.
 * A WRONG match would waste a fast-lane check on an unrelated comic -
 * annoying but not harmful, since the priority queue only ever flags,
 * never writes chapter data directly. Still, prefer skipping over
 * guessing.
 */
function matchBestSeries(queryTitle: string, seriesResults: MUSeriesSearchResult[]): MUSeriesRecord | null {
  if (seriesResults.length === 0) return null

  const normalize = (s: string) => s.trim().toLowerCase()
  const normalizedQuery = normalize(queryTitle)

  // Prefer an exact (case-insensitive) match on hit_title - MU's own
  // "what did this actually match against" field - over just taking the
  // first search result, since search results are ranked by relevance
  // but not guaranteed to be exact.
  const exactHit = seriesResults.find((r) => normalize(r.hit_title) === normalizedQuery)
  if (exactHit) return exactHit.record

  if (SERIES_MATCH_MIN_HIT_TITLE_EQUALS_QUERY) {
    // Conservative mode: only trust exact hit_title matches. A release
    // titled "Ao no Flag" pulling back a first result of "Ateuma Flag"
    // (as seen in a live probe) shows the top result isn't always the
    // right one - so without an exact hit_title match, skip rather than
    // guess at position 1.
    return null
  }

  // Fallback (currently unused while the flag above is true): take the
  // first result if nothing hit exactly.
  return seriesResults[0].record
}

async function resolveSeriesId(
  title: string,
  muToken: string
): Promise<{ seriesId: number | null; error?: string }> {
  try {
    const res = await fetchWithTimeout('https://api.mangaupdates.com/v1/series/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${muToken}`,
      },
      body: JSON.stringify({ search: title, page: 1, perpage: 5 }),
    })

    if (!res.ok) {
      return { seriesId: null, error: `series/search returned ${res.status}` }
    }

    const data: MUSeriesSearchResponse = await res.json()
    const matched = matchBestSeries(title, data?.results ?? [])
    return { seriesId: matched?.series_id ?? null }
  } catch (err: any) {
    return { seriesId: null, error: err.message ?? 'series/search request failed' }
  }
}

export async function GET(req: Request) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const muToken = process.env.MANGAUPDATES_API_TOKEN
  if (!muToken) {
    console.error('MANGAUPDATES_API_TOKEN is not set - fast scanner cannot authenticate')
    return NextResponse.json({ error: 'Missing MangaUpdates API token' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // 1. Fetch the most recent releases from MangaUpdates.
    const muRes = await fetchWithTimeout('https://api.mangaupdates.com/v1/releases/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${muToken}`,
      },
      body: JSON.stringify({
        page: 1,
        perpage: RELEASES_PER_PAGE,
      }),
    })

    if (!muRes.ok) {
      const bodyText = await muRes.text().catch(() => '')

      // A 401 here specifically means the stored session token is dead -
      // either it expired or was revoked. Without this explicit check,
      // the scanner would just silently return "flagged: 0" every run
      // forever, which reads exactly like "no new releases" from the
      // outside - a trap where days could pass before anyone notices the
      // fast lane is dead, not quiet.
      if (muRes.status === 401) {
        console.error(
          'MANGAUPDATES_API_TOKEN has expired or is invalid (401). ' +
          'The fast scanner cannot authenticate until this is refreshed. ' +
          'Run the refresh-mu-token script and update the env var.'
        )
        return NextResponse.json({
          error: 'MangaUpdates session token expired or invalid',
          action_required: 'refresh MANGAUPDATES_API_TOKEN',
          status: 401,
        }, { status: 401 })
      }

      console.error(`MU releases/search failed: ${muRes.status} ${bodyText}`)
      return NextResponse.json({ error: 'Failed to fetch MU releases', status: muRes.status }, { status: 502 })
    }

    const muData: MUReleasesSearchResponse = await muRes.json()
    const results = muData?.results ?? []

    if (results.length === 0) {
      return NextResponse.json({ checked_releases: 0, flagged: 0 })
    }

    // 2. Group releases by title, keeping the highest chapter number per
    //    title in this batch. This is also the dedup step that keeps
    //    series/search call volume down - "Ao no Flag" appearing 8 times
    //    in one page of releases (real example from a live probe) means
    //    one series/search call for it, not eight.
    const latestByTitle = new Map<string, { chapter: number; releaseId: number; rawChapter: string }>()

    for (const { record } of results) {
      const rawCh = parseFloat(record.chapter)
      if (isNaN(rawCh)) continue // e.g. "54 (end)" or non-numeric chapter labels - skip rather than mis-parse

      const existing = latestByTitle.get(record.title)
      if (!existing || rawCh > existing.chapter) {
        latestByTitle.set(record.title, { chapter: rawCh, releaseId: record.id, rawChapter: record.chapter })
      }
    }

    if (latestByTitle.size === 0) {
      return NextResponse.json({ checked_releases: results.length, flagged: 0, note: 'no parseable chapter numbers in this batch' })
    }

    // 3. Resolve each unique title to a MangaUpdates series_id via
    //    series/search, with a small delay between calls (defensive
    //    against undocumented DDoS-style throttling - read-only calls
    //    aren't subject to MU's documented rate limit, but that limit
    //    isn't the only thing that can throttle a client).
    const titleToSeriesId = new Map<string, number>()
    const unresolvedTitles: string[] = []

    const titles = Array.from(latestByTitle.keys())
    for (let i = 0; i < titles.length; i++) {
      const title = titles[i]
      const { seriesId, error } = await resolveSeriesId(title, muToken)

      if (seriesId) {
        titleToSeriesId.set(title, seriesId)
      } else {
        unresolvedTitles.push(title)
        if (error) console.error(`series/search lookup failed for "${title}": ${error}`)
      }

      if (i < titles.length - 1) {
        await new Promise((r) => setTimeout(r, SERIES_LOOKUP_DELAY_MS))
      }
    }

    if (titleToSeriesId.size === 0) {
      return NextResponse.json({
        checked_releases: results.length,
        unique_titles: titles.length,
        flagged: 0,
        note: 'no titles resolved to a confident series_id match this batch',
        unresolved_titles: unresolvedTitles,
      })
    }

    // 4. Find which of these resolved series_ids are tracked comics, and
    //    what chapter count we currently have stored for them.
    const seriesIds = Array.from(titleToSeriesId.values()).map(String)

    const { data: matchedComics, error: matchError } = await supabase
      .from('recommendations')
      .select('id, title, chapter_count, mangaupdates_id')
      .in('mangaupdates_id', seriesIds)
      .eq('is_approved', true)

    if (matchError) {
      console.error('DB fetch error:', matchError)
      return NextResponse.json({ error: 'DB query failed' }, { status: 500 })
    }

    if (!matchedComics || matchedComics.length === 0) {
      return NextResponse.json({
        checked_releases: results.length,
        unique_titles: titles.length,
        resolved_series_ids: titleToSeriesId.size,
        flagged: 0,
      })
    }

    // Reverse-index: series_id -> release info, to look up by the
    // comic's stored mangaupdates_id.
    const releaseBySeriesId = new Map<string, { chapter: number; releaseId: number; rawChapter: string }>()
    for (const [title, seriesId] of titleToSeriesId.entries()) {
      const releaseInfo = latestByTitle.get(title)
      if (releaseInfo) releaseBySeriesId.set(String(seriesId), releaseInfo)
    }

    // 5. For each matched comic whose reported chapter is higher than
    //    what we have stored, flag it in the priority queue - but only if
    //    it doesn't already have a pending (unprocessed) entry.
    let flaggedCount = 0
    const flaggedTitles: string[] = []

    for (const comic of matchedComics) {
      const releaseInfo = releaseBySeriesId.get(String(comic.mangaupdates_id))
      if (!releaseInfo) continue

      const currentCh = comic.chapter_count ?? 0
      if (releaseInfo.chapter <= currentCh) continue // nothing new, skip

      // Dedup guard: does this comic already have an unprocessed entry?
      const { data: existingPending } = await supabase
        .from('checker_priority_queue')
        .select('id')
        .eq('recommendation_id', comic.id)
        .is('processed_at', null)
        .limit(1)
        .maybeSingle()

      if (existingPending) continue // already queued, don't duplicate

      const { error: insertError } = await supabase
        .from('checker_priority_queue')
        .insert({
          recommendation_id: comic.id,
          source: 'mangaupdates',
          source_release_id: releaseInfo.releaseId,
          flagged_chapter: releaseInfo.rawChapter,
        })

      if (insertError) {
        console.error(`Failed to queue ${comic.title}:`, insertError)
        continue
      }

      flaggedCount++
      flaggedTitles.push(comic.title)
    }

    return NextResponse.json({
      checked_releases: results.length,
      unique_titles: titles.length,
      resolved_series_ids: titleToSeriesId.size,
      matched_comics: matchedComics.length,
      flagged: flaggedCount,
      flagged_titles: flaggedTitles,
      unresolved_titles: unresolvedTitles.length > 0 ? unresolvedTitles : undefined,
    })
  } catch (err: any) {
    console.error('Fast scanner error:', err)
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 })
  }
}