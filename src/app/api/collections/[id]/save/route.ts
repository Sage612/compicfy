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

    // Upsert so duplicate saves never 409
    const { error: insertError } = await (supabase as any)
      .from('collection_saves')
      .upsert(
        { user_id: user.id, collection_id: id },
        { onConflict: 'user_id,collection_id', ignoreDuplicates: true }
      )

    if (insertError) throw insertError

    // Recalculate save_count from actual rows — source of truth
    const { count } = await (supabase as any)
      .from('collection_saves')
      .select('*', { count: 'exact', head: true })
      .eq('collection_id', id)

    await (supabase as any)
      .from('collections')
      .update({ save_count: count ?? 0 })
      .eq('id', id)

    return NextResponse.json({ saved: true, save_count: count ?? 0 }, { status: 201 })
  } catch (err) {
    console.error('Save POST error:', err)
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

    // Recalculate save_count from actual rows — source of truth
    const { count } = await (supabase as any)
      .from('collection_saves')
      .select('*', { count: 'exact', head: true })
      .eq('collection_id', id)

    await (supabase as any)
      .from('collections')
      .update({ save_count: count ?? 0 })
      .eq('id', id)

    return NextResponse.json({ saved: false, save_count: count ?? 0 })
  } catch (err) {
    console.error('Save DELETE error:', err)
    return NextResponse.json({ error: 'Failed to unsave' }, { status: 500 })
  }
}