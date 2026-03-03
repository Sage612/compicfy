import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('reading_list_items')
      .select('*, recommendations(id, title, cover_url, type, status, genres)')
      .eq('list_id', id)
      .order('added_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ items: data })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { recommendation_id, status } = await request.json()

    const { data, error } = await (supabase as any)
      .from('reading_list_items')
      .upsert({
        list_id: id,
        recommendation_id,
        status: status ?? 'plan_to_read',
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ item: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to add' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const recId = searchParams.get('rec_id')

    await supabase
      .from('reading_list_items')
      .delete()
      .eq('list_id', id)
      .eq('recommendation_id', recId!)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to remove' }, { status: 500 })
  }
}