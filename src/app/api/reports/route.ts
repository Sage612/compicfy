import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const REPORT_THRESHOLD = 5  // reports before escalation timer starts

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { entity_type, entity_id, reason, details } = body

  if (!entity_type || !entity_id || !reason) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const allowedTypes = ['recommendation', 'review', 'user', 'comment']
  if (!allowedTypes.includes(entity_type)) {
    return NextResponse.json({ error: 'Invalid entity_type' }, { status: 400 })
  }

  // Prevent duplicate reports
  const { data: existing } = await (supabase as any)
    .from('reports')
    .select('id')
    .eq('reporter_id', user.id)
    .eq('entity_id', entity_id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Already reported' }, { status: 409 })
  }

  // Insert the report
  // FIX: `reports` isn't in the generated Supabase types (typed as `never`),
  // which is why every .insert()/.update() on it failed to type-check.
  // Cast the client to `any` for this call, same pattern used everywhere
  // else in the codebase for tables/columns the generated types don't know
  // about yet (e.g. `(supabase as any).rpc(...)` elsewhere).
  const { error: insertError } = await (supabase as any)
    .from('reports')
    .insert({
      reporter_id: user.id,
      entity_type,
      entity_id,
      reason,
      details: details ?? null,
      status:  'pending',
    })

  if (insertError) {
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
  }

  // ── If reporting a recommendation, increment report_count + check threshold ──
  if (entity_type === 'recommendation') {
    const { data: rec } = await (supabase as any)
      .from('recommendations')
      .select('report_count, user_id, title, report_threshold_hit_at')
      .eq('id', entity_id)
      .single()

    if (rec) {
      const newCount = (rec.report_count ?? 0) + 1
      const hitThreshold = newCount >= REPORT_THRESHOLD && !rec.report_threshold_hit_at

      await (supabase as any)
        .from('recommendations')
        .update({
          report_count:             newCount,
          ...(hitThreshold ? { report_threshold_hit_at: new Date().toISOString() } : {}),
        })
        .eq('id', entity_id)

      // ── Notify the submitter ──────────────────────────────────────────────
      if (rec.user_id) {
        await (supabase as any)
          .from('notifications')
          .insert({
            user_id: rec.user_id,
            type:    'system',
            title:   'Your recommendation was reported',
            content: `"${rec.title}" received a report for: ${reason}. Please review your submission to ensure it meets our guidelines.`,
            data:    { entity_type, entity_id, reason },
          })
      }

      // ── Notify all admins ─────────────────────────────────────────────────
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'moderator'])

      if (admins && admins.length > 0) {
        await (supabase as any)
          .from('notifications')
          .insert(
            admins.map((a: any) => ({
              user_id: a.id,
              type:    'system',
              title:   `Report filed: "${rec.title}"`,
              content: `A report was filed for recommendation "${rec.title}". Reason: ${reason}. Total reports: ${newCount}.`,
              data:    { entity_type, entity_id, reason, report_count: newCount },
            }))
          )
      }
    }
  }

  // ── If reporting a review, notify review author + admins ──────────────────
  if (entity_type === 'review') {
    const { data: review } = await (supabase as any)
      .from('reviews')
      .select('user_id, content, recommendation_id, report_count')
      .eq('id', entity_id)
      .single()

    if (review) {
      // FIX: this previously did
      //   .update({ report_count: supabase.rpc as any })
      // which assigns the `rpc` *function reference* itself as the column
      // value — not a number, not an increment, just a broken no-op that
      // also happened to type-check away the real bug behind `as any`.
      // Replaced with the same read-then-increment pattern used above for
      // recommendations.
      await (supabase as any)
        .from('reviews')
        .update({ report_count: (review.report_count ?? 0) + 1 })
        .eq('id', entity_id)

      // Notify review author
      await (supabase as any)
        .from('notifications')
        .insert({
          user_id: review.user_id,
          type:    'system',
          title:   'Your review was reported',
          content: `One of your reviews was reported for: ${reason}. Please ensure your reviews follow our community guidelines.`,
          data:    { entity_type, entity_id, reason },
        })

      // Notify admins
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'moderator'])

      if (admins && admins.length > 0) {
        await (supabase as any)
          .from('notifications')
          .insert(
            admins.map((a: any) => ({
              user_id: a.id,
              type:    'system',
              title:   'Review reported',
              content: `A review was reported for: ${reason}.`,
              data:    { entity_type, entity_id, reason },
            }))
          )
      }
    }
  }

  return NextResponse.json({ success: true })
}