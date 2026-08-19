import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

const MAX_TITLE_LENGTH = 300
const MAX_NOTES_LENGTH = 500

export async function PATCH(req: Request, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing, error: fetchError } = await supabase
    .from('custom_entries')
    .select('id, user_id')
    .eq('id', id)
    .single()

  if (fetchError || !existing || (existing as any).user_id !== user.id) {
    return NextResponse.json({ error: 'Custom entry not found' }, { status: 404 })
  }

  const body = await req.json()
  const { title, cover_url, notes } = body

  if (title === undefined && cover_url === undefined && notes === undefined) {
    return NextResponse.json(
      { error: 'At least one of title, cover_url, or notes is required' },
      { status: 400 }
    )
  }

  const updates: Record<string, any> = {}

  if (title !== undefined) {
    if (typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'title cannot be empty' }, { status: 400 })
    }
    if (title.trim().length > MAX_TITLE_LENGTH) {
      return NextResponse.json({ error: `title must be ${MAX_TITLE_LENGTH} characters or fewer` }, { status: 400 })
    }
    updates.title = title.trim()
  }

  if (cover_url !== undefined) {
    if (cover_url !== null && typeof cover_url !== 'string') {
      return NextResponse.json({ error: 'cover_url must be a string or null' }, { status: 400 })
    }
    if (cover_url && !/^https?:\/\//.test(cover_url)) {
      return NextResponse.json({ error: 'cover_url must be a valid http(s) URL' }, { status: 400 })
    }
    updates.cover_url = cover_url || null
  }

  if (notes !== undefined) {
    if (notes !== null && typeof notes !== 'string') {
      return NextResponse.json({ error: 'notes must be a string or null' }, { status: 400 })
    }
    if (notes !== null && notes.length > MAX_NOTES_LENGTH) {
      return NextResponse.json({ error: `notes must be ${MAX_NOTES_LENGTH} characters or fewer` }, { status: 400 })
    }
    updates.notes = notes === '' ? null : notes
  }

  const { data: updated, error: updateError } = await (supabase as any)
    .from('custom_entries')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    console.error('Failed to update custom entry:', updateError)
    return NextResponse.json({ error: 'Failed to update custom entry' }, { status: 500 })
  }

  return NextResponse.json({ entry: updated })
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: existing, error: fetchError } = await supabase
    .from('custom_entries')
    .select('id, user_id')
    .eq('id', id)
    .single()

  if (fetchError || !existing || (existing as any).user_id !== user.id) {
    return NextResponse.json({ error: 'Custom entry not found' }, { status: 404 })
  }

  const { error: deleteError } = await supabase
    .from('custom_entries')
    .delete()
    .eq('id', id)

  if (deleteError) {
    console.error('Failed to delete custom entry:', deleteError)
    return NextResponse.json({ error: 'Failed to delete custom entry' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}