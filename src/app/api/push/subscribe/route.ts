import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST — save FCM token
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { token } = await req.json()
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

    const { error } = await (supabase as any)
      .from('push_subscriptions')
      .upsert(
        {
          user_id:  user.id,
          endpoint: token,   // store FCM token in endpoint column
          p256dh:   'fcm',   // marker so we know it's FCM
          auth:     'fcm',
        },
        { onConflict: 'user_id,endpoint' }
      )

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE — remove FCM token
export async function DELETE(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { token } = await req.json()

    await (supabase as any)
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', token)

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}