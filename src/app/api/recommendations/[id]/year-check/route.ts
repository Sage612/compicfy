import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/utils/requireRole'

const REQUEST_TIMEOUT_MS = 8000

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

async function getYearFromMU(id: string): Promise<number | null> {
  try {
    const res = await fetchWithTimeout(`https://api.mangaupdates.com/v1/series/${id}`)
    if (!res.ok) return null
    const data = await res.json()
    return data?.year ? Number(data.year) : null
  } catch { return null }
}

async function getYearFromMangaDex(id: string): Promise<number | null> {
  try {
    const res = await fetchWithTimeout(`https://api.mangadex.org/manga/${id}`)
    if (!res.ok) return null
    const data = await res.json()
    const year = data?.data?.attributes?.year
    return year ? Number(year) : null
  } catch { return null }
}

async function getYearFromAniList(id: string): Promise<number | null> {
  try {
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
  } catch { return null }
}

async function getYearFromJikan(id: string): Promise<number | null> {
  try {
    const res = await fetchWithTimeout(`https://api.jikan.moe/v4/manga/${id}`)
    if (!res.ok) return null
    const data = await res.json()
    const from = data?.data?.published?.from
    return from ? new Date(from).getFullYear() : null
  } catch { return null }
}

// ── On-demand, reviewer-triggered only — not a cron, no batching needed ──
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireRole(false)
    if (auth.error) return auth.error

    const { supabase } = auth
    const { id } = await params

    const { data: comic, error } = await (supabase as any)
      .from('recommendations')
      .select('id, title, year_released, year_confidence, mangaupdates_id, mangadex_id, anilist_id, mal_id')
      .eq('id', id)
      .maybeSingle()

    if (error || !comic) {
      return NextResponse.json({ error: 'Comic not found' }, { status: 404 })
    }

    const checks: { source: string; id: string | null; fetcher: (id: string) => Promise<number | null> }[] = [
      { source: 'MangaUpdates', id: comic.mangaupdates_id, fetcher: getYearFromMU },
      { source: 'MangaDex',     id: comic.mangadex_id,     fetcher: getYearFromMangaDex },
      { source: 'AniList',      id: comic.anilist_id,      fetcher: getYearFromAniList },
      { source: 'MAL',          id: comic.mal_id,           fetcher: getYearFromJikan },
    ].filter(c => !!c.id)

    if (checks.length === 0) {
      return NextResponse.json({
        has_external_ids: false,
        db_year:          comic.year_released ?? null,
        year_confidence:  comic.year_confidence ?? 'unverified',
        sources:          [],
      })
    }

    // Run all source lookups in parallel — this is on-demand and reviewer-triggered,
    // not a batched cron job, so there's no rate-limit concern from a single burst.
    const results = await Promise.all(
      checks.map(async ({ source, id, fetcher }) => ({
        source,
        external_id:   id,
        resolved_year: await fetcher(id as string),
      }))
    )

    const dbYear = comic.year_released ?? null
    const disagreements = results.filter(r =>
      r.resolved_year !== null && dbYear !== null && Math.abs(r.resolved_year - dbYear) > 1
    )

    return NextResponse.json({
      has_external_ids: true,
      db_year:          dbYear,
      year_confidence:  comic.year_confidence ?? 'unverified',
      sources:          results,
      has_disagreement: disagreements.length > 0,
    })
  } catch (err) {
    console.error('Year cross-check error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}