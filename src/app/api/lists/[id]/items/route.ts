// src/app/api/lists/[id]/items/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { FREE_LIMITS, TRACKING_STATUSES, TRACKING_SUB_STATUS_CUSTOM_MAX_LENGTH } from '@/lib/utils/constants'

interface RouteContext {
  params: Promise<{ id: string }>
}

const VALID_STATUSES = TRACKING_STATUSES.map(s => s.value)
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
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('is_pro, pro_expires_at, role')
    .eq('id', userId)
    .single()

  if (!profile) return false

  const isPro =
    profile.role === 'admin' ||
    ['admin', 'moderator'].includes(profile.role) ||
    (profile.is_pro &&
      (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))

  if (isPro) return false

  const { data: allLists } = await supabase
    .from('reading_lists')
    .select('id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (!allLists) return false

  const freeListIds = new Set(allLists.slice(0, FREE_LIMITS.lists).map((l: any) => l.id))
  return !freeListIds.has(listId)
}

function getTargetIdFromBody(body: any): { column: 'recommendation_id' | 'custom_entry_id'; value: string } | null {
  const { recommendation_id, custom_entry_id } = body
  if (recommendation_id && custom_entry_id) return null // ambiguous — reject
  if (recommendation_id) return { column: 'recommendation_id', value: recommendation_id }
  if (custom_entry_id) return { column: 'custom_entry_id', value: custom_entry_id }
  return null
}

// Shared guard — sub_status is either null, a preset key, or free custom
// text capped at TRACKING_SUB_STATUS_CUSTOM_MAX_LENGTH (also enforced by a
// DB CHECK constraint as a backstop). Returns undefined if the field wasn't
// sent at all, so callers can tell "not provided" apart from "clear it".
function validateSubStatus(subStatus: unknown): string | null | undefined {
  if (subStatus === undefined) return undefined
  if (subStatus === null) return null
  if (typeof subStatus !== 'string') return undefined
  const trimmed = subStatus.trim()
  if (trimmed.length === 0) return null
  return trimmed.slice(0, TRACKING_SUB_STATUS_CUSTOM_MAX_LENGTH)
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
        id, status, sub_status, progress_chapter, notes, added_at, position,
        recommendation_id, custom_entry_id,
        recommendations (
          id, title, cover_url, type, status, genres, upvotes, chapter_count
        ),
        custom_entries (
          id, title, cover_url, notes
        )
      `)
      .eq('list_id', listId)
      .order('position', { ascending: true })

    if (error) return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })

    return NextResponse.json({ items: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
  }
}

// POST /api/lists/[id]/items — upsert item, blocked if list is locked
// (Still recommendation_id-only for adds via search — custom entries are
// created via /api/custom-entries, which handles its own list-insert.)
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
    const { recommendation_id, status = 'plan_to_read', sub_status } = body

    if (!recommendation_id) {
      return NextResponse.json({ error: 'recommendation_id is required' }, { status: 400 })
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      )
    }

    const validatedSubStatus = validateSubStatus(sub_status) ?? null

    const { data, error } = await (supabase as any)
      .from('reading_list_items')
      .upsert(
        { list_id: listId, recommendation_id, status, sub_status: validatedSubStatus },
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

// PATCH /api/lists/[id]/items — update an existing item (status, sub_status, progress_chapter, notes)
// Body: { recommendation_id?: string, custom_entry_id?: string, notes?: string | null, status?: string, sub_status?: string | null, progress_chapter?: number | null }
// Exactly one of recommendation_id/custom_entry_id must be provided, plus at least one of notes/status/sub_status/progress_chapter.
//
// NOTE: changing `status` without explicitly sending `sub_status` leaves
// any existing sub_status untouched (e.g. a stale "waiting for new
// chapters" on_hold reason would carry over onto a completed item). Callers
// that care about this — see ReadingListDetail's quick status-switcher —
// should explicitly pass `sub_status: null` alongside a status change,
// matching the behavior already used by ChapterUpdater/ReadingProgressButton.
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

    const body = await req.json()
    const { notes, status, progress_chapter, sub_status } = body

    const target = getTargetIdFromBody(body)
    if (!target) {
      return NextResponse.json(
        { error: 'Exactly one of recommendation_id or custom_entry_id is required' },
        { status: 400 }
      )
    }

    if (notes === undefined && status === undefined && progress_chapter === undefined && sub_status === undefined) {
      return NextResponse.json(
        { error: 'At least one of notes, status, sub_status, or progress_chapter is required' },
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

    if (sub_status !== undefined) {
      const validated = validateSubStatus(sub_status)
      // validateSubStatus only returns undefined for a wrong type — a real
      // validation failure, not "field omitted" (sub_status !== undefined
      // was already checked above), so surface it as a 400.
      if (validated === undefined) {
        return NextResponse.json({ error: 'sub_status must be a string or null' }, { status: 400 })
      }
      updates.sub_status = validated
    }

    if (progress_chapter !== undefined) {
      if (target.column === 'custom_entry_id') {
        return NextResponse.json(
          { error: 'progress_chapter cannot be set on a custom entry' },
          { status: 400 }
        )
      }
      if (progress_chapter !== null && (typeof progress_chapter !== 'number' || progress_chapter < 0)) {
        return NextResponse.json({ error: 'progress_chapter must be a non-negative number or null' }, { status: 400 })
      }
      updates.progress_chapter = progress_chapter
    }

    const { data, error } = await supabase
      .from('reading_list_items')
      .update(updates)
      .eq('list_id', listId)
      .eq(target.column, target.value)
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

// DELETE /api/lists/[id]/items?rec_id=<uuid>  OR  ?custom_entry_id=<uuid>
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
    const recId          = searchParams.get('rec_id')
    const customEntryId  = searchParams.get('custom_entry_id')

    if (!recId && !customEntryId) {
      return NextResponse.json({ error: 'rec_id or custom_entry_id query param is required' }, { status: 400 })
    }
    if (recId && customEntryId) {
      return NextResponse.json({ error: 'Provide only one of rec_id or custom_entry_id' }, { status: 400 })
    }

    const query = supabase
      .from('reading_list_items')
      .delete()
      .eq('list_id', listId)

    const { error } = recId
      ? await query.eq('recommendation_id', recId)
      : await query.eq('custom_entry_id', customEntryId!)

    if (error) return NextResponse.json({ error: 'Failed to remove item' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to remove item' }, { status: 500 })
  }
}