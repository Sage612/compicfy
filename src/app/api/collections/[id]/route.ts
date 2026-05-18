import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data, error } = await (supabase as any)
      .from('collections')
      .select(`
        *,
        profiles!collections_user_id_fkey(username, display_name, avatar_url, is_pro, role, verified_recommender),
        collection_items(
          id, position, note, added_at,
          recommendations(id, title, cover_url, type, status, genres, upvotes, save_count, description)
        )
      `)
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Check visibility
    const { data: { user } } = await supabase.auth.getUser()
    if (!data.is_published && data.user_id !== user?.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Increment view count (non-owner)
    if (user?.id !== data.user_id) {
      await (supabase as any)
        .from('collections')
        .update({ view_count: (data.view_count ?? 0) + 1 })
        .eq('id', id)
    }

    // Check if viewer has saved this
    let isSaved = false
    if (user) {
      const { data: save } = await (supabase as any)
        .from('collection_saves')
        .select('id')
        .eq('user_id', user.id)
        .eq('collection_id', id)
        .maybeSingle()
      isSaved = !!save
    }

    // Sort items by position
    const sortedItems = (data.collection_items ?? [])
      .sort((a: any, b: any) => a.position - b.position)

    return NextResponse.json({
      collection: { ...data, collection_items: sortedItems },
      isSaved,
      isOwner: user?.id === data.user_id,
    })
  } catch (err) {
    console.error('Collection GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: existing } = await (supabase as any)
      .from('collections')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const allowed = ['title', 'description', 'cover_url', 'theme_color', 'is_published']
    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    for (const key of allowed) {
      if (key in body) updates[key] = body[key]
    }

    const { data, error } = await (supabase as any)
      .from('collections')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ collection: data })
  } catch (err) {
    console.error('Collection PATCH error:', err)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: existing } = await (supabase as any)
      .from('collections')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (existing.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await (supabase as any).from('collections').delete().eq('id', id)
    return NextResponse.json({ deleted: true })
  } catch (err) {
    console.error('Collection DELETE error:', err)
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 })
  }
}