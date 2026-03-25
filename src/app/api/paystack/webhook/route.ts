import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = req.headers.get('x-paystack-signature')

    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY!)
      .update(body)
      .digest('hex')

    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = JSON.parse(body)
    const supabase = await createClient()

    switch (event.event) {

      // Payment successful
      case 'charge.success': {
        const { metadata, reference, customer } = event.data
        const userId = metadata?.user_id
        const plan = metadata?.plan

        if (userId && plan) {
          await (supabase as any).rpc('activate_pro', {
            p_user_id: userId,
            p_plan: plan,
            p_paystack_reference: reference,
            p_paystack_customer_code: customer?.customer_code ?? null,
          })
        }
        break
      }

      // Subscription renewal
      case 'invoice.payment_failed':
      case 'subscription.disable': {
        const subscriptionCode = event.data.subscription_code

        if (subscriptionCode) {
          // Find subscription and mark as cancelled. Added explicit type casting here.
          const { data: sub } = (await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('paystack_subscription_code', subscriptionCode)
            .single()) as { data: { user_id: string } | null }

          if (sub) {
            // Update subscription status
            await (supabase as any)
              .from('subscriptions')
              .update({
                status: event.event === 'subscription.disable' ? 'cancelled' : 'failed',
                cancelled_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('paystack_subscription_code', subscriptionCode)

            // If subscription disabled, revoke Pro
            if (event.event === 'subscription.disable') {
              await (supabase as any)
                .from('profiles')
                .update({
                  is_pro: false,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', sub.user_id)

              // Notify user
              await (supabase as any)
                .from('notifications')
                .insert({
                  user_id: sub.user_id,
                  type: 'system',
                  title: 'Pro subscription cancelled',
                  content: 'Your Pro subscription has been cancelled. You can resubscribe anytime from the pricing page.',
                })
            }
          }
        }
        break
      }

      // Subscription renewed successfully
      case 'invoice.update': {
        const subscriptionCode = event.data.subscription_code

        if (subscriptionCode && event.data.paid) {
          // Added explicit type casting here to fix the 'plan' and 'user_id' never errors.
          const { data: sub } = (await supabase
            .from('subscriptions')
            .select('user_id, plan')
            .eq('paystack_subscription_code', subscriptionCode)
            .single()) as { data: { user_id: string, plan: string } | null }

          if (sub) {
            const newExpiry = sub.plan === 'monthly'
              ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
              : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()

            await (supabase as any)
              .from('profiles')
              .update({
                is_pro: true,
                pro_expires_at: newExpiry,
                updated_at: new Date().toISOString(),
              })
              .eq('id', sub.user_id)

            await (supabase as any)
              .from('subscriptions')
              .update({
                status: 'active',
                expires_at: newExpiry,
                next_payment_date: newExpiry,
                updated_at: new Date().toISOString(),
              })
              .eq('paystack_subscription_code', subscriptionCode)

            // Notify user
            await (supabase as any)
              .from('notifications')
              .insert({
                user_id: sub.user_id,
                type: 'system',
                title: '👑 Pro renewed!',
                content: 'Your Pro subscription has been renewed successfully.',
              })
          }
        }
        break
      }

      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}