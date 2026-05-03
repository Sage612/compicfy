import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const APP_URL    = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://compicfy.cloud'
const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY!

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status    = searchParams.get('status')
    const txRef     = searchParams.get('tx_ref')
    const txId      = searchParams.get('transaction_id')

    if (status !== 'successful' || !txRef || !txId) {
      return NextResponse.redirect(`${APP_URL}/pricing?error=payment_failed`)
    }

    // Verify with Flutterwave
    const res = await fetch(`https://api.flutterwave.com/v3/transactions/${txId}/verify`, {
      headers: { 'Authorization': `Bearer ${FLW_SECRET}` },
    })
    const data = await res.json()

    if (
      data.status !== 'success' ||
      data.data.status !== 'successful' ||
      data.data.tx_ref !== txRef
    ) {
      return NextResponse.redirect(`${APP_URL}/pricing?error=verification_failed`)
    }

    const meta   = data.data.meta
    const userId = meta?.user_id
    const plan   = meta?.plan

    if (!userId || !plan) {
      return NextResponse.redirect(`${APP_URL}/pricing?error=invalid_metadata`)
    }

    const supabase = await createClient()

    // Guard: prevent double activation
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('flutterwave_reference', txRef)
      .maybeSingle()

    if (!existing) {
      await (supabase as any).rpc('activate_pro', {
        p_user_id:                   userId,
        p_plan:                      plan,
        p_paystack_reference:        txRef,         // reuse same column — it's just a reference string
        p_paystack_customer_code:    null,
      })
    }

    // Discord webhook
    if (process.env.DISCORD_PRO_WEBHOOK_URL) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, display_name')
        .eq('id', userId)
        .single() as { data: any }

      try {
        await fetch(process.env.DISCORD_PRO_WEBHOOK_URL, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title:       '👑 New Pro Subscriber! (Flutterwave)',
              description: `**${profile?.display_name || profile?.username || 'A user'}** just upgraded to Compicfy Pro (${plan} plan)! 🎉`,
              color:       0xF59E0B,
              timestamp:   new Date().toISOString(),
              footer:      { text: 'Compicfy Pro · Flutterwave' },
            }],
          }),
        })
      } catch (e) {
        console.error('Discord webhook failed:', e)
      }
    }

    return NextResponse.redirect(`${APP_URL}/pro/dashboard?welcome=true`)
  } catch (error) {
    console.error('Flutterwave verify error:', error)
    return NextResponse.redirect(`${APP_URL}/pricing?error=verification_failed`)
  }
}