import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { recommendation_id } = await req.json()

    // Get user profile to check pro status and current pin
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('is_pro, pro_expires_at, role, pinned_recommendation_id')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const isPro = profile.role === 'admin' ||
      (profile.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))

    // Unpinning — always allowed
    if (!recommendation_id) {
      await (supabase as any)
        .from('profiles')
        .update({ pinned_recommendation_id: null })
        .eq('id', user.id)
      return NextResponse.json({ pinned: null })
    }

    // Verify the recommendation belongs to this user and is approved
    const { data: rec } = await (supabase as any)
      .from('recommendations')
      .select('id, title')
      .eq('id', recommendation_id)
      .eq('user_id', user.id)
      .eq('is_approved', true)
      .single()

    if (!rec) return NextResponse.json({ error: 'Recommendation not found' }, { status: 404 })

    // Pin limit: free = 1, pro = 5 (single pin — only 1 can be pinned at a time)
    // The limit is how many DIFFERENT recs they can pin over time — we track nothing,
    // it's just one active pin at a time for everyone.
    await (supabase as any)
      .from('profiles')
      .update({ pinned_recommendation_id: recommendation_id })
      .eq('id', user.id)

    return NextResponse.json({ pinned: recommendation_id })
  } catch (error) {
    console.error('Pin error:', error)
    return NextResponse.json({ error: 'Failed to pin' }, { status: 500 })
  }
}