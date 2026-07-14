import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendDigestEmail, type DigestItem } from '@/lib/email/send'

const LOCK_NAME        = 'notification_digest'
const LOCK_DURATION_MS = 55_000
const TIME_BUDGET_MS   = 22_000 // same cron-job.org 30s ceiling as ID/chapter checkers
const BATCH_USER_LIMIT = 50     // how many distinct users to process per tick

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

  const gotLock = await acquireLock(supabase)
  if (!gotLock) {
    return NextResponse.json({ message: 'Previous digest run still in progress, skipping this tick' })
  }

  const runStart = Date.now()
  let timedOutEarly = false

  try {
    const { data: rows, error } = await supabase
      .from('notification_digest_queue')
      .select('id, user_id, event_type, payload, created_at')
      .is('sent_at', null)
      .order('created_at', { ascending: true })
      .limit(2000)

    if (error) {
      console.error('Digest queue fetch error:', error)
      return NextResponse.json({ error: 'DB fetch failed' }, { status: 500 })
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ message: 'No queued digest items', users_processed: 0 })
    }

    const byUser = new Map<string, { rowIds: string[]; items: DigestItem[] }>()
    for (const row of rows) {
      const entry = byUser.get(row.user_id) ?? { rowIds: [], items: [] }
      entry.rowIds.push(row.id)
      entry.items.push({ event_type: row.event_type, payload: row.payload })
      byUser.set(row.user_id, entry)
    }

    const userIds = [...byUser.keys()].slice(0, BATCH_USER_LIMIT)

    let usersProcessed = 0
    let usersFailed     = 0
    let itemsSent        = 0

    for (const userId of userIds) {
   
      if (Date.now() - runStart > TIME_BUDGET_MS) {
        timedOutEarly = true
        break
      }

      const { rowIds, items } = byUser.get(userId)!

      try {
        await sendDigestEmail(userId, items)

        const { error: markError } = await supabase
          .from('notification_digest_queue')
          .update({ sent_at: new Date().toISOString() })
          .in('id', rowIds)

        if (markError) {
          console.error(`Failed to mark digest rows sent for user ${userId}:`, markError)
          usersFailed++
          continue
        }

        usersProcessed++
        itemsSent += items.length
      } catch (err) {
        console.error(`Digest send failed for user ${userId}:`, err)
        usersFailed++
      }
    }

    return NextResponse.json({
      users_found:      byUser.size,
      users_processed:  usersProcessed,
      users_failed:     usersFailed,
      items_sent:       itemsSent,
      timed_out_early:  timedOutEarly,
    })
  } finally {
    await releaseLock(supabase)
  }
}