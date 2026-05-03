import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body      = await req.text()
    const signature = req.headers.get('verif-hash')

    // Verify webhook signature using your FLW secret hash
    if (!signature || signature !== process.env.FLUTTERWAVE_WEBHOOK_HASH) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event    = JSON.parse(body)
    const supabase = await createClient()

    switch (event.event) {

      // Payment successful
      case 'charge.completed': {
        const { meta, tx_ref, status } = event.data

        if (status !== 'successful') break

        const userId = meta?.user_id
        const plan   = meta?.plan

        if (!userId || !plan) break

        // Guard: prevent double activation
        const { data: existing } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('flutterwave_reference', tx_ref)
          .maybeSingle()

        if (!existing) {
          await (supabase as any).rpc('activate_pro', {
            p_user_id:               userId,
            p_plan:                  plan,
            p_paystack_reference:    tx_ref,
            p_gateway:               'flutterwave',
            p_flutterwave_reference: tx_ref,
          })
        }
        break
      }

      // Subscription cancelled
     case 'subscription.cancelled': {
  const email = event.data.customer?.email
  if (!email) break

  const { data: { users } } = await (supabase as any).auth.admin.listUsers()
  const matchedUser = users?.find((u: any) => u.email === email)
  if (!matchedUser) break

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('id, expires_at')
    .eq('user_id', matchedUser.id)
    .eq('gateway', 'flutterwave')
    .eq('status', 'active')
    .maybeSingle() as { data: { id: string; expires_at: string } | null }

  if (!sub) break

  await (supabase as any)
    .from('subscriptions')
    .update({
      status:       'cancelled',
      cancelled_at: new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    })
    .eq('id', sub.id)

  await (supabase as any)
    .from('notifications')
    .insert({
      user_id: matchedUser.id,
      type:    'system',
      title:   'Subscription cancelled',
      content: `Your Pro access remains active until ${new Date(sub.expires_at).toLocaleDateString()}. After that you'll be moved to the free plan.`,
    })
  break
}

      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Flutterwave webhook error:', error)
    return NextResponse.json({ error: 'Webhook failed' }, { status: 500 })
  }
}