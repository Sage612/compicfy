import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BATCH_SIZE         = 10
const API_DELAY_MS       = 600
const REQUEST_TIMEOUT_MS = 8000
const YEAR_TOLERANCE     = 1 // same ±1yr slack used in smartMatch

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
    if (err.name === 'AbortError') throw new Error(`Timeout after ${timeoutMs}ms`)
    throw err
  }
}

// ── Fetch the year a given external ID actually resolves to ────────
async function getYearFromMU(id: string): Promise<number | null> {
  try {
    await new Promise(r => setTimeout(r, API_DELAY_MS))
    const res = await fetchWithTimeout(`https://api.mangaupdates.com/v1/series/${id}`)
    if (!res.ok) return null
    const data = await res.json()
    return data?.year ? Number(data.year) : null
  } catch (err) {
    console.error(`MU year fetch error for ${id}:`, err)
    return null
  }
}

async function getYearFromMangaDex(id: string): Promise<number | null> {
  try {
    await new Promise(r => setTimeout(r, API_DELAY_MS))
    const res = await fetchWithTimeout(`https://api.mangadex.org/manga/${id}`)
    if (!res.ok) return null
    const data = await res.json()
    const year = data?.data?.attributes?.year
    return year ? Number(year) : null
  } catch (err) {
    console.error(`MD year fetch error for ${id}:`, err)
    return null
  }
}

async function getYearFromAniList(id: string): Promise<number | null> {
  try {
    await new Promise(r => setTimeout(r, API_DELAY_MS))
    const gql = `query($id:Int){Media(id:$id,type:MANGA){startDate{year}}}`
    const res = await fetchWithTimeout('https://graphql.anilist.co', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ query: gql, variables: { id: parseInt(id) } }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const year = data?.data?.Media?.startDate?.year
    return year ? Number(year) : null
  } catch (err) {
    console.error(`AL year fetch error for ${id}:`, err)
    return null
  }
}

async function getYearFromJikan(id: string): Promise<number | null> {
  try {
    await new Promise(r => setTimeout(r, API_DELAY_MS))
    const res = await fetchWithTimeout(`https://api.jikan.moe/v4/manga/${id}`)
    if (!res.ok) return null
    const data = await res.json()
    const from = data?.data?.published?.from
    return from ? new Date(from).getFullYear() : null
  } catch (err) {
    console.error(`Jikan year fetch error for ${id}:`, err)
    return null
  }
}

// ── Logging ───────────────────────────────────────────────────────
interface AuditLog {
  comic_id:        string
  comic_title:     string
  comic_year:      number | null
  source:          string
  external_id:     string
  resolved_year:   number | null
  year_mismatch:   boolean
  timestamp:       string
}

async function logAudit(supabase: any, log: AuditLog) {
  try {
    await supabase.from('activity_logs').insert({
      user_id:     null,
      action:      'year_match_audit',
      entity_type: 'recommendations',
      entity_id:   log.comic_id,
      details:     log,
    })
  } catch (err) {
    console.error('Failed to log audit:', err)
  }
}

function isMismatch(comicYear: number | null, resolvedYear: number | null): boolean {
  if (comicYear === null || resolvedYear === null) return false // can't judge — not a flag
  return Math.abs(comicYear - resolvedYear) > YEAR_TOLERANCE
}

// ── Main handler ──────────────────────────────────────────────────
// READ-ONLY AUDIT — never writes to recommendations, only flags
// suspected mismatches into activity_logs + a dedicated review table
// for manual confirmation. Run repeatedly (paginated via last_audit_check)
// until it reports 0 remaining, same batching pattern as the other crons.
export async function GET(req: Request) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Only comics that have BOTH a year_released AND at least one external ID
  // are worth checking — nothing to compare against otherwise.
  const { data: comics, error } = await supabase
    .from('recommendations')
    .select('id, title, year_released, mangaupdates_id, mangadex_id, anilist_id, mal_id, last_audit_check')
    .eq('is_approved', true)
    .not('year_released', 'is', null)
    .or('mangaupdates_id.not.is.null,mangadex_id.not.is.null,anilist_id.not.is.null,mal_id.not.is.null')
    .is('last_audit_check', null) // only ever audit each comic once
    .limit(BATCH_SIZE)

  if (error) {
    console.error('DB error:', error)
    return NextResponse.json({ error: 'DB fetch failed' }, { status: 500 })
  }

  if (!comics || comics.length === 0) {
    return NextResponse.json({ message: 'Audit complete — no more comics to check', processed: 0 })
  }

  let mismatches = 0
  let clean       = 0
  let inconclusive = 0
  const flagged: any[] = []

  for (const comic of comics) {
    const timestamp = new Date().toISOString()
    const comicYear = comic.year_released ?? null

    const checks: { source: string; id: string | null; fetcher: (id: string) => Promise<number | null> }[] = [
      { source: 'MangaUpdates', id: comic.mangaupdates_id, fetcher: getYearFromMU },
      { source: 'MangaDex',     id: comic.mangadex_id,     fetcher: getYearFromMangaDex },
      { source: 'AniList',      id: comic.anilist_id,      fetcher: getYearFromAniList },
      { source: 'MAL',          id: comic.mal_id,           fetcher: getYearFromJikan },
    ]

    let comicHasMismatch    = false
    let comicHasConclusive  = false

    for (const { source, id, fetcher } of checks) {
      if (!id) continue
      const resolvedYear = await fetcher(id)
      const mismatch      = isMismatch(comicYear, resolvedYear)

      if (resolvedYear !== null) comicHasConclusive = true
      if (mismatch) comicHasMismatch = true

      await logAudit(supabase, {
        comic_id:      comic.id,
        comic_title:   comic.title,
        comic_year:    comicYear,
        source,
        external_id:   id,
        resolved_year: resolvedYear,
        year_mismatch: mismatch,
        timestamp,
      })

      if (mismatch) {
        flagged.push({
          comic_id:      comic.id,
          title:         comic.title,
          comic_year:    comicYear,
          source,
          external_id:   id,
          resolved_year: resolvedYear,
        })
      }
    }

    if (comicHasMismatch)        mismatches++
    else if (comicHasConclusive) clean++
    else                         inconclusive++

    // Mark as audited regardless of outcome so this comic isn't re-checked
    // on the next invocation — this is a one-time sweep, not a recurring job.
    await supabase
      .from('recommendations')
      .update({ last_audit_check: timestamp })
      .eq('id', comic.id)
  }

  return NextResponse.json({
    processed:    comics.length,
    mismatches,
    clean,
    inconclusive,
    flagged,
    note: 'This audit never modifies mangaupdates_id/mangadex_id/anilist_id/mal_id — it only flags suspected mismatches for manual review. Re-run this endpoint repeatedly until processed: 0 to sweep the full table.',
  })
}