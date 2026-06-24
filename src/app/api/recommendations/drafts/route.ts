import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { incrementDailyCount, incrementGlobalCount, checkGlobalDailyCap } from '@/lib/utils/proEnforce'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ drafts: [] })

    const { data, error } = await supabase
      .from('recommendations')
      .select('id, title, cover_url, type, draft_saved_at, created_at')
      .eq('user_id', user.id)
      .eq('is_draft', true)
      .order('draft_saved_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('[drafts GET]', error)
      return NextResponse.json({ drafts: [] })
    }

    return NextResponse.json({ drafts: data ?? [] })
  } catch (err) {
    console.error('[drafts GET] unexpected:', err)
    return NextResponse.json({ drafts: [] })
  }
}

// Submit a draft for real
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { draft_id } = await request.json()
    if (!draft_id) return NextResponse.json({ error: 'draft_id required' }, { status: 400 })

    // Verify ownership
    const { data: draft } = await (supabase as any)
      .from('recommendations')
      .select('id, user_id, is_draft')
      .eq('id', draft_id)
      .eq('user_id', user.id)
      .single()

    if (!draft || !draft.is_draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    // Check peak hour before submitting
    const { isPeakHour } = await checkGlobalDailyCap()
    if (isPeakHour) {
      return NextResponse.json(
        {
          peak_hour: true,
          message:   'System is still experiencing high traffic. Please try again later.',
        },
        { status: 202 }
      )
    }

    // Promote draft to real submission
    const { data: rec, error } = await (supabase as any)
      .from('recommendations')
      .update({
        is_draft:       false,
        draft_saved_at: null,
        updated_at:     new Date().toISOString(),
      } as any)
      .eq('id', draft_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await Promise.all([
      incrementDailyCount(user.id),
      incrementGlobalCount(),
    ])

    return NextResponse.json({ recommendation: rec }, { status: 200 })
  } catch (err) {
    console.error('[drafts PATCH] unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete a draft
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { draft_id } = await request.json()
    if (!draft_id) return NextResponse.json({ error: 'draft_id required' }, { status: 400 })

    await supabase
      .from('recommendations')
      .delete()
      .eq('id', draft_id)
      .eq('user_id', user.id)
      .eq('is_draft', true)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[drafts DELETE] unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}