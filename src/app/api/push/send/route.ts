import { createClient } from '@/lib/supabase/server'
import { NextResponse }  from 'next/server'
import webpush          from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT      ?? 'mailto:support@compicfy.cloud',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
  process.env.VAPID_PRIVATE_KEY  ?? ''
)

// POST /api/push/send
// Called internally when a notification is created
// Body: { user_id, title, body, url?, icon? }
export async function POST(req: Request) {
  try {
    // Verify internal call via shared secret
    const authHeader = req.headers.get('authorization')
    const secret     = process.env.INTERNAL_API_SECRET
    if (secret && authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const { user_id, title, body, url, icon } = await req.json()

    if (!user_id || !title) {
      return NextResponse.json({ error: 'user_id and title required' }, { status: 400 })
    }

    // Get all push subscriptions for this user
    // AFTER
const { data: subs } = await supabase
  .from('push_subscriptions')
  .select('endpoint, p256dh, auth')
  .eq('user_id', user_id)
  .returns<{ endpoint: string; p256dh: string; auth: string }[]>()

    if (!subs || subs.length === 0) {
      return NextResponse.json({ sent: 0 })
    }

    const payload = JSON.stringify({
      title,
      body:    body  ?? '',
      icon:    icon  ?? '/icons/icon-192.png',
      badge:   '/icons/badge-72.png',
      data:    { url: url ?? '/' },
      tag:     `compicfy-${Date.now()}`,
    })

    // Send to all subscriptions, collect failures
    const results = await Promise.allSettled(
      subs.map(sub =>
        webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys:     { p256dh: sub.p256dh, auth: sub.auth },
          },
          payload
        )
      )
    )

    // Remove expired/invalid subscriptions
    const expired: string[] = []
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        const err = result.reason as any
        // 410 = subscription expired/unsubscribed, 404 = not found
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          expired.push(subs[i].endpoint)
        }
      }
    })

    if (expired.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expired)
    }

    const sent = results.filter(r => r.status === 'fulfilled').length
    return NextResponse.json({ sent, expired: expired.length })
  } catch (err: any) {
    console.error('Push send error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}