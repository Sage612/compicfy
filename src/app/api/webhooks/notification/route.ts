import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const secret = req.headers.get('x-webhook-secret')
    // FIX: was `if (process.env.WEBHOOK_SECRET && secret !== ...)` — same
    // fail-open bug as push/send. If WEBHOOK_SECRET was ever unset, this
    // check never ran, and anyone could POST a forged "notification
    // insert" payload with an arbitrary title/content, which this route
    // then forwards straight into push/send for any user_id. Now fails
    // CLOSED: a missing secret blocks the request.
    if (!process.env.WEBHOOK_SECRET || secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await req.json()

    if (payload.type !== 'INSERT') {
      return NextResponse.json({ skipped: true })
    }

    const notif = payload.record
    if (!notif?.user_id || !notif?.title) {
      return NextResponse.json({ skipped: true })
    }

    // Respect the per-notification push preference computed at insert time.
    // Defaults to true (via DB column default) for any insert path that hasn't
    // been updated to set it explicitly yet.
    if (notif.should_push === false) {
      return NextResponse.json({ skipped: true, reason: 'push_not_requested' })
    }

    // Use service role to bypass RLS — no user session in webhook context
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Check subscriptions exist
    const { data: subCheck } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', notif.user_id)
      .limit(1)

    if (!subCheck || subCheck.length === 0) {
      return NextResponse.json({ skipped: true, reason: 'no_subscriptions' })
    }

    // Fetch profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('email_notifications, is_banned, is_suspended, role, is_pro, pro_expires_at, is_patron, patron_expires_at')
      .eq('id', notif.user_id)
      .single()

    if (!profile) {
      return NextResponse.json({ skipped: true, reason: 'no_profile' })
    }

    if (profile.is_banned || profile.is_suspended) {
      return NextResponse.json({ skipped: true, reason: 'user_restricted' })
    }

    if (profile.email_notifications === false) {
      return NextResponse.json({ skipped: true, reason: 'notifications_disabled' })
    }

    // Determine pro status for URL routing
    const isPro =
      profile.role === 'admin' ||
      profile.role === 'moderator' ||
      (profile.is_pro && (
        !profile.pro_expires_at ||
        new Date(profile.pro_expires_at) > new Date()
      ))

    const notifBase     = isPro ? '/pro' : '/dashboard'
    const dashboardBase = isPro ? '/pro' : '/dashboard'

    // Build URL based on notification type
    const data = notif.data ?? {}
    let url = `${notifBase}/notifications`

    switch (notif.type) {
      case 'vote':
      case 'vote_milestone':
      case 'review':
        url = data.recommendation_id
          ? `/comic/${data.recommendation_id}`
          : `${dashboardBase}/recommendations`
        break
      case 'feature':
        url = data.recommendation_id
          ? `/comic/${data.recommendation_id}`
          : '/browse'
        break
      case 'follow':
        url = data.follower_id
          ? `/profile/${data.follower_id}`
          : `${dashboardBase}/notifications`
        break
      case 'system':
      case 'achievement':
      default:
        url = `${notifBase}/notifications`
        break
    }

    // Send push
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/push/send`,
      {
        method:  'POST',
        headers: {
          'Content-type':  'application/json',
          'Authorization': `Bearer ${process.env.INTERNAL_API_SECRET ?? ''}`,
        },
        body: JSON.stringify({
          user_id: notif.user_id,
          title:   notif.title,
          body:    notif.content ?? '',
          url,
        }),
      }
    )

    const result = await res.json()
    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    console.error('Webhook error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
