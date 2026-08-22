import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/utils/requireRole'

export async function GET(request: Request) {
  const auth = await requireRole(true) // admin only
  if (auth.error) return auth.error

  const { supabase } = auth
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1')
  const actionFilter = searchParams.get('action') ?? null
  const search = searchParams.get('search')?.trim() ?? null
  const limit = 50
  const offset = (page - 1) * limit

  let query = supabase!
    .from('activity_logs')
    .select('*, profiles(id, username, avatar_url)', { count: 'exact' })

  if (actionFilter) {
    query = query.ilike('action', `%${actionFilter}%`)
  }

  // ✅ FIXED: Search across log fields + username via filter
  if (search) {
    query = query
      .or(`action.ilike.%${search}%,details->>title.ilike.%${search}%,details->>comic_title.ilike.%${search}%`)
      .filter('profiles.username', 'ilike', `%${search}%`)
  }

  const { data, error: fetchError, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (fetchError) {
    console.error('Fetch error:', fetchError)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }

  const logs = data?.map((log: any) => {
    const details = log.details ?? {}
    return {
      id: log.id,
      action: log.action,
      entity_type: log.entity_type,
      entity_id: log.entity_id,
      user_id: log.user_id,
      profile: log.profiles,
      created_at: log.created_at,
      ip_address: log.ip_address,
      user_agent: log.user_agent,
      details,
      summary: {
        title: details.title ?? details.comic_title ?? 'N/A',
        status: details.status ?? null,
        type: details.type ?? null,
        source: details.source ?? null,
        reason: details.reason ?? null,
        error: details.error ?? null,
      },
      approval: details.status ? {
        status: details.status,
        passed: details.passed_conditions,
        total: details.total_conditions,
        failed_count: details.failed_conditions?.length ?? 0,
      } : null,
      submission: details.status === 'submitted' || details.status === 'skipped' || details.status === 'failed' ? {
        status: details.status,
        type: details.type,
        author: details.author,
        artist: details.artist,
        genres: details.genres,
        platforms: details.platforms,
        ids: {
          mu: details.external_ids?.mangaupdates_id,
          mb: details.external_ids?.mangabaka_id,
          md: details.external_ids?.mangadex_id,
          al: details.external_ids?.anilist_id,
          mal: details.external_ids?.mal_id,
        },
      } : null,
      // ── Fast-lane context ──────────────────────────────────────────
      // time_in_queue_seconds is only ever present on a log entry when
      // the checked comic came in through checker_priority_queue (see
      // the chapter checker's CheckLog.time_in_queue_seconds field) - a
      // normal scheduled-sweep check never sets it. So its mere presence
      // is what flags this entry as "resolved via the fast lane" for the
      // admin UI, without needing a separate boolean written at insert
      // time.
      chapter_check: details.database_success ? {
        database: details.database_success,
        tried: details.database_tried,
        old_chapters: details.old_chapter_count,
        new_chapters: details.new_chapter_count,
        platforms: details.platforms_found,
        time_in_queue_seconds: details.time_in_queue_seconds ?? null,
        via_fast_lane: typeof details.time_in_queue_seconds === 'number',
      } : null,
      id_check: details.ids_found ? {
        found: details.ids_found,
        total: details.total_ids_found,
        databases: details.databases_checked,
      } : null,
    }
  }) ?? []

  return NextResponse.json({
    logs,
    total: count,
    hasMore: (count ?? 0) > offset + limit,
    page,
  })
}