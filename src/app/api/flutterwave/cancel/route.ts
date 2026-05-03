import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface SubscriptionRecord {
  id:                      string
  user_id:                 string
  status:                  string
  gateway:                 string
  flutterwave_reference:   string | null
  expires_at:              string
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get active Flutterwave subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .eq('gateway', 'flutterwave')
      .single() as { data: SubscriptionRecord | null }

    if (!subscription) {
      return NextResponse.json({ error: 'No active Flutterwave subscription found' }, { status: 404 })
    }

    // Flutterwave doesn't have a server-side cancel API for one-time payments.
    // For recurring plans you would call their subscription cancel endpoint here.
    // For now we cancel locally — the webhook handles the rest.
    const now = new Date().toISOString()

    await (supabase as any)
      .from('subscriptions')
      .update({
        status:       'cancelled',
        cancelled_at: now,
        updated_at:   now,
      })
      .eq('id', subscription.id)

    // Keep is_pro = true until expiry
    await (supabase as any)
      .from('profiles')
      .update({
        pro_expires_at: subscription.expires_at,
        updated_at:     now,
      })
      .eq('id', user.id)
      .is('pro_expires_at', null)

    await (supabase as any)
      .from('notifications')
      .insert({
        user_id: user.id,
        type:    'system',
        title:   'Subscription cancelled',
        content: `Your Pro access remains active until ${new Date(subscription.expires_at).toLocaleDateString()}. After that you'll be moved to the free plan.`,
      })

    return NextResponse.json({ success: true, expires_at: subscription.expires_at })
  } catch (error) {
    console.error('Flutterwave cancel error:', error)
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 })
  }
}