import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { paystackRequest } from '@/lib/paystack/client'

interface SubscriptionRecord {
  id:                          string
  user_id:                     string
  status:                      string
  gateway:                     string
  paystack_subscription_code:  string | null
  paystack_customer_code:      string | null
  expires_at:                  string
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the most recent active subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single() as { data: SubscriptionRecord | null }

    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    // Route to correct cancel handler based on gateway
    if (subscription.gateway === 'flutterwave') {
      // Delegate to flutterwave cancel endpoint internally
      const flwRes  = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/flutterwave/cancel`, {
        method:  'POST',
        headers: { cookie: req.headers.get('cookie') ?? '' },
      })
      const flwData = await flwRes.json()
      return NextResponse.json(flwData, { status: flwRes.status })
    }

    // Paystack cancel flow
    if (subscription.paystack_subscription_code) {
      try {
        await paystackRequest('/subscription/disable', 'POST', {
          code:  subscription.paystack_subscription_code,
          token: subscription.paystack_customer_code,
        })
      } catch (err) {
        console.error('Paystack disable failed:', err)
      }
    }

    const now = new Date().toISOString()

    await (supabase as any)
      .from('subscriptions')
      .update({
        status:       'cancelled',
        cancelled_at: now,
        updated_at:   now,
      })
      .eq('id', subscription.id)

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
    console.error('Cancel subscription error:', error)
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 })
  }
}