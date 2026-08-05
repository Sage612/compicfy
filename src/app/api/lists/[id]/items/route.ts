// src/app/api/lists/[id]/items/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { FREE_LIMITS } from '@/lib/utils/constants'

interface RouteContext {
  params: Promise<{ id: string }>
}

const VALID_STATUSES = ['reading', 'plan_to_read', 'marinating', 'completed', 'on_hold', 'dropped']
const MAX_NOTE_LENGTH = 500

async function verifyOwnership(supabase: Awaited<ReturnType<typeof createClient>>, listId: string, userId: string) {
  const { data, error } = await supabase
    .from('reading_lists')
    .select('id, user_id, is_public')
    .eq('id', listId)
    .single()
  if (error || !data) return { list: null, error: 'List not found' }
  return { list: data, error: null }
}

// Check if a list is locked for this user (free tier, beyond slot 3)
async function isListLocked(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listId: string,
  userId: string
): Promise<boolean> {
  // Get profile to check pro status
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('is_pro, pro_expires_at, role')
    .eq('id', userId)
    .single()

  if (!profile) return false

  // Admin, moderator, or active pro = never locked
  const isPro =
    profile.role === 'admin' ||
    ['admin', 'moderator'].includes(profile.role) ||
    (profile.is_pro &&
      (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))

  if (isPro) return false

  // Get all user lists ordered by creation date (oldest first = free slots)
  const { data: allLists } = await supabase
    .from('reading_lists')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (!allLists) return false

  // First N are free (per FREE_LIMITS.lists SSOT), rest are locked
  const freeListIds = new Set(allLists.slice(0, FREE_LIMITS.lists).map((l: any) => l.id))
  return !freeListIds.has(listId)
}

// GET /api/lists/[id]/items
export async function GET(_req: Request, { params }: RouteContext) {
  try {
    const { id: listId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { list, error: ownerErr } = await verifyOwnership(supabase, listId, user.id)
    if (!list) return NextResponse.json({ error: ownerErr }, { status: 404 })

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

// POST /api/lists/[id]/items — upsert item, blocked if list is locked
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

    // Block adds to locked lists for free users
    const locked = await isListLocked(supabase, listId, user.id)
    if (locked) {
      return NextResponse.json(
        {
          error: 'locked',
          message: 'This list is locked on the free plan. Upgrade to Pro to use all your lists.',
          upgrade_url: '/pricing',
        },
        { status: 403 }
      )
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

// PATCH /api/lists/[id]/items — update an existing item (status, progress_chapter, notes)
// Body: { recommendation_id: string, notes?: string | null, status?: string, progress_chapter?: number | null }
// At least one of notes/status/progress_chapter must be provided.
export async function PATCH(req: Request, { params }: RouteContext) {
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

    // Locked free-tier lists can still be edited for notes/status — only
    // NEW adds are blocked (see POST). A user shouldn't lose the ability
    // to annotate comics they already have just because they're over the
    // free list cap; that's punitive rather than a real upsell lever.

    const body = await req.json()
    const { recommendation_id, notes, status, progress_chapter } = body

    if (!recommendation_id) {
      return NextResponse.json({ error: 'recommendation_id is required' }, { status: 400 })
    }

    if (notes === undefined && status === undefined && progress_chapter === undefined) {
      return NextResponse.json(
        { error: 'At least one of notes, status, or progress_chapter is required' },
        { status: 400 }
      )
    }

    const updates: Record<string, any> = {}

    if (notes !== undefined) {
      if (notes !== null && typeof notes !== 'string') {
        return NextResponse.json({ error: 'notes must be a string or null' }, { status: 400 })
      }
      if (notes !== null && notes.length > MAX_NOTE_LENGTH) {
        return NextResponse.json(
          { error: `Notes must be ${MAX_NOTE_LENGTH} characters or fewer` },
          { status: 400 }
        )
      }
      // Empty string clears the note, same as null
      updates.notes = notes === '' ? null : notes
    }

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
          { status: 400 }
        )
      }
      updates.status = status
    }

    if (progress_chapter !== undefined) {
      if (progress_chapter !== null && (typeof progress_chapter !== 'number' || progress_chapter < 0)) {
        return NextResponse.json({ error: 'progress_chapter must be a non-negative number or null' }, { status: 400 })
      }
      updates.progress_chapter = progress_chapter
    }

    const { data, error } = await (supabase as any)
      .from('reading_list_items')
      .update(updates)
      .eq('list_id', listId)
      .eq('recommendation_id', recommendation_id)
      .select()
      .single()

    if (error) {
      console.error('Item PATCH error:', error)
      return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Item not found in this list' }, { status: 404 })
    }

    return NextResponse.json({ item: data })
  } catch {
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
}

// DELETE /api/lists/[id]/items?rec_id=<uuid>
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

    // Allow removes from locked lists — user should be able to clean up
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