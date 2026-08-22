// app/api/cron/fast-release-scanner/route.ts
//
// FAST LANE scanner. Runs every 1-2 minutes (set in your cron schedule).
// Job: poll MangaUpdates' /releases/search endpoint for the most recent
// releases, match against tracked comics by mangaupdates_id, and if the
// reported chapter is higher than what we have stored, insert a flag into
// checker_priority_queue. That's it - this endpoint NEVER writes to
// recommendations.chapter_count, NEVER sends notifications, and NEVER
// decides a chapter update is "real". All of that stays the exclusive job
// of the existing chapter-checker cron, which now checks this queue first.
//
// Why: /releases/search (POST) is confirmed to return series_id in its
// metadata (unlike /releases/days, which does not expose series_id at all
// per a live schema check - see project notes). This endpoint requires
// bearerAuth per MangaUpdates' OpenAPI spec.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const REQUEST_TIMEOUT_MS = 8000
const RELEASES_PER_PAGE = 50 // how many recent releases to check each run

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

interface MUSearchResultRecord {
  id: number // release id, NOT series id
  title: string
  chapter: string
  groups?: {
    group_id: number
  }[]
  metadata?: {
    series?: {
      series_id: number
      title?: string
    }
  }
}

interface MUSearchResponse {
  total_hits: number
  page: number
  per_page: number
  results: { record: MUSearchResultRecord }[]
}

export async function GET(req: Request) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // CONFIRM BEFORE DEPLOYING: MangaUpdates' /releases/search requires
  // bearerAuth per their OpenAPI spec. This token is NOT the same thing as
  // a mangaupdates_id on a comic - it's an account-level API credential.
  // If MANGAUPDATES_API_TOKEN isn't set yet, this call will fail with 401.
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
        // orderby is not a confirmed field on this endpoint's search body
        // (unlike releases/days). If MU's default sort isn't newest-first,
        // this needs adjusting once you can inspect a real authenticated
        // response - flagging this as something to verify on first run.
      }),
    })

    if (!muRes.ok) {
      const bodyText = await muRes.text().catch(() => '')

      // A 401 here specifically means the stored session token is dead -
      // either it expired or was revoked. This is NOT the same as a
      // generic upstream failure: without this check, the scanner would
      // just silently return "flagged: 0" every run forever, which reads
      // exactly like "no new releases" from the outside. That's a trap -
      // days could pass with zero flags before anyone notices the fast
      // lane is actually just dead, not quiet.
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

    const muData: MUSearchResponse = await muRes.json()
    const results = muData?.results ?? []

    // TEMPORARY DEBUG: try a handful of MangaUpdates endpoints directly
    // to see if any of them expose a series_id (or equivalent) alongside
    // release data, since /releases/search's documented metadata.series
    // field turned out not to exist in practice. Remove this whole block
    // once we've settled on a real matching strategy.
    if (req.headers.get('x-debug-endpoints') === '1') {
      const probeResults: Record<string, any> = {}

      // 1. releases/search with a "search" term matching one of the
      //    titles we just saw, in case adding a search query changes
      //    what metadata comes back vs. an empty/paginated call.
      try {
        const r1 = await fetchWithTimeout('https://api.mangaupdates.com/v1/releases/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${muToken}` },
          body: JSON.stringify({ search: results[0]?.record?.title ?? 'Naruto', page: 1, perpage: 3 }),
        })
        probeResults['releases_search_with_query'] = { status: r1.status, body: await r1.json().catch(() => null) }
      } catch (e: any) {
        probeResults['releases_search_with_query'] = { error: e.message }
      }

      // 2. series/search - a dedicated series lookup by title, distinct
      //    from releases/search. If this exists and returns series_id,
      //    we could pair it with the releases feed as a two-step lookup.
      try {
        const r2 = await fetchWithTimeout('https://api.mangaupdates.com/v1/series/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${muToken}` },
          body: JSON.stringify({ search: results[0]?.record?.title ?? 'Naruto', page: 1, perpage: 3 }),
        })
        probeResults['series_search'] = { status: r2.status, body: await r2.json().catch(() => null) }
      } catch (e: any) {
        probeResults['series_search'] = { error: e.message }
      }

      // 3. releases/days (the other releases feed) - already suspected to
      //    lack series_id per docs, but confirm directly rather than trust
      //    that either.
      try {
        const r3 = await fetchWithTimeout('https://api.mangaupdates.com/v1/releases/days', {
          headers: { 'Authorization': `Bearer ${muToken}` },
        })
        const body3 = await r3.json().catch(() => null)
        probeResults['releases_days'] = {
          status: r3.status,
          first_result: Array.isArray(body3) ? body3[0] : (body3?.results?.[0] ?? body3),
        }
      } catch (e: any) {
        probeResults['releases_days'] = { error: e.message }
      }

      // 4. groups/{id} - since every release record we've seen includes a
      //    group_id, check whether a group's own release history includes
      //    series_id even if the flat releases feed doesn't.
      const firstGroupId = results[0]?.record?.groups?.[0]?.group_id
      if (firstGroupId) {
        try {
          const r4 = await fetchWithTimeout(`https://api.mangaupdates.com/v1/groups/${firstGroupId}`, {
            headers: { 'Authorization': `Bearer ${muToken}` },
          })
          probeResults['groups_by_id'] = { status: r4.status, body: await r4.json().catch(() => null) }
        } catch (e: any) {
          probeResults['groups_by_id'] = { error: e.message }
        }
      }

      return NextResponse.json({ debug_endpoints: true, probeResults })
    }

    // TEMPORARY DEBUG: dump the raw shape of the first couple records so
    // we can see exactly where series_id actually lives (or doesn't).
    // Remove this block once the real field path is confirmed.
    if (req.headers.get('x-debug-raw') === '1') {
      return NextResponse.json({
        debug: true,
        total_hits: muData?.total_hits,
        first_two_raw_results: results.slice(0, 2),
      })
    }

    if (results.length === 0) {
      return NextResponse.json({ checked_releases: 0, flagged: 0 })
    }

    // 2. Extract series_id + reported chapter per release, keep the
    //    highest chapter number seen per series_id in this batch.
    //    IMPORTANT: metadata.series.series_id has been confirmed present
    //    on this endpoint (unlike releases/days), but a live schema report
    //    from MU's own forum notes their actual response can be thinner
    //    than the documented sample - defensively check for its presence
    //    rather than assuming.
    const latestBySeriesId = new Map<string, { chapter: number; releaseId: number; rawChapter: string }>()

    for (const { record } of results) {
      const seriesId = record.metadata?.series?.series_id
      if (!seriesId) continue // schema didn't include it for this record - skip rather than guess

      const rawCh = parseFloat(record.chapter)
      if (isNaN(rawCh)) continue

      const key = String(seriesId)
      const existing = latestBySeriesId.get(key)
      if (!existing || rawCh > existing.chapter) {
        latestBySeriesId.set(key, { chapter: rawCh, releaseId: record.id, rawChapter: record.chapter })
      }
    }

    if (latestBySeriesId.size === 0) {
      return NextResponse.json({ checked_releases: results.length, flagged: 0, note: 'no usable series_id in this batch' })
    }

    const seriesIds = Array.from(latestBySeriesId.keys())

    // 3. Find which of these series_ids are tracked comics, and what
    //    chapter count we currently have stored for them.
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
      return NextResponse.json({ checked_releases: results.length, flagged: 0 })
    }

    // 4. For each matched comic whose reported chapter is higher than
    //    what we have stored, flag it in the priority queue - but only if
    //    it doesn't already have a pending (unprocessed) entry, and only
    //    if it isn't currently mid-check by the main chapter checker.
    let flaggedCount = 0
    const flaggedTitles: string[] = []

    for (const comic of matchedComics) {
      const releaseInfo = latestBySeriesId.get(String(comic.mangaupdates_id))
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
      matched_comics: matchedComics.length,
      flagged: flaggedCount,
      flagged_titles: flaggedTitles,
    })
  } catch (err: any) {
    console.error('Fast scanner error:', err)
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 })
  }
}