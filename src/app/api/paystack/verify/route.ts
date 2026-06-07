import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { paystackRequest } from '@/lib/paystack/client'

interface ProfileResult {
  username: string
  display_name: string | null
  is_pro: boolean
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://compicfy.com'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const reference = searchParams.get('reference')

    if (!reference) {
      return NextResponse.redirect(`${APP_URL}/pricing?error=missing_reference`)
    }

    // Verify transaction with Paystack
    let data: any
    try {
      data = await paystackRequest(`/transaction/verify/${reference}`)
    } catch {
      return NextResponse.redirect(`${APP_URL}/pricing?error=verification_failed`)
    }

    if (data.data.status !== 'success') {
      return NextResponse.redirect(`${APP_URL}/pricing?error=payment_failed`)
    }

    const metadata = data.data.metadata
    const userId   = metadata?.user_id
    const plan     = metadata?.plan

    if (!userId || !plan) {
      return NextResponse.redirect(`${APP_URL}/pricing?error=invalid_metadata`)
    }

    const supabase = await createClient()

    // Guard: check if this reference was already processed to prevent double-activation
    const { data: existingSub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('paystack_reference', reference)
      .maybeSingle()

    if (!existingSub) {
      // Only activate if not already processed
      await (supabase as any).rpc('activate_pro', {
        p_user_id: userId,
        p_plan: plan,
        p_paystack_reference: reference,
        p_paystack_customer_code: data.data.customer?.customer_code ?? null,
      })
    }

    // Get profile for Discord notification
    const { data: profileData } = await supabase
      .from('profiles')
      .select('username, display_name, is_pro')
      .eq('id', userId)
      .single()

    const profile = profileData as ProfileResult | null

    // Fire Discord webhook
    if (process.env.DISCORD_PRO_WEBHOOK_URL) {
      try {
        const displayName = profile?.display_name || profile?.username || 'A user'
        await fetch(process.env.DISCORD_PRO_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title: '👑 New Pro Subscriber!',
              description: `**${displayName}** just upgraded to Compicfy Pro (${plan} plan)! 🎉`,
              color: 0xF59E0B,
              timestamp: new Date().toISOString(),
              footer: { text: 'Compicfy Pro' },
            }],
          }),
        })
      } catch (e) {
        console.error('Discord webhook failed:', e)
      }
    }

    return NextResponse.redirect(`${APP_URL}/pro/reader/dashboard?welcome=true`)
  } catch (error) {
    console.error('Paystack verify error:', error)
    return NextResponse.redirect(`${APP_URL}/pricing?error=verification_failed`)
  }
}