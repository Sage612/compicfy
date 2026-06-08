import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST — star a list
export async function POST(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error: insertError } = await (supabase as any)
      .from('list_stars')
      .upsert(
        { user_id: user.id, list_id: id },
        { onConflict: 'user_id,list_id', ignoreDuplicates: true }
      )
    if (insertError) throw insertError

    const { count } = await (supabase as any)
      .from('list_stars')
      .select('*', { count: 'exact', head: true })
      .eq('list_id', id)

    await (supabase as any)
      .from('reading_lists')
      .update({ star_count: count ?? 0 })
      .eq('id', id)

    return NextResponse.json({ starred: true, star_count: count ?? 0 }, { status: 201 })
  } catch (err) {
    console.error('Star POST error:', err)
    return NextResponse.json({ error: 'Failed to star' }, { status: 500 })
  }
}

// DELETE — unstar a list
export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await (supabase as any)
      .from('list_stars')
      .delete()
      .eq('user_id', user.id)
      .eq('list_id', id)

    const { count } = await (supabase as any)
      .from('list_stars')
      .select('*', { count: 'exact', head: true })
      .eq('list_id', id)

    await (supabase as any)
      .from('reading_lists')
      .update({ star_count: count ?? 0 })
      .eq('id', id)

    return NextResponse.json({ starred: false, star_count: count ?? 0 })
  } catch (err) {
    console.error('Star DELETE error:', err)
    return NextResponse.json({ error: 'Failed to unstar' }, { status: 500 })
  }
}