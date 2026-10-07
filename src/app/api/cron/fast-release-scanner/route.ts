// app/api/cron/fast-release-scanner/route.ts
//
// FAST LANE scanner. Runs every 1-2 minutes.
//
// Job: poll MangaUpdates' /releases/search (with include_metadata: true so
// every release carries its real series_id), match against tracked comics
// by mangaupdates_id, and if the reported chapter is higher than what we
// have stored, insert a flag into checker_priority_queue. This endpoint
// NEVER writes recommendations.chapter_count, NEVER sends notifications.
// The chapter-checker cron owns all of that.
//
// What changed vs. the previous version:
//  - No more /series/search title lookups and no more mu_series_lookup_cache.
//    That path failed for any release whose title did not exactly match a
//    series hit_title, and cached the failure for 6 hours, so those series
//    were silently skipped. series_id now comes straight from the release.
//  - Pagination stops only when an ENTIRE page is older than the window.
//    The feed is not strictly time-ordered, so stopping at the first old
//    record could skip fresh releases further down the page.
//  - Hard time budget so the run always returns before cron-job.org's 30s
//    limit, instead of timing out mid-work.
//  - Dedup check and queue insert are single batched queries instead of
//    one query per comic.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const REQUEST_TIMEOUT_MS = 8000
const RELEASES_PER_PAGE = 50
const LOOKBACK_WINDOW_MS = 20 * 60 * 1000 // cron runs every 1-2 min; 20 min covers a few missed cycles
const MAX_RELEASE_PAGES = 8
const TIME_BUDGET_MS = 22000 // stop fetching pages after this so we finish under the 30s cron limit
const PRIORITY_DEDUP_COOLDOWN_MS = 10 * 60 * 1000
const DB_IN_CHUNK = 100

async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

// Handles ranges like "66-68" and suffixes like "10a" - takes the highest number.
function parseChapter(chapterStr: string): number {
  if (!chapterStr) return NaN
  const parts = chapterStr
    .split('-')
    .map((p) => parseFloat(p.trim()))
    .filter((n) => !isNaN(n))
  return parts.length > 0 ? Math.max(...parts) : NaN
}

interface MUReleaseRecord {
  id: number
  title: string
  chapter: string
  volume?: string | null
  time_added?: { timestamp: number }
}

interface MUReleaseResult {
  record: MUReleaseRecord
  metadata?: { series?: { series_id?: number; title?: string } }
}

interface MUReleasesSearchResponse {
  total_hits: number
  page: number
  per_page: number
  results: MUReleaseResult[]
}

async function fetchReleasesWithinWindow(
  muToken: string,
  windowMs: number,
  deadline: number
): Promise<{ releases: MUReleaseResult[]; pagesFetched: number; stoppedEarlyReason?: 'page_ceiling' | 'time_budget' }> {
  const cutoffSeconds = Math.floor((Date.now() - windowMs) / 1000)
  const releases: MUReleaseResult[] = []
  let pagesFetched = 0
  let stoppedEarlyReason: 'page_ceiling' | 'time_budget' | undefined

  for (let page = 1; page <= MAX_RELEASE_PAGES; page++) {
    if (Date.now() > deadline) {
      stoppedEarlyReason = 'time_budget'
      break
    }

    const res = await fetchWithTimeout('https://api.mangaupdates.com/v1/releases/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${muToken}`,
      },
      body: JSON.stringify({ page, perpage: RELEASES_PER_PAGE, include_metadata: true }),
    })

    if (!res.ok) {
      const err: any = new Error(`releases/search page ${page} failed: ${res.status}`)
      err.status = res.status
      throw err
    }

    const data: MUReleasesSearchResponse = await res.json()
    const pageResults = data?.results ?? []
    pagesFetched = page

    if (pageResults.length === 0) break

    let olderCount = 0
    for (const item of pageResults) {
      const addedAt = item.record?.time_added?.timestamp
      if (addedAt === undefined || addedAt >= cutoffSeconds) {
        releases.push(item)
      } else {
        olderCount++
      }
    }

    // Only stop when the WHOLE page is outside the window. The feed is not
    // strictly time-ordered, so one old record does not mean the rest are old.
    if (olderCount === pageResults.length) break

    if (page === MAX_RELEASE_PAGES) stoppedEarlyReason = 'page_ceiling'
  }

  return { releases, pagesFetched, stoppedEarlyReason }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export async function GET(req: Request) {
  const startedAt = Date.now()
  const deadline = startedAt + TIME_BUDGET_MS

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
    let releaseFetch
    try {
      releaseFetch = await fetchReleasesWithinWindow(muToken, LOOKBACK_WINDOW_MS, deadline)
    } catch (err: any) {
      if (err.status === 401) {
        console.error('MANGAUPDATES_API_TOKEN has expired or is invalid (401). Run refresh-mu-token.js and update the env var.')
        return NextResponse.json({
          error: 'MangaUpdates session token expired or invalid',
          action_required: 'refresh MANGAUPDATES_API_TOKEN',
          status: 401,
        }, { status: 401 })
      }
      console.error('MU releases/search failed:', err.message)
      return NextResponse.json({ error: 'Failed to fetch MU releases' }, { status: 502 })
    }

    const { releases, pagesFetched, stoppedEarlyReason } = releaseFetch

    if (stoppedEarlyReason) {
      console.warn(`Fast scanner stopped early (${stoppedEarlyReason}) before covering the full ${LOOKBACK_WINDOW_MS / 60000}min window; some releases may be picked up next run.`)
    }

    if (releases.length === 0) {
      return NextResponse.json({ checked_releases: 0, pages_fetched: pagesFetched, flagged: 0 })
    }

    // Highest chapter per series_id in this window.
    const latestBySeries = new Map<string, { chapter: number; releaseId: number; rawChapter: string; title: string }>()
    let skippedNoMetadata = 0
    let skippedNoChapter = 0

    for (const { record, metadata } of releases) {
      const seriesId = metadata?.series?.series_id
      if (!seriesId) {
        skippedNoMetadata++
        continue
      }
      const ch = parseChapter(record.chapter)
      if (isNaN(ch)) {
        skippedNoChapter++
        continue
      }
      const key = String(seriesId)
      const existing = latestBySeries.get(key)
      if (!existing || ch > existing.chapter) {
        latestBySeries.set(key, { chapter: ch, releaseId: record.id, rawChapter: record.chapter, title: record.title })
      }
    }

    if (latestBySeries.size === 0) {
      return NextResponse.json({
        checked_releases: releases.length,
        pages_fetched: pagesFetched,
        flagged: 0,
        skipped_no_metadata: skippedNoMetadata,
        skipped_no_chapter: skippedNoChapter,
        note: 'no usable releases in this window',
      })
    }

    // Match against tracked comics.
    const seriesIds = Array.from(latestBySeries.keys())
    const matchedComics: { id: string; title: string; chapter_count: number | null; mangaupdates_id: string | number }[] = []

    for (const ids of chunk(seriesIds, DB_IN_CHUNK)) {
      const { data, error } = await supabase
        .from('recommendations')
        .select('id, title, chapter_count, mangaupdates_id')
        .in('mangaupdates_id', ids)
        .eq('is_approved', true)

      if (error) {
        console.error('DB fetch error:', error)
        return NextResponse.json({ error: 'DB query failed' }, { status: 500 })
      }
      if (data) matchedComics.push(...(data as any))
    }

    // Comics whose reported chapter is ahead of what we have stored.
    const candidates = matchedComics.filter((comic) => {
      const info = latestBySeries.get(String(comic.mangaupdates_id))
      return info && info.chapter > (comic.chapter_count ?? 0)
    })

    if (candidates.length === 0) {
      return NextResponse.json({
        checked_releases: releases.length,
        pages_fetched: pagesFetched,
        unique_series: latestBySeries.size,
        matched_comics: matchedComics.length,
        flagged: 0,
        stopped_early: stoppedEarlyReason,
        skipped_no_metadata: skippedNoMetadata || undefined,
        ms: Date.now() - startedAt,
      })
    }

    // One query for all already-pending / recently-processed flags.
    const dedupWindowStart = new Date(Date.now() - PRIORITY_DEDUP_COOLDOWN_MS).toISOString()
    const alreadyQueued = new Set<string>()

    for (const ids of chunk(candidates.map((c) => c.id), DB_IN_CHUNK)) {
      const { data: existing, error: dedupError } = await supabase
        .from('checker_priority_queue')
        .select('recommendation_id')
        .in('recommendation_id', ids)
        .or(`processed_at.is.null,processed_at.gt.${dedupWindowStart}`)

      if (dedupError) {
        console.error('Dedup query failed:', dedupError)
        return NextResponse.json({ error: 'Dedup query failed' }, { status: 500 })
      }
      for (const row of existing ?? []) alreadyQueued.add(String(row.recommendation_id))
    }

    const rowsToInsert = candidates
      .filter((c) => !alreadyQueued.has(String(c.id)))
      .map((comic) => {
        const info = latestBySeries.get(String(comic.mangaupdates_id))!
        return {
          recommendation_id: comic.id,
          source: 'mangaupdates',
          source_release_id: info.releaseId,
          flagged_chapter: info.rawChapter,
        }
      })

    let flaggedCount = 0
    const flaggedTitles: string[] = []

    if (rowsToInsert.length > 0) {
      const { error: insertError } = await supabase.from('checker_priority_queue').insert(rowsToInsert)
      if (insertError) {
        console.error('Failed to queue flags:', insertError)
        return NextResponse.json({ error: 'Queue insert failed' }, { status: 500 })
      }
      flaggedCount = rowsToInsert.length
      const insertedIds = new Set(rowsToInsert.map((r) => String(r.recommendation_id)))
      for (const c of candidates) if (insertedIds.has(String(c.id))) flaggedTitles.push(c.title)
    }

    return NextResponse.json({
      checked_releases: releases.length,
      pages_fetched: pagesFetched,
      unique_series: latestBySeries.size,
      matched_comics: matchedComics.length,
      flagged: flaggedCount,
      flagged_titles: flaggedTitles,
      stopped_early: stoppedEarlyReason,
      skipped_no_metadata: skippedNoMetadata || undefined,
      ms: Date.now() - startedAt,
    })
  } catch (err: any) {
    console.error('Fast scanner error:', err)
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 })
  }
}