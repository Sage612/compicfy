import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  incrementDailyCount,
  incrementGlobalCount,
  checkGlobalDailyCap,
  enforceRecLimit,
  enforceDailyRecLimit,
} from '@/lib/utils/proEnforce'

// ── Local types — don't rely on Supabase inference for new columns ──────────
interface NudgeRec {
  id:            string
  title:         string
  why_recommend: string | null
}

interface DraftRec {
  id:             string
  title:          string
  cover_url:      string | null
  type:           string
  draft_saved_at: string | null
  created_at:     string
}

interface DraftMeta {
  id:      string
  user_id: string
  is_draft: boolean
}

export async function GET(request: Request) {
  try {
    const supabase         = await createClient()
    const { searchParams } = new URL(request.url)
    const type             = searchParams.get('type')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ drafts: [] })

    // ── Nudge mode ────────────────────────────────────────────────────────
    if (type === 'nudge') {
      const { data, error } = await (supabase as any)
        .from('recommendations')
        .select('id, title, why_recommend')
        .eq('user_id', user.id)
        .eq('is_draft', false)
        .eq('is_approved', false)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) return NextResponse.json({ drafts: [] })

      const nudges = ((data ?? []) as NudgeRec[])
        .filter(r => !r.why_recommend?.trim())
        .slice(0, 10)
        .map(r => ({ id: r.id, title: r.title }))

      return NextResponse.json({ drafts: nudges })
    }

    // ── Drafts mode ───────────────────────────────────────────────────────
    if (type === 'drafts') {
      const { data, error } = await (supabase as any)
        .from('recommendations')
        .select('id, title, cover_url, type, draft_saved_at, created_at')
        .eq('user_id', user.id)
        .eq('is_draft', true)
        .order('draft_saved_at', { ascending: false })
        .limit(20)

      if (error) return NextResponse.json({ drafts: [] })
      return NextResponse.json({ drafts: (data ?? []) as DraftRec[] })
    }

    // ── Default (backwards compat for IncompleteRecNudge) ───────────────────
    const { data, error } = await (supabase as any)
      .from('recommendations')
      .select('id, title, why_recommend')
      .eq('user_id', user.id)
      .eq('is_draft', false)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) return NextResponse.json({ drafts: [] })

    const drafts = ((data ?? []) as NudgeRec[])
      .filter(r => !r.why_recommend?.trim())
      .slice(0, 10)
      .map(r => ({ id: r.id, title: r.title }))

    return NextResponse.json({ drafts })
  } catch (err) {
    console.error('[drafts GET] unexpected:', err)
    return NextResponse.json({ drafts: [] })
  }
}

// ── PATCH — promote draft to real submission ─────────────────────────────
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { draft_id } = await request.json()
    if (!draft_id) return NextResponse.json({ error: 'draft_id required' }, { status: 400 })

    const { data: draftRaw } = await (supabase as any)
      .from('recommendations')
      .select('id, user_id, is_draft')
      .eq('id', draft_id)
      .eq('user_id', user.id)
      .single()

    const draft = draftRaw as DraftMeta | null

    if (!draft || !draft.is_draft) {
      return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
    }

    const { data: profileForLimit } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    const isAdminOrMod = ['admin', 'moderator'].includes((profileForLimit as any)?.role ?? '')

    const { allowed: monthlyOk, error: monthlyError } = await enforceRecLimit(user.id)
    if (!monthlyOk) return monthlyError!

    if (!isAdminOrMod) {
      const { allowed: dailyOk, error: dailyError } = await enforceDailyRecLimit(user.id)
      if (!dailyOk) return dailyError!
    }

    const { isPeakHour } = await checkGlobalDailyCap()
    if (isPeakHour) {
      return NextResponse.json(
        { peak_hour: true, message: 'System is still experiencing high traffic. Try again later.' },
        { status: 202 }
      )
    }

    const { data: rec, error } = await (supabase as any)
      .from('recommendations')
      .update({
        is_draft:       false,
        draft_saved_at: null,
        updated_at:     new Date().toISOString(),
      })
      .eq('id', draft_id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await Promise.all([
      incrementDailyCount(user.id),
      incrementGlobalCount(),
    ])

    return NextResponse.json({ recommendation: rec })
  } catch (err) {
    console.error('[drafts PATCH] unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── DELETE — discard a draft ─────────────────────────────────────────────
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { draft_id } = await request.json()
    if (!draft_id) return NextResponse.json({ error: 'draft_id required' }, { status: 400 })

    await (supabase as any)
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