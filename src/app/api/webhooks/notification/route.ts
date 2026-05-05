import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const secret = req.headers.get('x-webhook-secret')
    if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
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

    const supabase = await createClient()

    // Check subscriptions exist
    const { count } = await supabase
      .from('push_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', notif.user_id)

    if (!count || count === 0) {
      return NextResponse.json({ skipped: true, reason: 'no_subscriptions' })
    }

    // Fetch profile — need role/pro for routing + notification prefs
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('email_notifications, is_banned, is_suspended, role, is_pro, pro_expires_at')
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

    // Determine if user is pro — affects notification URLs
    const isPro =
      profile.role === 'admin' ||
      profile.role === 'moderator' ||
      (profile.is_pro && (
        !profile.pro_expires_at ||
        new Date(profile.pro_expires_at) > new Date()
      ))

    const notifBase     = isPro ? '/pro'       : '/dashboard'
    const dashboardBase = isPro ? '/pro'       : '/dashboard'

    // Build URL based on notification type and data
    const data = notif.data ?? {}
    let url = `${notifBase}/notifications`

    switch (notif.type) {
      case 'vote':
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
          'Content-Type':  'application/json',
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