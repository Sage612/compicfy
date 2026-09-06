// app/api/cron/fast-release-scanner/route.ts
//
// FAST LANE scanner. Runs every 1-2 minutes (set in your cron schedule).
// Job: poll MangaUpdates' /releases/search endpoint for releases within
// the last LOOKBACK_WINDOW_MS, resolve each unique title to a real
// series_id via /series/search (cached across runs - see
// mu_series_lookup_cache), match against tracked comics by
// mangaupdates_id, and if the reported chapter is higher than what we
// have stored, insert a flag into checker_priority_queue. This endpoint
// NEVER writes to recommendations.chapter_count, NEVER sends
// notifications, and NEVER decides a chapter update is "real". All of
// that stays the exclusive job of the existing chapter-checker cron,
// which checks this queue first.
//
// Why two calls instead of one: confirmed via a live authenticated call
// that /releases/search's records do NOT include series_id anywhere
// (despite older forum reports and the docs' sample schema suggesting
// otherwise - both turned out to be stale/wrong). /series/search is a
// separate endpoint that DOES reliably return series_id, ranked by match
// quality against a title query.
//
// Why a time window instead of a fixed page count: a fixed "top 50
// releases" read has no guarantee of covering any particular span of
// time - during a release surge (many groups dropping chapters for
// different series at once), the top 50 could span only a few minutes,
// silently pushing older-but-still-recent releases off the page before
// any run sees them. Paginating by TIME instead of by a fixed count
// means the scanner always covers the full lookback window regardless of
// how busy the release feed is that moment. The 1-hour default window is
// a safety margin for the scanner missing a cycle or two (a deploy, a
// brief outage) - under normal 1-2 minute polling, most runs will only
// see a handful of releases from the last couple minutes and paginate
// once or twice at most.
//
// Rate limiting: confirmed via MangaUpdates' own dev on their forum that
// read-only GET/search calls are NOT subject to their documented rate
// limit (that limit is 1-per-5-seconds and only applies to write/update
// actions). Generic DDoS protection still applies and is undocumented,
// so series/search lookups still run in small delayed batches rather
// than firing all at once.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const REQUEST_TIMEOUT_MS = 8000
const RELEASES_PER_PAGE = 50
const LOOKBACK_WINDOW_MS = 60 * 60 * 1000 // 1 hour - safety margin for missed cycles, not normal-case coverage
const MAX_RELEASE_PAGES = 10 // hard ceiling: at 50/page this caps a single run at 500 releases fetched, regardless of how busy the window was - prevents an extreme surge from itself causing a timeout
const SERIES_LOOKUP_DELAY_MS = 150
const SERIES_LOOKUP_BATCH_SIZE = 5
const SERIES_MATCH_MIN_HIT_TITLE_EQUALS_QUERY = true
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours - a title's series_id essentially never changes, but re-validating periodically guards against a cached wrong-match sticking forever
const PRIORITY_DEDUP_COOLDOWN_MS = 10 * 60 * 1000 // 10 min — see dedup guard below

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
  id: number
  title: string
  chapter: string
  volume?: string | null
  time_added?: { timestamp: number }
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
  hit_title: string
}

interface MUSeriesSearchResponse {
  total_hits: number
  page: number
  per_page: number
  results: MUSeriesSearchResult[]
}

function matchBestSeries(queryTitle: string, seriesResults: MUSeriesSearchResult[]): MUSeriesRecord | null {
  if (seriesResults.length === 0) return null

  const normalize = (s: string) => s.trim().toLowerCase()
  const normalizedQuery = normalize(queryTitle)

  const exactHit = seriesResults.find((r) => normalize(r.hit_title) === normalizedQuery)
  if (exactHit) return exactHit.record

  if (SERIES_MATCH_MIN_HIT_TITLE_EQUALS_QUERY) {
    return null
  }

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

async function fetchReleasesWithinWindow(
  muToken: string,
  windowMs: number
): Promise<{ releases: MUReleaseRecord[]; pagesFetched: number; hitPageCeiling: boolean }> {
  const cutoffSeconds = Math.floor((Date.now() - windowMs) / 1000)
  const releases: MUReleaseRecord[] = []
  let page = 1
  let hitPageCeiling = false

  while (page <= MAX_RELEASE_PAGES) {
    const res = await fetchWithTimeout('https://api.mangaupdates.com/v1/releases/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${muToken}`,
      },
      body: JSON.stringify({ page, perpage: RELEASES_PER_PAGE }),
    })

    if (!res.ok) {
      const err: any = new Error(`releases/search page ${page} failed: ${res.status}`)
      err.status = res.status
      throw err
    }

    const data: MUReleasesSearchResponse = await res.json()
    const pageResults = data?.results ?? []

    if (pageResults.length === 0) break

    let sawOlderThanWindow = false
    for (const { record } of pageResults) {
      const addedAt = record.time_added?.timestamp
      if (addedAt === undefined || addedAt >= cutoffSeconds) {
        releases.push(record)
      } else {
        sawOlderThanWindow = true
      }
    }

    if (sawOlderThanWindow) break
    page++
  }

  if (page > MAX_RELEASE_PAGES) hitPageCeiling = true

  return { releases, pagesFetched: Math.min(page, MAX_RELEASE_PAGES), hitPageCeiling }
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

  // TEMPORARY DEBUG: dump raw time_added values from page 1, unfiltered,
  // to confirm what sort order releases/search actually returns by
  // default. The time-windowed pagination logic added this session
  // silently assumes newest-first - this was never actually confirmed,
  // and checked_releases: 0 in production suggests that assumption may
  // be wrong. Remove this block once confirmed.
  if (req.headers.get('x-debug-sort-order') === '1') {
    const res = await fetchWithTimeout('https://api.mangaupdates.com/v1/releases/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${muToken}` },
      body: JSON.stringify({ page: 1, perpage: RELEASES_PER_PAGE }), // matches production exactly now, was hardcoded to 10 before
    })
    const rawBody = await res.text()
    let data: any = null
    try { data = JSON.parse(rawBody) } catch {}
    const timestamps = (data?.results ?? []).map((r: any) => ({
      title: r.record?.title,
      as_rfc3339: r.record?.time_added?.as_rfc3339,
      timestamp: r.record?.time_added?.timestamp,
    }))
    return NextResponse.json({
      debug_sort_order: true,
      now_utc: new Date().toISOString(),
      cutoff_seconds: Math.floor((Date.now() - LOOKBACK_WINDOW_MS) / 1000),
      status: res.status,
      result_count: data?.results?.length ?? 0,
      total_hits: data?.total_hits,
      first_5: timestamps.slice(0, 5),
      last_5: timestamps.slice(-5),
    })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    let releaseFetch
    try {
      releaseFetch = await fetchReleasesWithinWindow(muToken, LOOKBACK_WINDOW_MS)
    } catch (err: any) {
      if (err.status === 401) {
        console.error(
          'MANGAUPDATES_API_TOKEN has expired or is invalid (401). ' +
          'Run the refresh-mu-token script and update the env var.'
        )
        return NextResponse.json({
          error: 'MangaUpdates session token expired or invalid',
          action_required: 'refresh MANGAUPDATES_API_TOKEN',
          status: 401,
        }, { status: 401 })
      }
      console.error('MU releases/search failed:', err.message)
      return NextResponse.json({ error: 'Failed to fetch MU releases' }, { status: 502 })
    }

    const { releases: results, pagesFetched, hitPageCeiling } = releaseFetch

    if (hitPageCeiling) {
      console.warn(`Fast scanner hit MAX_RELEASE_PAGES (${MAX_RELEASE_PAGES}) before covering the full ${LOOKBACK_WINDOW_MS / 60000}min window - a heavy release surge may mean some releases in this window were not checked this run.`)
    }

    if (results.length === 0) {
      return NextResponse.json({ checked_releases: 0, pages_fetched: pagesFetched, flagged: 0 })
    }

    const latestByTitle = new Map<string, { chapter: number; releaseId: number; rawChapter: string }>()

    for (const record of results) {
      const rawCh = parseFloat(record.chapter)
      if (isNaN(rawCh)) continue

      const existing = latestByTitle.get(record.title)
      if (!existing || rawCh > existing.chapter) {
        latestByTitle.set(record.title, { chapter: rawCh, releaseId: record.id, rawChapter: record.chapter })
      }
    }

    if (latestByTitle.size === 0) {
      return NextResponse.json({ checked_releases: results.length, pages_fetched: pagesFetched, flagged: 0, note: 'no parseable chapter numbers in this window' })
    }

    const allTitles = Array.from(latestByTitle.keys())

    const cacheCutoffIso = new Date(Date.now() - CACHE_TTL_MS).toISOString()
    const { data: cachedRows } = await supabase
      .from('mu_series_lookup_cache')
      .select('title, series_id, resolved_at')
      .in('title', allTitles)
      .gte('resolved_at', cacheCutoffIso)

    const titleToSeriesId = new Map<string, number>()
    const knownUnresolvable = new Set<string>()
    for (const row of cachedRows ?? []) {
      if (row.series_id !== null) {
        titleToSeriesId.set(row.title, row.series_id)
      } else {
        knownUnresolvable.add(row.title)
      }
    }

    const titlesNeedingLookup = allTitles.filter(
      (t) => !titleToSeriesId.has(t) && !knownUnresolvable.has(t)
    )

    const unresolvedTitles: string[] = []
    const newlyResolvedForCache: Array<{ title: string; series_id: number | null }> = []

    for (let i = 0; i < titlesNeedingLookup.length; i += SERIES_LOOKUP_BATCH_SIZE) {
      const batch = titlesNeedingLookup.slice(i, i + SERIES_LOOKUP_BATCH_SIZE)

      const batchResults = await Promise.all(
        batch.map(async (title) => ({ title, ...(await resolveSeriesId(title, muToken)) }))
      )

      for (const { title, seriesId, error } of batchResults) {
        if (seriesId) {
          titleToSeriesId.set(title, seriesId)
        } else {
          unresolvedTitles.push(title)
          if (error) console.error(`series/search lookup failed for "${title}": ${error}`)
        }
        if (!error) {
          newlyResolvedForCache.push({ title, series_id: seriesId })
        }
      }

      const isLastBatch = i + SERIES_LOOKUP_BATCH_SIZE >= titlesNeedingLookup.length
      if (!isLastBatch) {
        await new Promise((r) => setTimeout(r, SERIES_LOOKUP_DELAY_MS))
      }
    }

    if (newlyResolvedForCache.length > 0) {
      await supabase
        .from('mu_series_lookup_cache')
        .upsert(
          newlyResolvedForCache.map((r) => ({ title: r.title, series_id: r.series_id, resolved_at: new Date().toISOString() })),
          { onConflict: 'title' }
        )
    }

    if (titleToSeriesId.size === 0) {
      return NextResponse.json({
        checked_releases: results.length,
        pages_fetched: pagesFetched,
        unique_titles: allTitles.length,
        cache_hits: allTitles.length - titlesNeedingLookup.length,
        flagged: 0,
        note: 'no titles resolved to a confident series_id match this window',
        unresolved_titles: unresolvedTitles,
      })
    }

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
        pages_fetched: pagesFetched,
        unique_titles: allTitles.length,
        cache_hits: allTitles.length - titlesNeedingLookup.length,
        resolved_series_ids: titleToSeriesId.size,
        flagged: 0,
      })
    }

    const releaseBySeriesId = new Map<string, { chapter: number; releaseId: number; rawChapter: string }>()
    for (const [title, seriesId] of titleToSeriesId.entries()) {
      const releaseInfo = latestByTitle.get(title)
      if (releaseInfo) releaseBySeriesId.set(String(seriesId), releaseInfo)
    }

    let flaggedCount = 0
    const flaggedTitles: string[] = []

    for (const comic of matchedComics) {
      const releaseInfo = releaseBySeriesId.get(String(comic.mangaupdates_id))
      if (!releaseInfo) continue

      const currentCh = comic.chapter_count ?? 0
      if (releaseInfo.chapter <= currentCh) continue

      const dedupWindowStart = new Date(Date.now() - PRIORITY_DEDUP_COOLDOWN_MS).toISOString()

      const { data: existingPending } = await supabase
        .from('checker_priority_queue')
        .select('id')
        .eq('recommendation_id', comic.id)
        .or(`processed_at.is.null,processed_at.gt.${dedupWindowStart}`)
        .limit(1)
        .maybeSingle()

      if (existingPending) continue

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
      pages_fetched: pagesFetched,
      hit_page_ceiling: hitPageCeiling || undefined,
      unique_titles: allTitles.length,
      cache_hits: allTitles.length - titlesNeedingLookup.length,
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