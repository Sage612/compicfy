import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { paystackRequest } from '@/lib/paystack/client'

interface SubscriptionRecord {
  id: string
  user_id: string
  status: string
  paystack_subscription_code: string | null
  paystack_customer_code: string | null
  expires_at: string
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get active subscription
    const { data: subscription } = (await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()) as { data: SubscriptionRecord | null }

    if (!subscription) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
    }

    // Cancel on Paystack if subscription code exists
    if (subscription.paystack_subscription_code) {
      try {
        await paystackRequest(
          `/subscription/disable`,
          'POST',
          {
            code: subscription.paystack_subscription_code,
            token: subscription.paystack_customer_code,
          }
        )
      } catch (paystackErr) {
        // Log but don't block — we still cancel locally
        console.error('Paystack disable failed:', paystackErr)
      }
    }

    const now = new Date().toISOString()

    // Mark subscription as cancelled in DB
    await (supabase as any)
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: now,
        updated_at: now,
      })
      .eq('id', subscription.id)

    // Keep is_pro = true but ensure pro_expires_at is set to the subscription
    // expiry so expire_pro_subscriptions cron can clean it up correctly.
    // Do NOT set is_pro = false here — user keeps access until the period ends.
    await (supabase as any)
      .from('profiles')
      .update({
        // Only set expiry if it isn't already set (charge.success sets it)
        pro_expires_at: subscription.expires_at,
        updated_at: now,
      })
      .eq('id', user.id)
      .is('pro_expires_at', null)

    // Notify user
    await (supabase as any)
      .from('notifications')
      .insert({
        user_id: user.id,
        type: 'system',
        title: 'Subscription cancelled',
        content: `Your Pro access remains active until ${new Date(subscription.expires_at).toLocaleDateString()}. After that you'll be moved to the free plan.`,
      })

    return NextResponse.json({ success: true, expires_at: subscription.expires_at })
  } catch (error) {
    console.error('Cancel subscription error:', error)
    return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 })
  }
}