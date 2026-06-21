import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const YEAR_TOLERANCE = 1

interface AuditRow {
  comic_id:      string
  comic_title:   string
  source:        string
  resolved_year: number | null
}

function deriveConsensus(rows: AuditRow[]): { year: number | null; outlierSources: string[] } {
  const withYear = rows.filter(r => r.resolved_year !== null)
  if (withYear.length === 0) return { year: null, outlierSources: [] }
  if (withYear.length === 1) return { year: withYear[0].resolved_year, outlierSources: [] }

  const clusters: { year: number; sources: string[] }[] = []
  for (const r of withYear) {
    const y = r.resolved_year as number
    const existing = clusters.find(c => Math.abs(c.year - y) <= YEAR_TOLERANCE)
    if (existing) existing.sources.push(r.source)
    else clusters.push({ year: y, sources: [r.source] })
  }
  clusters.sort((a, b) => b.sources.length - a.sources.length)

  const winner = clusters[0]
  if (winner.sources.length < 2) return { year: null, outlierSources: withYear.map(r => r.source) }

  const outlierSources = withYear
    .filter(r => !winner.sources.includes(r.source))
    .map(r => r.source)

  return { year: winner.year, outlierSources }
}

const SOURCE_TO_COLUMN: Record<string, string> = {
  MangaUpdates: 'mangaupdates_id',
  MangaDex:     'mangadex_id',
  AniList:      'anilist_id',
  MAL:          'mal_id',
}

// ── DRY RUN by default — pass ?apply=true to actually write changes ──
export async function GET(req: Request) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url   = new URL(req.url)
  const apply = url.searchParams.get('apply') === 'true'

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Pull every audit log row from the completed sweep
  const { data: auditLogs, error } = await supabase
    .from('activity_logs')
    .select('entity_id, details')
    .eq('action', 'year_match_audit')

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }

  // Group by comic_id
  const byComic = new Map<string, AuditRow[]>()
  for (const log of auditLogs ?? []) {
    const d = log.details as any
    const row: AuditRow = {
      comic_id:      d.comic_id,
      comic_title:   d.comic_title,
      source:        d.source,
      resolved_year: d.resolved_year,
    }
    const existing = byComic.get(row.comic_id) ?? []
    existing.push(row)
    byComic.set(row.comic_id, existing)
  }

  const planned: any[] = []

  for (const [comicId, rows] of byComic.entries()) {
    const { year: consensusYear, outlierSources } = deriveConsensus(rows)
    if (consensusYear === null) continue // no agreement reached — skip, needs manual review

    const { data: comic } = await supabase
      .from('recommendations')
      .select('id, title, year_released, year_confidence, mangaupdates_id, mangadex_id, anilist_id, mal_id')
      .eq('id', comicId)
      .maybeSingle()

    if (!comic) continue

    const currentYear = comic.year_released ?? null
    const yearDisagrees = currentYear === null || Math.abs(currentYear - consensusYear) > YEAR_TOLERANCE

    const updatePayload: Record<string, any> = {}
    if (yearDisagrees) {
      updatePayload.year_released   = consensusYear
      updatePayload.year_confidence = 'confirmed'
    } else {
      updatePayload.year_confidence = 'confirmed'
    }

    const clearedColumns: string[] = []
    for (const src of outlierSources) {
      const col = SOURCE_TO_COLUMN[src]
      if (col && (comic as any)[col]) {
        updatePayload[col] = null
        clearedColumns.push(col)
      }
    }

    planned.push({
      comic_id:        comicId,
      title:            rows[0]?.comic_title ?? comic.title,
      year_before:      currentYear,
      year_after:       updatePayload.year_released ?? currentYear,
      year_corrected:   yearDisagrees,
      cleared_ids:      clearedColumns,
    })

    if (apply) {
      await supabase.from('recommendations').update(updatePayload).eq('id', comicId)
    }
  }

  return NextResponse.json({
    mode:            apply ? 'APPLIED' : 'DRY RUN pass ?apply=true to write changes',
    total_comics:    byComic.size,
    changes_planned: planned.length,
    changes:         planned,
  })
}