import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { paystackRequest } from '@/lib/paystack/client'

// Define the interface for the subscription record
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

    // Get active subscription - Cast the result to the interface
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
      await paystackRequest(
        `/subscription/disable`,
        'POST',
        {
          code: subscription.paystack_subscription_code,
          token: subscription.paystack_customer_code,
        }
      )
    }

    // Update subscription in DB
    await (supabase as any)
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id)

    // Pro stays active until expiry date
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