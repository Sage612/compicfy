import { NextResponse } from 'next/server'

// POST /api/webhooks/notification
// Called by Supabase Database Webhook when a row is inserted into notifications
// Set up in Supabase Dashboard:
//   Table: notifications
//   Event: INSERT
//   URL: https://compicfy.cloud/api/webhooks/notification
//   HTTP Headers: { "x-webhook-secret": "<your WEBHOOK_SECRET>" }

const NOTIFICATION_URLS: Record<string, (data: Record<string, any>) => string> = {
  vote:    (d) => d.recommendation_id ? `/comic/${d.recommendation_id}` : '/dashboard',
  review:  (d) => d.recommendation_id ? `/comic/${d.recommendation_id}` : '/dashboard',
  feature: (d) => d.recommendation_id ? `/comic/${d.recommendation_id}` : '/browse',
  follow:  (d) => d.follower_id       ? `/profile/${d.follower_id}`      : '/dashboard',
  system:  ()  => '/dashboard/notifications',
  achievement: () => '/dashboard/notifications',
}

export async function POST(req: Request) {
  try {
    // Verify webhook secret
    const secret = req.headers.get('x-webhook-secret')
    if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await req.json()

    // Supabase webhook sends { type: 'INSERT', record: {...}, ... }
    if (payload.type !== 'INSERT') {
      return NextResponse.json({ skipped: true })
    }

    const notif = payload.record
    if (!notif?.user_id || !notif?.title) {
      return NextResponse.json({ skipped: true })
    }

    // Build notification URL based on type and data
    const urlFn  = NOTIFICATION_URLS[notif.type] ?? (() => '/dashboard/notifications')
    const url    = urlFn(notif.data ?? {})

    // Call our push send endpoint
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