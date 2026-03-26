import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { enforceSaveLimit } from '@/lib/utils/proEnforce'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { recommendation_id } = await request.json()
    if (!recommendation_id) {
      return NextResponse.json({ error: 'recommendation_id required' }, { status: 400 })
    }

    // ── Enforce 50 save limit for free users ──
    const { allowed, error: limitError } = await enforceSaveLimit(user.id)
    if (!allowed) return limitError!

    // Check if already saved
    const { data: existing } = await supabase 
      .from('saves')
      .select('id')
      .eq('user_id', user.id)
      .eq('recommendation_id', recommendation_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Already saved' }, { status: 409 })
    }

    const { error } = await (supabase as any)
      .from('saves')
      .insert({ user_id: user.id, recommendation_id })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Increment total_saves on profile
    await (supabase as any)
      .from('profiles')
      .update({ total_saves: (supabase as any).rpc('total_saves', {}) })
      .eq('id', user.id)

    return NextResponse.json({ saved: true })
  } catch (error) {
    console.error('Save error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { recommendation_id } = await request.json()
    if (!recommendation_id) {
      return NextResponse.json({ error: 'recommendation_id required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('saves')
      .delete()
      .eq('user_id', user.id)
      .eq('recommendation_id', recommendation_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ saved: false })
  } catch (error) {
    console.error('Unsave error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}