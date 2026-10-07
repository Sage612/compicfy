// src/app/api/lists/[id]/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { TablesUpdate } from '@/types/database.types'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/lists/[id] — fetch a single list with its items
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: list, error } = await supabase
      .from('reading_lists')
      .select(`
        *,
        reading_list_items (
          id, status, progress_chapter, notes, added_at, position,
          recommendation_id, custom_entry_id,
          recommendations (
            id, title, cover_url, type, status, genres, upvotes
          ),
          custom_entries (
            id, title, cover_url, notes
          )
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }

    return NextResponse.json({ list })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch list' }, { status: 500 })
  }
}

// PATCH /api/lists/[id] — update list name, description, or is_public
export async function PATCH(req: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { name, description, is_public } = body

    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    }

    const updates: TablesUpdate<'reading_lists'> = {}
    if (name !== undefined) updates.name = name.trim()
    if (description !== undefined) {
      if (description !== null && typeof description !== 'string') {
        return NextResponse.json({ error: 'Description must be a string or null' }, { status: 400 })
      }
      updates.description = description
    }
    if (is_public !== undefined) {
      if (is_public !== null && typeof is_public !== 'boolean') {
        return NextResponse.json({ error: 'is_public must be a boolean or null' }, { status: 400 })
      }
      updates.is_public = is_public
    }

    const { data, error } = await supabase
      .from('reading_lists')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'List not found or update failed' }, { status: 404 })
    }

    return NextResponse.json({ list: data })
  } catch {
    return NextResponse.json({ error: 'Failed to update list' }, { status: 500 })
  }
}

// DELETE /api/lists/[id] — delete an entire list
export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error } = await supabase
      .from('reading_lists')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete list' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete list' }, { status: 500 })
  }
}