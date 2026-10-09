// app/api/cron/scanner-debug/route.ts
//
// TEMPORARY diagnostic: explains why the fast scanner did or did not flag a
// comic. Reads MangaUpdates' release feed (with series metadata) page by page,
// finds releases whose title or series title contains `q`, and shows the
// series_id MU attached next to the mangaupdates_id stored in your database.
//
// Same auth as the scanners: x-cron-secret header. Read-only; writes nothing.
//
//   GET /api/cron/scanner-debug?q=villains
//   optional: &pages=25  (max 40)   &start_page=1   (skip ahead to look further back)
//
// Delete this file when you're done.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const TIME_BUDGET_MS = 20000
const REQUEST_TIMEOUT_MS = 8000
const PER_PAGE = 50

async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

function iso(ts: number | undefined): string | null {
  return typeof ts === 'number' ? new Date(ts * 1000).toISOString() : null
}

export async function GET(req: Request) {
  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
  if (q.length < 3) {
    return NextResponse.json({ error: 'Pass ?q=<at least 3 letters of the title>' }, { status: 400 })
  }
  const pages = Math.min(40, Math.max(1, parseInt(url.searchParams.get('pages') ?? '25', 10) || 25))
  const startPage = Math.max(1, parseInt(url.searchParams.get('start_page') ?? '1', 10) || 1)

  const muToken = process.env.MANGAUPDATES_API_TOKEN
  if (!muToken) return NextResponse.json({ error: 'Missing MangaUpdates API token' }, { status: 500 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const deadline = Date.now() + TIME_BUDGET_MS
  let pagesScanned = 0
  let releasesScanned = 0
  let withoutMetadata = 0
  let newestSeen: number | undefined
  let oldestSeen: number | undefined
  const noMetadataSample: string[] = []
  const matches: any[] = []
  let stopReason: string | undefined

  for (let page = startPage; page < startPage + pages; page++) {
    if (Date.now() > deadline) {
      stopReason = 'time_budget'
      break
    }
    const res = await fetchWithTimeout('https://api.mangaupdates.com/v1/releases/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${muToken}` },
      body: JSON.stringify({ page, perpage: PER_PAGE, include_metadata: true }),
    })
    if (!res.ok) {
      return NextResponse.json({ error: `MU releases/search page ${page} returned ${res.status}`, pages_scanned: pagesScanned }, { status: 502 })
    }
    const data = await res.json()
    const results: any[] = data?.results ?? []
    if (results.length === 0) {
      stopReason = 'no_more_results'
      break
    }
    pagesScanned++

    for (const item of results) {
      releasesScanned++
      const rec = item.record ?? {}
      const series = item.metadata?.series
      const ts: number | undefined = rec.time_added?.timestamp
      if (typeof ts === 'number') {
        if (newestSeen === undefined || ts > newestSeen) newestSeen = ts
        if (oldestSeen === undefined || ts < oldestSeen) oldestSeen = ts
      }
      if (!series?.series_id) {
        withoutMetadata++
        if (noMetadataSample.length < 15) noMetadataSample.push(`${rec.title} ch ${rec.chapter}`)
      }
      const hay = `${rec.title ?? ''} | ${series?.title ?? ''}`.toLowerCase()
      if (hay.includes(q)) {
        matches.push({
          release_title: rec.title,
          chapter: rec.chapter,
          added_utc: iso(ts),
          mu_series_id: series?.series_id ?? null,
          mu_series_title: series?.title ?? null,
        })
      }
    }
  }

  // What the database has for this comic, and whether ids line up.
  const safeQ = q.replace(/[%_,()]/g, ' ').trim()
  const { data: dbByTitle } = await supabase
    .from('recommendations')
    .select('id, title, chapter_count, mangaupdates_id, is_approved')
    .ilike('title', `%${safeQ}%`)
    .limit(10)

  const seriesIds = Array.from(new Set(matches.map((m) => m.mu_series_id).filter(Boolean).map(String)))
  const { data: dbBySeries } = seriesIds.length
    ? await supabase
        .from('recommendations')
        .select('id, title, chapter_count, mangaupdates_id, is_approved')
        .in('mangaupdates_id', seriesIds)
    : { data: [] as any[] }

  const dbIdBySeries = new Map((dbBySeries ?? []).map((r: any) => [String(r.mangaupdates_id), r]))
  for (const m of matches) {
    const hit = m.mu_series_id ? dbIdBySeries.get(String(m.mu_series_id)) : undefined
    m.matches_a_tracked_comic = hit ? { id: hit.id, title: hit.title, chapter_count: hit.chapter_count } : null
  }

  return NextResponse.json({
    q,
    pages_scanned: pagesScanned,
    start_page: startPage,
    releases_scanned: releasesScanned,
    newest_release_seen_utc: iso(newestSeen),
    oldest_release_seen_utc: iso(oldestSeen),
    stopped: stopReason,
    releases_without_series_metadata: withoutMetadata,
    no_metadata_sample: noMetadataSample,
    matches,
    database_comics_matching_q: dbByTitle ?? [],
  })
}