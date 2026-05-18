import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// POST — save a collection
// DELETE — unsave a collection
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await (supabase as any)
      .from('collection_saves')
      .insert({ user_id: user.id, collection_id: id })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Already saved' }, { status: 409 })
      throw error
    }

    // Increment save_count
    await (supabase as any)
      .from('collections')
      .update({ save_count: (supabase as any).rpc('increment', { row_id: id }) })
      .eq('id', id)

    return NextResponse.json({ saved: true }, { status: 201 })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
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

    await (supabase as any)
      .from('collection_saves')
      .delete()
      .eq('user_id', user.id)
      .eq('collection_id', id)

    return NextResponse.json({ saved: false })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to unsave' }, { status: 500 })
  }
}