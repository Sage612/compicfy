// app/api/cron/comick-release-scanner/route.ts
//
// Second FAST LANE source. Polls Comick's global "newest chapters" feed,
// maps each series to a tracked comic, and flags comics whose new chapter
// is ahead of recommendations.chapter_count into checker_priority_queue
// with source = 'comick'. Like the MU scanner it NEVER writes chapter_count
// and NEVER notifies; the chapter-checker cron verifies every flag, so a
// wrong match costs one extra check, not bad data.
//
// Mapping: comick_series_map (comick_hid -> recommendation_id). Unmapped
// series are matched once by EXACT title (or exact English alt title)
// (ignoring case and punctuation, via recommendations.title_norm) against
// approved recommendations, only if exactly one comic matches, and
// the mapping is saved so later runs are a plain lookup.
//
// If Comick serves a Cloudflare challenge or non-JSON, this returns a clear
// 502 with a preview instead of failing silently.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const COMICK_HOST = process.env.COMICK_API_HOST || 'https://api.comick.dev'
const REQUEST_TIMEOUT_MS = 8000
const MAX_PAGES = 5
const LOOKBACK_WINDOW_MS = 20 * 60 * 1000
const TIME_BUDGET_MS = 22000
const PRIORITY_DEDUP_COOLDOWN_MS = 10 * 60 * 1000
const DB_IN_CHUNK = 100

interface ComickFeedItem {
  id: number
  chap: string | null
  created_at: string
  lang?: string | null
  md_comics?: {
    hid: string
    title: string
    md_titles?: { title: string; lang: string | null }[]
  }
}

class BlockedError extends Error {
  status: number
  preview: string
  constructor(message: string, status: number, preview: string) {
    super(message)
    this.status = status
    this.preview = preview
  }
}

async function fetchWithTimeout(url: string, options: any = {}, timeoutMs = REQUEST_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

function parseChapter(chapterStr: string | null): number {
  if (!chapterStr) return NaN
  const parts = chapterStr
    .split('-')
    .map((p) => parseFloat(p.trim()))
    .filter((n) => !isNaN(n))
  return parts.length > 0 ? Math.max(...parts) : NaN
}

// Must stay in sync with the title_norm generated column in Postgres:
// lower(regexp_replace(title, '[^[:alnum:]]+', '', 'g'))
function normalizeTitle(s: string): string {
  return s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

async function fetchFeedWithinWindow(deadline: number) {
  const cutoffMs = Date.now() - LOOKBACK_WINDOW_MS
  const items: ComickFeedItem[] = []
  let pagesFetched = 0
  let stoppedEarlyReason: 'page_ceiling' | 'time_budget' | undefined

  for (let page = 1; page <= MAX_PAGES; page++) {
    if (Date.now() > deadline) {
      stoppedEarlyReason = 'time_budget'
      break
    }

    const url = `${COMICK_HOST}/chapter?accept_erotic_content=true&order=new&lang=en&page=${page}`
    const res = await fetchWithTimeout(url, {
      headers: { 'User-Agent': 'CompicfyBot/1.0 (release tracking)', Accept: 'application/json' },
    })
    const text = await res.text()
    const contentType = res.headers.get('content-type') ?? ''

    if (!res.ok || !contentType.includes('json')) {
      throw new BlockedError(`Comick feed not usable (HTTP ${res.status})`, res.status, text.slice(0, 200))
    }

    const data = JSON.parse(text)
    const pageItems: ComickFeedItem[] = Array.isArray(data) ? data : data?.chapters ?? data?.data ?? []
    pagesFetched = page
    if (pageItems.length === 0) break

    let olderCount = 0
    for (const item of pageItems) {
      const createdMs = Date.parse(item.created_at)
      if (isNaN(createdMs) || createdMs >= cutoffMs) items.push(item)
      else olderCount++
    }

    if (olderCount === pageItems.length) break
    if (page === MAX_PAGES) stoppedEarlyReason = 'page_ceiling'
  }

  return { items, pagesFetched, stoppedEarlyReason }
}

export async function GET(req: Request) {
  const startedAt = Date.now()
  const deadline = startedAt + TIME_BUDGET_MS

  if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    let feed
    try {
      feed = await fetchFeedWithinWindow(deadline)
    } catch (err: any) {
      if (err instanceof BlockedError) {
        console.error(`Comick feed blocked/unusable: HTTP ${err.status}`)
        return NextResponse.json({
          error: 'Comick feed returned non-JSON or an error (possible Cloudflare challenge)',
          comick_status: err.status,
          body_preview: err.preview,
        }, { status: 502 })
      }
      console.error('Comick feed fetch failed:', err.message)
      return NextResponse.json({ error: 'Failed to fetch Comick feed' }, { status: 502 })
    }

    const { items, pagesFetched, stoppedEarlyReason } = feed
    if (items.length === 0) {
      return NextResponse.json({ checked_chapters: 0, pages_fetched: pagesFetched, flagged: 0 })
    }

    // Highest chapter per Comick series in this window.
    const byHid = new Map<string, { chapter: number; feedId: number; rawChap: string; title: string; variants: Set<string> }>()
    for (const item of items) {
      const comic = item.md_comics
      if (!comic?.hid) continue
      const ch = parseChapter(item.chap)
      if (isNaN(ch)) continue

      const entry = byHid.get(comic.hid) ?? { chapter: -1, feedId: item.id, rawChap: item.chap ?? '', title: comic.title, variants: new Set<string>() }
      if (ch > entry.chapter) {
        entry.chapter = ch
        entry.feedId = item.id
        entry.rawChap = item.chap ?? ''
      }
      if (comic.title) entry.variants.add(comic.title)
      for (const t of comic.md_titles ?? []) if (t.lang === 'en' && t.title) entry.variants.add(t.title)
      byHid.set(comic.hid, entry)
    }

    const allHids = Array.from(byHid.keys())

    // 1. Existing mappings.
    const hidToRec = new Map<string, string>()
    for (const hids of chunk(allHids, DB_IN_CHUNK)) {
      const { data, error } = await supabase
        .from('comick_series_map')
        .select('comick_hid, recommendation_id')
        .in('comick_hid', hids)
      if (error) {
        console.error('comick_series_map read failed:', error)
        return NextResponse.json({ error: 'DB query failed (comick_series_map)' }, { status: 500 })
      }
      for (const row of data ?? []) hidToRec.set(row.comick_hid, String(row.recommendation_id))
    }

    // 2. Match unmapped series once, by exact title, only if unambiguous.
    const unmapped = allHids.filter((h) => !hidToRec.has(h))
    let newlyMapped = 0

    if (unmapped.length > 0) {
      const titleToHids = new Map<string, Set<string>>()
      for (const hid of unmapped) {
        for (const v of byHid.get(hid)!.variants) {
          const norm = normalizeTitle(v)
          if (norm.length < 3) continue // too short to match safely
          if (!titleToHids.has(norm)) titleToHids.set(norm, new Set())
          titleToHids.get(norm)!.add(hid)
        }
      }

      const hidToRecCandidates = new Map<string, Set<string>>()
      for (const titles of chunk(Array.from(titleToHids.keys()), DB_IN_CHUNK)) {
        const { data, error } = await supabase
          .from('recommendations')
          .select('id, title_norm')
          .eq('is_approved', true)
          .in('title_norm', titles)
        if (error) {
          console.error('Title match query failed:', error)
          return NextResponse.json({ error: 'DB query failed (title match)' }, { status: 500 })
        }
        for (const rec of data ?? []) {
          for (const hid of titleToHids.get(rec.title_norm) ?? []) {
            if (!hidToRecCandidates.has(hid)) hidToRecCandidates.set(hid, new Set())
            hidToRecCandidates.get(hid)!.add(String(rec.id))
          }
        }
      }

      const newRows: { comick_hid: string; recommendation_id: string; matched_title: string }[] = []
      for (const [hid, recIds] of hidToRecCandidates) {
        if (recIds.size !== 1) continue // ambiguous: skip rather than guess
        const recId = Array.from(recIds)[0]
        hidToRec.set(hid, recId)
        newRows.push({ comick_hid: hid, recommendation_id: recId, matched_title: byHid.get(hid)!.title })
      }

      if (newRows.length > 0) {
        const { error } = await supabase.from('comick_series_map').upsert(newRows, { onConflict: 'comick_hid' })
        if (error) console.error('comick_series_map upsert failed:', error)
        else newlyMapped = newRows.length
      }
    }

    // Best release per tracked comic.
    const recToRelease = new Map<string, { chapter: number; feedId: number; rawChap: string }>()
    for (const [hid, recId] of hidToRec) {
      const rel = byHid.get(hid)
      if (!rel) continue
      const existing = recToRelease.get(recId)
      if (!existing || rel.chapter > existing.chapter) {
        recToRelease.set(recId, { chapter: rel.chapter, feedId: rel.feedId, rawChap: rel.rawChap })
      }
    }

    if (recToRelease.size === 0) {
      return NextResponse.json({
        checked_chapters: items.length,
        pages_fetched: pagesFetched,
        unique_series: allHids.length,
        tracked_matches: 0,
        newly_mapped: newlyMapped,
        flagged: 0,
        ms: Date.now() - startedAt,
      })
    }

    // 3. Compare against stored chapter counts.
    const candidates: { id: string; title: string; release: { chapter: number; feedId: number; rawChap: string } }[] = []
    for (const ids of chunk(Array.from(recToRelease.keys()), DB_IN_CHUNK)) {
      const { data, error } = await supabase
        .from('recommendations')
        .select('id, title, chapter_count')
        .in('id', ids)
        .eq('is_approved', true)
      if (error) {
        console.error('recommendations read failed:', error)
        return NextResponse.json({ error: 'DB query failed (recommendations)' }, { status: 500 })
      }
      for (const rec of data ?? []) {
        const release = recToRelease.get(String(rec.id))
        if (release && release.chapter > (rec.chapter_count ?? 0)) {
          candidates.push({ id: String(rec.id), title: rec.title, release })
        }
      }
    }

    // 4. Dedup against pending / recently processed flags (any source).
    const dedupWindowStart = new Date(Date.now() - PRIORITY_DEDUP_COOLDOWN_MS).toISOString()
    const alreadyQueued = new Set<string>()
    for (const ids of chunk(candidates.map((c) => c.id), DB_IN_CHUNK)) {
      const { data, error } = await supabase
        .from('checker_priority_queue')
        .select('recommendation_id')
        .in('recommendation_id', ids)
        .or(`processed_at.is.null,processed_at.gt.${dedupWindowStart}`)
      if (error) {
        console.error('Dedup query failed:', error)
        return NextResponse.json({ error: 'Dedup query failed' }, { status: 500 })
      }
      for (const row of data ?? []) alreadyQueued.add(String(row.recommendation_id))
    }

    const toFlag = candidates.filter((c) => !alreadyQueued.has(c.id))
    if (toFlag.length > 0) {
      const { error } = await supabase.from('checker_priority_queue').insert(
        toFlag.map((c) => ({
          recommendation_id: c.id,
          source: 'comick',
          source_release_id: c.release.feedId,
          flagged_chapter: c.release.rawChap,
        }))
      )
      if (error) {
        console.error('Failed to queue flags:', error)
        return NextResponse.json({ error: 'Queue insert failed' }, { status: 500 })
      }
    }

    return NextResponse.json({
      checked_chapters: items.length,
      pages_fetched: pagesFetched,
      unique_series: allHids.length,
      tracked_matches: recToRelease.size,
      newly_mapped: newlyMapped,
      flagged: toFlag.length,
      flagged_titles: toFlag.map((c) => c.title),
      stopped_early: stoppedEarlyReason,
      ms: Date.now() - startedAt,
    })
  } catch (err: any) {
    console.error('Comick scanner error:', err)
    return NextResponse.json({ error: err.message ?? 'Unknown error' }, { status: 500 })
  }
}