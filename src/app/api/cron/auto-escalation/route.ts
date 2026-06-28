import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ESCALATION_HOURS  = 72   // hours before auto-hide if submitter doesn't act
const REPORT_THRESHOLD  = 5    // minimum reports to trigger escalation

export async function GET(req: Request) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const cutoff = new Date(Date.now() - ESCALATION_HOURS * 60 * 60 * 1000).toISOString()

  // Find recs that hit the report threshold 72+ hours ago and are still approved
  const { data: recs } = await supabase
    .from('recommendations')
    .select('id, title, user_id, report_count, report_threshold_hit_at')
    .eq('is_approved', true)
    .eq('auto_hidden', false)
    .not('report_threshold_hit_at', 'is', null)
    .lte('report_threshold_hit_at', cutoff)
    .gte('report_count', REPORT_THRESHOLD)
    .limit(50)

  if (!recs || recs.length === 0) {
    return NextResponse.json({ processed: 0, hidden: 0 })
  }

  let hidden = 0

  for (const rec of recs as any[]) {
    try {
      // Auto-hide the recommendation
      await supabase
        .from('recommendations')
        .update({
          is_approved:    false,
          auto_hidden:    true,
          auto_hidden_at: new Date().toISOString(),
        })
        .eq('id', rec.id)

      // Log it
      await supabase
        .from('activity_logs')
        .insert({
          user_id:     null,
          action:      'auto_hidden_escalation',
          entity_type: 'recommendations',
          entity_id:   rec.id,
          details: {
            title:        rec.title,
            report_count: rec.report_count,
            threshold_hit_at: rec.report_threshold_hit_at,
            reason: `Auto-hidden after ${ESCALATION_HOURS}hrs with ${rec.report_count} unresolved reports`,
          },
        })

      // Notify the submitter
      if (rec.user_id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: rec.user_id,
            type:    'system',
            title:   'Your recommendation was hidden',
            content: `"${rec.title}" has been temporarily hidden due to ${rec.report_count} unresolved reports. Please contact support if you believe this is a mistake.`,
            data:    { entity_id: rec.id, report_count: rec.report_count },
          })
      }

      // Notify admins
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'moderator'])

      if (admins && admins.length > 0) {
        await supabase
          .from('notifications')
          .insert(
            (admins as any[]).map((a: any) => ({
              user_id: a.id,
              type:    'system',
              title:   'Auto-escalation: rec hidden',
              content: `"${rec.title}" was auto-hidden after ${ESCALATION_HOURS}hrs with ${rec.report_count} reports.`,
              data:    { entity_id: rec.id, report_count: rec.report_count },
            }))
          )
      }

      hidden++
    } catch (err) {
      console.error(`[auto-escalation] Failed for ${rec.id}:`, err)
    }
  }

  return NextResponse.json({
    processed: recs.length,
    hidden,
  })
}