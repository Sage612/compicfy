import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { TRACKING_SUB_STATUS_CUSTOM_MAX_LENGTH } from '@/lib/utils/constants'

interface Params {
  params: Promise<{ comicId: string }>
}

function validateSubStatus(subStatus: unknown): string | null | undefined {
  if (subStatus === undefined) return undefined
  if (subStatus === null) return null
  if (typeof subStatus !== 'string') return undefined
  const trimmed = subStatus.trim()
  if (trimmed.length === 0) return null
  return trimmed.slice(0, TRACKING_SUB_STATUS_CUSTOM_MAX_LENGTH)
}

// GET /api/reading-progress/[comicId]
export async function GET(_req: Request, { params }: Params) {
  try {
    const { comicId } = await params
    const supabase    = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ progress: null })

    // ── FIX: filter by user's list IDs directly instead of
    //         relying on joined-table filter which PostgREST ignores ──
    const { data: userLists } = await supabase
      .from('reading_lists')
      .select('id')
      .eq('user_id', user.id)

    const listIds = (userLists ?? []).map((l: any) => l.id)
    if (listIds.length === 0) return NextResponse.json({ progress: null })

    const { data } = await supabase
      .from('reading_list_items')
      .select('id, list_id, status, sub_status, progress_chapter, notes, last_read_at, updated_at')
      .eq('recommendation_id', comicId)
      .in('list_id', listIds)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({ progress: data ?? null })
  } catch {
    return NextResponse.json({ progress: null }, { status: 500 })
  }
}

// PATCH /api/reading-progress/[comicId]
export async function PATCH(req: Request, { params }: Params) {
  try {
    const { comicId } = await params
    const supabase    = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { list_id, status, progress_chapter, sub_status } = body

    if (!list_id) return NextResponse.json({ error: 'list_id required' }, { status: 400 })

    // Verify user owns this list
    const { data: list } = await supabase
      .from('reading_lists')
      .select('id')
      .eq('id', list_id)
      .eq('user_id', user.id)
      .single()

    if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 })

    const validatedSubStatus = validateSubStatus(sub_status)

    // Build update payload — only include fields that were actually sent
    const updates: Record<string, any> = {}
    if (status           !== undefined) updates.status           = status
    if (progress_chapter !== undefined) updates.progress_chapter = progress_chapter
    if (validatedSubStatus !== undefined) updates.sub_status      = validatedSubStatus

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    // ── FIX: Check if row exists first ──────────────────────────────
    // The upsert was treating partial updates (chapter only, no status)
    // as inserts and failing because status has no default.
    // Use UPDATE if row exists, INSERT if it doesn't.
    const { data: existing } = await (supabase as any)
      .from('reading_list_items')
      .select('id')
      .eq('list_id', list_id)
      .eq('recommendation_id', comicId)
      .maybeSingle()

    let item: any
    let error: any

    if (existing) {
      // Row exists — UPDATE only the fields sent
      const { data, error: err } = await (supabase as any)
        .from('reading_list_items')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single()
      item  = data
      error = err
    } else {
      // Row doesn't exist — INSERT with safe defaults
      const { data, error: err } = await (supabase as any)
        .from('reading_list_items')
        .insert({
          list_id,
          recommendation_id: comicId,
          status:           status           ?? 'plan_to_read',
          progress_chapter: progress_chapter ?? null,
          sub_status:        validatedSubStatus ?? null,
        })
        .select()
        .single()
      item  = data
      error = err
    }

    if (error) throw error

    return NextResponse.json({ progress: item })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to update' }, { status: 500 })
  }
}

// POST /api/reading-progress/[comicId]
export async function POST(req: Request, { params }: Params) {
  try {
    const { comicId } = await params
    const supabase    = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { list_id, status = 'plan_to_read', progress_chapter = null, sub_status = null } = await req.json()

    if (!list_id) return NextResponse.json({ error: 'list_id required' }, { status: 400 })

    // Verify ownership
    const { data: list } = await supabase
      .from('reading_lists')
      .select('id')
      .eq('id', list_id)
      .eq('user_id', user.id)
      .single()

    if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 })

    const validatedSubStatus = validateSubStatus(sub_status) ?? null

    // ── FIX: same pattern — check exists then insert or update ──────
    const { data: existing } = await (supabase as any)
      .from('reading_list_items')
      .select('id')
      .eq('list_id', list_id)
      .eq('recommendation_id', comicId)
      .maybeSingle()

    let item: any
    let error: any

    if (existing) {
      // Already in list — update status/chapter
      const { data, error: err } = await (supabase as any)
        .from('reading_list_items')
        .update({ status, progress_chapter, sub_status: validatedSubStatus })
        .eq('id', existing.id)
        .select()
        .single()
      item  = data
      error = err
    } else {
      const { data, error: err } = await (supabase as any)
        .from('reading_list_items')
        .insert({ list_id, recommendation_id: comicId, status, progress_chapter, sub_status: validatedSubStatus })
        .select()
        .single()
      item  = data
      error = err
    }

    if (error) throw error

    return NextResponse.json({ progress: item })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to add' }, { status: 500 })
  }
}