import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { enforceListLimit } from '@/lib/utils/proEnforce'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await (supabase as any)
      .from('reading_lists')
      .select(`
        *,
        reading_list_items(
          count,
          recommendations(cover_url)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json({ lists: data })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { allowed, error: limitError } = await enforceListLimit(user.id)
    if (!allowed) return limitError!

    const { name, description, is_public } = await request.json()
    if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

    const { data, error } = await (supabase as any)
      .from('reading_lists')
      .insert({
        user_id:     user.id,
        name:        name.trim(),
        description,
        is_public:   is_public ?? false,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ list: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}