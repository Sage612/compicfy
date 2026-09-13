// src/app/api/admin/tags/route.ts
//
// GET /api/admin/tags?filter=pending|approved|rejected — lists tags for
// admin/mod review, defaulting to pending (the actual approval queue).
// PATCH /api/admin/tags — approves or rejects a specific pending tag.
//
// Matches the requireRole(false) pattern already used by the existing
// admin recommendations route, rather than inventing a new permission
// check.

import { NextResponse } from 'next/server'
import { requireRole } from '@/lib/utils/requireRole'

export async function GET(request: Request) {
  try {
    const auth = await requireRole(false)
    if (auth.error) return auth.error

    const { supabase } = auth
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') ?? 'pending'
    const page   = parseInt(searchParams.get('page') ?? '1')
    const limit  = 50
    const offset = (page - 1) * limit

    let query = (supabase as any)
      .from('tags')
      .select('*, profiles!tags_suggested_by_fkey(username, display_name, avatar_url)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (filter === 'pending')       query = query.eq('status', 'pending')
    else if (filter === 'approved') query = query.eq('status', 'approved')
    else if (filter === 'rejected') query = query.eq('status', 'rejected')

    const { data, error: fetchError, count } = await query

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    return NextResponse.json({
      tags:    data,
      total:   count,
      hasMore: (count ?? 0) > offset + limit,
    })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// PATCH /api/admin/tags — body: { tag_id: string, action: 'approve' | 'reject' }
export async function PATCH(request: Request) {
  try {
    const auth = await requireRole(false)
    if (auth.error) return auth.error

    const { supabase, user } = auth as any
    const body = await request.json()
    const { tag_id, action } = body

    if (!tag_id || (action !== 'approve' && action !== 'reject')) {
      return NextResponse.json({ error: "tag_id and action ('approve' | 'reject') are required" }, { status: 400 })
    }

    const updates: Record<string, any> = {
      status: action === 'approve' ? 'approved' : 'rejected',
    }
    if (action === 'approve') {
      updates.approved_by = user?.id ?? null
      updates.approved_at = new Date().toISOString()
    }

    const { data, error } = await (supabase as any)
      .from('tags')
      .update(updates)
      .eq('id', tag_id)
      .eq('status', 'pending') // only actionable while still pending — no re-approving/re-rejecting
      .select()
      .single()

    if (error) {
      console.error('Failed to update tag:', error)
      return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Tag not found or already reviewed' }, { status: 404 })
    }

    return NextResponse.json({ tag: data })
  } catch (err) {
    console.error('Unexpected error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}