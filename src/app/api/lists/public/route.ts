import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const page   = parseInt(searchParams.get('page')  ?? '1')
    const limit  = parseInt(searchParams.get('limit') ?? '24')
    const offset = (page - 1) * limit

    // Fetch public lists — no nested recommendations here to avoid bloat
    const { data, error, count } = await (supabase as any)
      .from('reading_lists')
      .select(`
        id, user_id, name, description, is_public, star_count, created_at, updated_at,
        profiles!reading_lists_user_id_fkey(username, display_name, avatar_url)
      `, { count: 'exact' })
      .eq('is_public', true)
      .order('star_count', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    const listIds = (data ?? []).map((l: any) => l.id)

    // Fetch item counts separately
    const { data: countRows } = await (supabase as any)
      .from('reading_list_items')
      .select('list_id')
      .in('list_id', listIds)

    const countMap: Record<string, number> = {}
    for (const row of (countRows ?? [])) {
      countMap[row.list_id] = (countMap[row.list_id] ?? 0) + 1
    }

    // Fetch up to 4 cover URLs per list — separate query, clean and limited
    const { data: coverRows } = await (supabase as any)
      .from('reading_list_items')
      .select('list_id, recommendations(cover_url)')
      .in('list_id', listIds)
      .not('recommendations', 'is', null)
      .order('added_at', { ascending: false })

    // Group covers by list_id, max 4 each
    const coverMap: Record<string, string[]> = {}
    for (const row of (coverRows ?? [])) {
      const url = row.recommendations?.cover_url
      if (!url) continue
      if (!coverMap[row.list_id]) coverMap[row.list_id] = []
      if (coverMap[row.list_id].length < 4) coverMap[row.list_id].push(url)
    }

    const enriched = (data ?? []).map((l: any) => ({
      ...l,
      _item_count:    countMap[l.id] ?? 0,
      _cover_urls:    coverMap[l.id] ?? [],
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