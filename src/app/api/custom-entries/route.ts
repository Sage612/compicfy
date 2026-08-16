import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const MAX_TITLE_LENGTH = 300
const MAX_NOTES_LENGTH = 500

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { list_id, title, cover_url, notes, source } = body

  if (!list_id || typeof list_id !== 'string') {
    return NextResponse.json({ error: 'list_id is required' }, { status: 400 })
  }
  if (!title || typeof title !== 'string' || !title.trim()) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 })
  }
  if (title.trim().length > MAX_TITLE_LENGTH) {
    return NextResponse.json({ error: `title must be ${MAX_TITLE_LENGTH} characters or fewer` }, { status: 400 })
  }
  if (notes !== undefined && notes !== null && String(notes).length > MAX_NOTES_LENGTH) {
    return NextResponse.json({ error: `notes must be ${MAX_NOTES_LENGTH} characters or fewer` }, { status: 400 })
  }

  // Verify the list belongs to this user before doing anything else.
  const { data: list, error: listError } = await supabase
    .from('reading_lists')
    .select('id, user_id')
    .eq('id', list_id)
    .single()

  if (listError || !list || (list as any).user_id !== user.id) {
    return NextResponse.json({ error: 'List not found' }, { status: 404 })
  }

  // Create the custom entry.
  const { data: entry, error: entryError } = await supabase
    .from('custom_entries')
    .insert({
      user_id: user.id,
      title: title.trim(),
      cover_url: cover_url || null,
      notes: notes ? String(notes).trim() : null,
      source: source === 'import' ? 'import' : 'manual',
    })
    .select()
    .single()

  if (entryError || !entry) {
    return NextResponse.json({ error: 'Failed to create custom entry' }, { status: 500 })
  }

  // Add it to the list. Uses the partial unique index
  // (list_id, custom_entry_id) added in migration 14 — upsert here mirrors
  // the existing recommendation_id upsert pattern in
  // /api/lists/[id]/items/route.ts.
  const { data: item, error: itemError } = await supabase
    .from('reading_list_items')
    .upsert(
      { list_id, custom_entry_id: entry.id, status: 'plan_to_read' },
      { onConflict: 'list_id,custom_entry_id', ignoreDuplicates: false }
    )
    .select()
    .single()

  if (itemError) {
    await supabase.from('custom_entries').delete().eq('id', entry.id)
    return NextResponse.json({ error: 'Failed to add entry to list' }, { status: 500 })
  }

  return NextResponse.json({ entry, item }, { status: 201 })
}