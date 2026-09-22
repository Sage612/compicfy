import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isProUser } from '@/lib/access'

/**
 * GET /api/release-radar?week_offset=0&type=manga&genre=Action&status=ongoing
 *
 * Returns the user's tracked comics (status reading/plan_to_read) whose
 * last_chapter_released_at falls within the requested week (Mon–Sun).
 *
 * week_offset: 0 = current week (default), negative = that many weeks back.
 * Positive offsets are rejected — releases are historical facts, not
 * predictions, so "next week" has nothing to show yet.
 *
 * Free tier: week_offset must be 0, filters are ignored.
 * Pro tier: any non-positive week_offset, plus type/genre/status filters.
 */

function getWeekRange(weekOffset: number): { start: string; end: string } {
  const now = new Date()
  // Normalize to Monday-start week in UTC to keep the range deterministic
  // regardless of server timezone.
  const day = now.getUTCDay() // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diffToMonday))
  monday.setUTCDate(monday.getUTCDate() + weekOffset * 7)
  monday.setUTCHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setUTCDate(sunday.getUTCDate() + 7)

  return { start: monday.toISOString(), end: sunday.toISOString() }
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('is_pro, pro_expires_at, role')
      .eq('id', user.id)
      .single()

    const isPro = profile ? isProUser(profile) : false

    const { searchParams } = new URL(req.url)
    const requestedOffset = parseInt(searchParams.get('week_offset') ?? '0', 10)
    const weekOffset = Number.isNaN(requestedOffset) ? 0 : requestedOffset

    if (weekOffset > 0) {
      return NextResponse.json({ error: 'Cannot view future weeks' }, { status: 400 })
    }
    if (!isPro && weekOffset !== 0) {
      return NextResponse.json(
        { error: 'locked', message: 'Browsing past weeks is a Pro feature.', upgrade_url: '/pricing' },
        { status: 403 }
      )
    }

    const typeFilter   = isPro ? searchParams.get('type')   : null
    const genreFilter  = isPro ? searchParams.get('genre')  : null
    const statusFilter = isPro ? searchParams.get('status') : null

    const { start, end } = getWeekRange(weekOffset)

    // Only ONE dot-notation cross-table filter (reading_lists.user_id) —
    // this exact pattern is already proven safe in
    // /api/reading-progress/updates. Filtering on a SECOND joined table's
    // columns in the same query (recommendations.last_chapter_released_at,
    // .type, .status) turned out to be the actual bug here: Supabase's
    // query builder silently failed when combining dot-notation filters
    // across two different embedded resources at once. Everything below
    // is filtered in plain JS instead, after a single safe fetch.
    const { data: items, error } = await supabase
      .from('reading_list_items')
      .select(`
        list_id, status, progress_chapter,
        reading_lists!inner(user_id),
        recommendations!inner(id, title, cover_url, type, status, genres, chapter_count, last_chapter_released_at)
      `)
      .eq('reading_lists.user_id', user.id)
      .in('status', ['reading', 'plan_to_read'])

    if (error) return NextResponse.json({ error: 'Failed to fetch release radar' }, { status: 500 })

    let results = (items ?? [])
      .filter((item: any) => {
        const releasedAt = item.recommendations?.last_chapter_released_at
        if (!releasedAt) return false
        return releasedAt >= start && releasedAt < end
      })
      .filter((item: any) => !typeFilter   || item.recommendations.type   === typeFilter)
      .filter((item: any) => !statusFilter || item.recommendations.status === statusFilter)
      .map((item: any) => ({
        list_id:                   item.list_id,
        recommendation_id:         item.recommendations.id,
        title:                     item.recommendations.title,
        cover_url:                 item.recommendations.cover_url,
        type:                      item.recommendations.type,
        genres:                    item.recommendations.genres ?? [],
        chapter_count:             item.recommendations.chapter_count,
        progress_chapter:          item.progress_chapter,
        last_chapter_released_at:  item.recommendations.last_chapter_released_at,
      }))

    // genres is a text[] column — filtered in JS since Supabase's query
    // builder .contains() on an array needs an exact-shape array literal,
    // and a single genre substring match is simpler to reason about here.
    if (genreFilter) {
      results = results.filter(r => r.genres.includes(genreFilter))
    }

    results.sort((a, b) => (b.last_chapter_released_at ?? '').localeCompare(a.last_chapter_released_at ?? ''))

    const format = searchParams.get('format') as 'csv' | 'pdf' | null

    if (format) {
      // Export is Pro-only, same as the week/filter gating above — no
      // separate enforcement helper reused here since this route already
      // has its own isPro check from the profile lookup above, and
      // duplicating that logic through a second gate would just be two
      // sources of truth for the same fact.
      if (!isPro) {
        return NextResponse.json(
          { error: 'locked', message: 'Exporting Release Radar is a Pro feature.', upgrade_url: '/pricing' },
          { status: 403 }
        )
      }

      const weekLabel = `${new Date(start).toLocaleDateString()}–${new Date(new Date(end).getTime() - 86400000).toLocaleDateString()}`

      if (format === 'csv') {
        const headers = ['Title', 'Type', 'Chapter', 'Released', 'Genres']
        const rows = results.map(r => [
          `"${r.title}"`,
          r.type ?? '',
          String(r.chapter_count ?? ''),
          r.last_chapter_released_at ? new Date(r.last_chapter_released_at).toLocaleDateString() : '',
          `"${(r.genres ?? []).join(', ')}"`,
        ].join(','))

        const csv = [headers.join(','), ...rows].join('\n')

        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="Release-Radar-${weekLabel}-ComPicfy.csv"`,
          },
        })
      }

      if (format === 'pdf') {
        // Same styled-HTML-for-browser-print approach as the reading-list
        // export, matching its visual language (badges, numbered rows,
        // footer) so this doesn't look like a second, different export
        // system living in the same app.
        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Release Radar — ${weekLabel} — ComPicfy</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a; }
    h1 { font-size: 24px; font-weight: 900; margin-bottom: 4px; }
    .meta { color: #666; font-size: 13px; margin-bottom: 32px; }
    .item { display: flex; gap: 16px; padding: 12px 0; border-bottom: 1px solid #eee; }
    .num { font-size: 18px; font-weight: 900; color: #ccc; width: 28px; shrink: 0; }
    .info { flex: 1; }
    .title { font-weight: 700; font-size: 14px; }
    .details { font-size: 12px; color: #666; margin-top: 2px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 700; background: #f0f0f0; margin-right: 4px; text-transform: capitalize; }
    .footer { margin-top: 40px; font-size: 11px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <h1>Release Radar</h1>
  <p class="meta">Week of ${weekLabel} · ${results.length} comic${results.length !== 1 ? 's' : ''} · Exported from ComPicfy on ${new Date().toLocaleDateString()}</p>
  ${results.map((r, i) => `
    <div class="item">
      <div class="num">#${i + 1}</div>
      <div class="info">
        <div class="title">${r.title}</div>
        <div class="details">
          <span class="badge">${r.type ?? ''}</span>
          <span class="badge">Ch. ${r.chapter_count ?? ''}</span>
          ${(r.genres ?? []).slice(0, 3).map((g: string) => `<span class="badge">${g}</span>`).join('')}
        </div>
        <div class="details" style="margin-top:4px">Released: ${r.last_chapter_released_at ? new Date(r.last_chapter_released_at).toLocaleDateString() : 'Unknown'}</div>
      </div>
    </div>`).join('')}
  <div class="footer">Generated by ComPicfy Pro · compicfy.com</div>
</body>
</html>`

        return new NextResponse(html, {
          headers: {
            'Content-Type': 'text/html',
            'Content-Disposition': `attachment; filename="Release-Radar-${weekLabel}-ComPicfy.html"`,
          },
        })
      }
    }

    return NextResponse.json({
      results,
      count:        results.length,
      week_offset:  weekOffset,
      week_start:   start,
      week_end:     end,
      is_pro:       isPro,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch release radar' }, { status: 500 })
  }
}