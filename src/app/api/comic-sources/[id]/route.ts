import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json()
  const { url, label, chapter_range } = body ?? {}

  const update: Record<string, string | null> = {}
  if (url !== undefined) {
    if (!url?.trim()) return NextResponse.json({ error: 'url cannot be empty' }, { status: 400 })
    try {
      // eslint-disable-next-line no-new
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'url must be a valid URL' }, { status: 400 })
    }
    update.url = url.trim()
  }
  if (label !== undefined) {
    if (!label?.trim()) return NextResponse.json({ error: 'label cannot be empty' }, { status: 400 })
    update.label = label.trim()
  }
  if (chapter_range !== undefined) {
    update.chapter_range = chapter_range?.trim() || null
  }

  // RLS also enforces user_id = auth.uid(), this check just gives a clean 404
  // instead of a silent zero-row update when someone else's id is passed.
  const { data: existing } = await supabase
    .from('user_comic_sources')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await (supabase as any)
    .from('user_comic_sources')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ source: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { error } = await supabase
    .from('user_comic_sources')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}