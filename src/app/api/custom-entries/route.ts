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
  const { data: entry, error: entryError } = await (supabase as any)
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
    console.error('Failed to create custom entry:', entryError)
    return NextResponse.json({ error: 'Failed to create custom entry' }, { status: 500 })
  }

  const { data: item, error: itemError } = await (supabase as any)
    .from('reading_list_items')
    .insert({ list_id, custom_entry_id: entry.id, status: 'plan_to_read' })
    .select()
    .single()

  if (itemError) {
    console.error('Failed to add custom entry to list:', itemError)
    // Roll back the orphaned custom entry rather than leaving it dangling
    // with nothing pointing to it.
    await (supabase as any).from('custom_entries').delete().eq('id', entry.id)
    return NextResponse.json({ error: 'Failed to add entry to list' }, { status: 500 })
  }

  return NextResponse.json({ entry, item }, { status: 201 })
}