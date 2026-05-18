import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST — add a recommendation to a collection
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify ownership
    const { data: collection } = await (supabase as any)
      .from('collections')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!collection) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (collection.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { recommendation_id, note } = await request.json()
    if (!recommendation_id) return NextResponse.json({ error: 'recommendation_id required' }, { status: 400 })

    // Get current max position
    const { data: items } = await (supabase as any)
      .from('collection_items')
      .select('position')
      .eq('collection_id', id)
      .order('position', { ascending: false })
      .limit(1)

    const nextPosition = ((items?.[0]?.position ?? -1) as number) + 1

    const { data, error } = await (supabase as any)
      .from('collection_items')
      .insert({
        collection_id:     id,
        recommendation_id,
        position:          nextPosition,
        note:              note || null,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Already in collection' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ item: data }, { status: 201 })
  } catch (err) {
    console.error('Collection items POST error:', err)
    return NextResponse.json({ error: 'Failed to add' }, { status: 500 })
  }
}

// DELETE — remove a recommendation from a collection
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { recommendation_id } = await request.json()

    // Verify ownership via collection
    const { data: collection } = await (supabase as any)
      .from('collections')
      .select('user_id')
      .eq('id', id)
      .single()

    if (!collection) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (collection.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    await (supabase as any)
      .from('collection_items')
      .delete()
      .eq('collection_id', id)
      .eq('recommendation_id', recommendation_id)

    return NextResponse.json({ deleted: true })
  } catch (err) {
    console.error('Collection items DELETE error:', err)
    return NextResponse.json({ error: 'Failed to remove' }, { status: 500 })
  }
}