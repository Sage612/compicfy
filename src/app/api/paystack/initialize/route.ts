import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { paystackRequest, PAYSTACK_PLANS } from '@/lib/paystack/client'

// Hardcoded fallback in case env var is missing
const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://compicfy.com'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { plan } = await req.json()

    if (!plan || !['monthly', 'yearly'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('username, display_name, is_pro, pro_expires_at, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.role === 'admin') {
      return NextResponse.json({ error: 'Admins have free Pro access' }, { status: 400 })
    }

    const selectedPlan = PAYSTACK_PLANS[plan as keyof typeof PAYSTACK_PLANS]

    // Always use the hardcoded APP_URL as primary, env var as override
    const callbackUrl = `${APP_URL}/api/paystack/verify`

    console.log('Paystack callback URL:', callbackUrl)
    console.log('Paystack plan:', plan, 'amount:', selectedPlan.amount)

    const data = await paystackRequest('/transaction/initialize', 'POST', {
      email: user.email,
      // amount is already in smallest currency unit (kobo for NGN, cents for USD)
      // DO NOT multiply by 100 again
      amount: selectedPlan.amount,
      currency: 'USD',
      callback_url: callbackUrl,
      metadata: {
        user_id: user.id,
        plan,
        username: profile.username,
        custom_fields: [
          {
            display_name: 'Plan',
            variable_name: 'plan',
            value: selectedPlan.label,
          },
        ],
      },
      channels: ['card'],
    })

    return NextResponse.json({
      authorization_url: data.data.authorization_url,
      access_code: data.data.access_code,
      reference: data.data.reference,
    })
  } catch (error) {
    console.error('Paystack initialize error:', error)
    return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 500 })
  }
}