// src/app/api/lists/[id]/reorder/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { id: listId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: list, error: listErr } = await supabase
      .from('reading_lists')
      .select('id, user_id')
      .eq('id', listId)
      .single()

    if (listErr || !list) return NextResponse.json({ error: 'List not found' }, { status: 404 })
    if ((list as any).user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { item_ids } = body

    if (!Array.isArray(item_ids) || item_ids.length === 0) {
      return NextResponse.json({ error: 'item_ids must be a non-empty array' }, { status: 400 })
    }

    // Verify every id actually belongs to this list before writing anything —
    // prevents a crafted request from reordering items in a list the caller
    // doesn't own, or referencing ids from a different list entirely.
    const { data: existingItems, error: fetchErr } = await supabase
      .from('reading_list_items')
      .select('id')
      .eq('list_id', listId)

    if (fetchErr) return NextResponse.json({ error: 'Failed to verify items' }, { status: 500 })

    const existingIds = new Set((existingItems ?? []).map((i: any) => i.id))
    const allBelong   = item_ids.every((id: string) => existingIds.has(id))

    if (!allBelong || item_ids.length !== existingIds.size) {
      return NextResponse.json(
        { error: 'item_ids must exactly match this list\'s current items' },
        { status: 400 }
      )
    }

    // Update positions in parallel — each item gets its array index as position
    const updates = item_ids.map((itemId: string, index: number) =>
      (supabase as any)
        .from('reading_list_items')
        .update({ position: index })
        .eq('id', itemId)
        .eq('list_id', listId)
    )

    const results = await Promise.all(updates)
    const failed  = results.find(r => r.error)

    if (failed) {
      console.error('Reorder error:', failed.error)
      return NextResponse.json({ error: 'Failed to save new order' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Reorder error:', err)
    return NextResponse.json({ error: 'Failed to reorder' }, { status: 500 })
  }
}