import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BATCH_SIZE         = 10
const API_DELAY_MS       = 600
const REQUEST_TIMEOUT_MS = 8000
const LOCK_NAME          = 'more_info_checker'
const LOCK_DURATION_MS   = 55_000
const ID_LOCK_NAME       = 'id_checker'
const CHAPTER_LOCK_NAME  = 'chapter_checker'
const RECHECK_DAYS       = 14 // re-attempt comics that still have no link after this long
const YEAR_TOLERANCE     = 1

// ── Fetch with timeout — same helper as id-checker / chapter-checker ──
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
    r === 'webtoon' ||
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
  series_id: number
  title:     string
  author?:   string
  artist?:   string
  year?:     number | null
  format:    NormalizedFormat
}

function smartMatch(
  query:       string,
  candidates:  Candidate[],
  authorHint?: string | null,
  artistHint?: string | null,
  yearHint?:   number | null,
): Candidate | null {
  const nq = normalize(query)
  const na = authorHint ? normalize(authorHint) : null
  const nr = artistHint ? normalize(artistHint) : null

  const pool = candidates.filter(c => c.format === 'manga')

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

  if (yearHint) {
    const yearMatch = exactTitleMatches.find(yearConfirmed)
    if (yearMatch) return yearMatch
  }

  if (na || nr) {
    const match = exactTitleMatches.find(authorArtistConfirmed)
    if (match) return match
  }

  if (exactTitleMatches.length === 1) return exactTitleMatches[0]

  if (na || nr) {
    for (const c of pool) {
      const ct = normalize(c.title)
      const isContained = ct.includes(nq) || nq.includes(ct)
      if (isContained && ct !== nq && authorArtistConfirmed(c)) return c
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

async function findMangaUpdatesLink(
  titles:  string[],
  author?: string | null,
  artist?: string | null,
  year?:   number | null,
): Promise<string | null> {
  for (const title of titles) {
    try {
      await new Promise(r => setTimeout(r, API_DELAY_MS))
      const res = await fetchWithTimeout('https://api.mangaupdates.com/v1/series/search', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ search: title, perpage: 10 }),
      })
      if (!res.ok) continue
      const data = await res.json()
      const rawResults = (data.results ?? []) as any[]

      const candidatesNoFormat = rawResults.slice(0, 5).map((r: any) => ({
        series_id: Number(r.record?.series_id ?? 0),
        title:     String(r.record?.title ?? ''),
        author:    r.record?.author ?? '',
        artist:    r.record?.artist ?? '',
        year:      r.record?.year ? Number(r.record.year) : null,
      }))

      const candidates: Candidate[] = await Promise.all(
        candidatesNoFormat.map(async (c) => {
          if (!c.series_id) return { ...c, format: 'other' as NormalizedFormat }
          await new Promise(r => setTimeout(r, API_DELAY_MS))
          try {
            const detailRes = await fetchWithTimeout(`https://api.mangaupdates.com/v1/series/${c.series_id}`)
            if (!detailRes.ok) return { ...c, format: 'other' as NormalizedFormat }
            const detail = await detailRes.json()
            return { ...c, format: normalizeFormat(detail?.type ?? null) }
          } catch {
            return { ...c, format: 'other' as NormalizedFormat }
          }
        })
      )

      const match = smartMatch(title, candidates, author, artist, year)
      if (match) return `https://www.mangaupdates.com/series/${match.series_id}`
    } catch (err) {
      console.error(`[more_info_checker] MU error for "${title}":`, err)
    }
  }
  return null
}

interface CheckLog {
  comic_id:    string
  comic_title: string
  status:      'found' | 'not_found' | 'skipped_has_link' | 'failed'
  link_found?: string
  reason?:     string
  timestamp:   string
}

async function logCheck(supabase: any, log: CheckLog) {
  try {
    await supabase.from('activity_logs').insert({
      user_id:     null,
      action:      'more_info_check',
      entity_type: 'recommendations',
      entity_id:   log.comic_id,
      details:     log,
    })
  } catch (err) {
    console.error('Failed to log:', err)
  }
}

// ── Lock helpers — same pattern as chapter-checker's yield behavior ──
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

async function isOtherCheckerActive(supabase: any): Promise<boolean> {
  const { data: locks } = await supabase
    .from('cron_locks')
    .select('job_name, locked_until')
    .in('job_name', [ID_LOCK_NAME, CHAPTER_LOCK_NAME])

  const now = new Date()
  return !!(locks ?? []).some((l: any) => new Date(l.locked_until) > now)
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

  if (await isOtherCheckerActive(supabase)) {
    return NextResponse.json({ message: 'ID Checker or Chapter Checker lock is active. Yielding this tick.' })
  }

  const gotLock = await acquireLock(supabase)
  if (!gotLock) {
    return NextResponse.json({ message: 'Previous run still in progress, skipping this tick' })
  }

  try {
    const recheckCutoff = new Date(Date.now() - RECHECK_DAYS * 24 * 60 * 60 * 1000).toISOString()

    const { data: comics, error } = await supabase
      .from('recommendations')
      .select('id, title, alternative_titles, author, artist, year_released, more_info_link, more_info_link_source, last_more_info_check')
      .eq('is_approved', true)
      .is('more_info_link', null)
      .or(`last_more_info_check.is.null,last_more_info_check.lt.${recheckCutoff}`)
      .limit(BATCH_SIZE)

    if (error) {
      console.error('DB error:', error)
      return NextResponse.json({ error: 'DB fetch failed' }, { status: 500 })
    }

    if (!comics || comics.length === 0) {
      return NextResponse.json({ message: 'No comics need checking', processed: 0 })
    }

    let found = 0, notFound = 0
    const logs: CheckLog[] = []

    for (const comic of comics) {
      const timestamp = new Date().toISOString()

      if (comic.more_info_link) {
        logs.push({
          comic_id: comic.id, comic_title: comic.title,
          status: 'skipped_has_link', timestamp,
        })
        continue
      }

      try {
        const titles = buildQueryTitles(comic.title, comic.alternative_titles)
        const link = await findMangaUpdatesLink(
          titles, comic.author, comic.artist, comic.year_released ?? null,
        )

        if (link) {
          await supabase.from('recommendations').update({
            more_info_link:             link,
            more_info_link_source:      'auto_fetched',
            more_info_link_verified_at: null,
            last_more_info_check:       timestamp,
          }).eq('id', comic.id)

          found++
          logs.push({
            comic_id: comic.id, comic_title: comic.title,
            status: 'found', link_found: link, timestamp,
          })
        } else {
          await supabase.from('recommendations')
            .update({ last_more_info_check: timestamp })
            .eq('id', comic.id)

          notFound++
          logs.push({
            comic_id: comic.id, comic_title: comic.title,
            status: 'not_found', reason: 'No confident match found', timestamp,
          })
        }
      } catch (err: any) {
        console.error(`[more_info_checker] Error processing ${comic.title}:`, err)
        await supabase.from('recommendations')
          .update({ last_more_info_check: timestamp })
          .eq('id', comic.id)

        logs.push({
          comic_id: comic.id, comic_title: comic.title,
          status: 'failed', reason: err?.message ?? 'Unknown error', timestamp,
        })
      }
    }

    for (const log of logs) await logCheck(supabase, log)

    return NextResponse.json({
      processed: logs.length,
      found,
      not_found: notFound,
    })
  } finally {
    await releaseLock(supabase)
  }
}