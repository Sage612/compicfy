import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { paystackRequest } from '@/lib/paystack/client'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const reference = searchParams.get('reference')

    if (!reference) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/pricing?error=missing_reference`
      )
    }

    // Verify with Paystack
    const data = await paystackRequest(`/transaction/verify/${reference}`)

    if (data.data.status !== 'success') {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/pricing?error=payment_failed`
      )
    }

    const metadata = data.data.metadata
    const userId = metadata.user_id
    const plan = metadata.plan

    if (!userId || !plan) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/pricing?error=invalid_metadata`
      )
    }

    // Activate Pro via Supabase function
    const supabase = await createClient()
    await (supabase as any).rpc('activate_pro', {
      p_user_id: userId,
      p_plan: plan,
      p_paystack_reference: reference,
      p_paystack_customer_code: data.data.customer?.customer_code ?? null,
    })

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?pro=activated`
    )
  } catch (error) {
    console.error('Paystack verify error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/pricing?error=verification_failed`
    )
  }
}