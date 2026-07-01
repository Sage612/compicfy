import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://compicfy.com'
const FLW_SECRET = process.env.FLUTTERWAVE_SECRET_KEY!

const PLANS = {
  monthly: { amount: 4.99,  label: 'Monthly Pro' },
  yearly:  { amount: 29.99, label: 'Yearly Pro'  },
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { plan } = await req.json()
    if (!plan || !['monthly', 'yearly'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('username, display_name, role')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    if (profile.role === 'admin') return NextResponse.json({ error: 'Admins have free Pro access' }, { status: 400 })

    const selectedPlan = PLANS[plan as keyof typeof PLANS]
    const txRef        = `ComPicfy-${user.id}-${Date.now()}`

    const payload = {
      tx_ref:       txRef,
      amount:       selectedPlan.amount,
      currency:     'USD',
      redirect_url: `${APP_URL}/api/flutterwave/verify`,
      customer: {
        email:      user.email,
        name:       profile.display_name || profile.username || 'User',
      },
      meta: {
        user_id:  user.id,
        plan,
        username: profile.username,
      },
      customizations: {
        title:       'ComPicfy Pro',
        description: selectedPlan.label,
        logo:        `${APP_URL}/images/logo.svg`,
      },
    }

    const res = await fetch('https://api.flutterwave.com/v3/payments', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${FLW_SECRET}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (data.status !== 'success') throw new Error(data.message ?? 'Flutterwave error')

    return NextResponse.json({ authorization_url: data.data.link })
  } catch (error) {
    console.error('Flutterwave initialize error:', error)
    return NextResponse.json({ error: 'Failed to initialize payment' }, { status: 500 })
  }
}