import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const page   = parseInt(searchParams.get('page')  ?? '1')
    const limit  = parseInt(searchParams.get('limit') ?? '24')
    const offset = (page - 1) * limit

    // Fetch public lists with cover previews (no count aggregate)
    const { data, error, count } = await (supabase as any)
      .from('reading_lists')
      .select(`
        *,
        profiles!reading_lists_user_id_fkey(username, display_name, avatar_url),
        reading_list_items(
          recommendations(cover_url)
        )
      `, { count: 'exact' })
      .eq('is_public', true)
      .order('star_count', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    // Fetch item counts separately
    const listIds = (data ?? []).map((l: any) => l.id)
    const { data: countRows } = await (supabase as any)
      .from('reading_list_items')
      .select('list_id')
      .in('list_id', listIds)

    const countMap: Record<string, number> = {}
    for (const row of (countRows ?? [])) {
      countMap[row.list_id] = (countMap[row.list_id] ?? 0) + 1
    }

    const enriched = (data ?? []).map((l: any) => ({
      ...l,
      _item_count: countMap[l.id] ?? 0,
    }))

    return NextResponse.json({
      lists:   enriched,
      total:   count ?? 0,
      hasMore: (count ?? 0) > offset + limit,
    })
  } catch (err) {
    console.error('Public lists GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}