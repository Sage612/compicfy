// src/app/api/lists/[id]/items/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

const VALID_STATUSES = ['reading', 'plan_to_read', 'marinating', 'completed', 'on_hold', 'dropped']

// Verify list ownership — shared guard used by all handlers
async function verifyOwnership(supabase: Awaited<ReturnType<typeof createClient>>, listId: string, userId: string) {
  const { data, error } = await supabase
    .from('reading_lists')
    .select('id, user_id, is_public')
    .eq('id', listId)
    .single()
  if (error || !data) return { list: null, error: 'List not found' }
  return { list: data, error: null }
}

// GET /api/lists/[id]/items — fetch all items in a list
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id: listId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { list, error: ownerErr } = await verifyOwnership(supabase, listId, user.id)
    if (!list) return NextResponse.json({ error: ownerErr }, { status: 404 })

    // Allow if owner OR list is public
    if ((list as any).user_id !== user.id && !(list as any).is_public) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('reading_list_items')
      .select(`
        id, status, progress_chapter, notes, added_at,
        recommendations (
          id, title, cover_url, type, status, genres, upvotes
        )
      `)
      .eq('list_id', listId)
      .order('added_at', { ascending: false })

    if (error) return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })

    return NextResponse.json({ items: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
  }
}

// POST /api/lists/[id]/items — upsert an item (add or update status)
// Body: { recommendation_id: string, status?: string }
export async function POST(req: Request, { params }: RouteContext) {
  try {
    const { id: listId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { list, error: ownerErr } = await verifyOwnership(supabase, listId, user.id)
    if (!list) return NextResponse.json({ error: ownerErr }, { status: 404 })
    if ((list as any).user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { recommendation_id, status = 'plan_to_read' } = body

    if (!recommendation_id) {
      return NextResponse.json({ error: 'recommendation_id is required' }, { status: 400 })
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    // Upsert — inserts on first add, updates status on subsequent calls
    const { data, error } = await (supabase as any)
      .from('reading_list_items')
      .upsert(
        { list_id: listId, recommendation_id, status },
        { onConflict: 'list_id,recommendation_id', ignoreDuplicates: false }
      )
      .select()
      .single()

    if (error) {
      console.error('Upsert error:', error)
      return NextResponse.json({ error: 'Failed to add to list' }, { status: 500 })
    }

    return NextResponse.json({ item: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to add to list' }, { status: 500 })
  }
}

// DELETE /api/lists/[id]/items?rec_id=<uuid> — remove item from list
export async function DELETE(req: Request, { params }: RouteContext) {
  try {
    const { id: listId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { list, error: ownerErr } = await verifyOwnership(supabase, listId, user.id)
    if (!list) return NextResponse.json({ error: ownerErr }, { status: 404 })
    if ((list as any).user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const recId = searchParams.get('rec_id')
    if (!recId) {
      return NextResponse.json({ error: 'rec_id query param is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('reading_list_items')
      .delete()
      .eq('list_id', listId)
      .eq('recommendation_id', recId)

    if (error) return NextResponse.json({ error: 'Failed to remove item' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to remove item' }, { status: 500 })
  }
}