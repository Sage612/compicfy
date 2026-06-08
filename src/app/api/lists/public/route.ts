import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const page  = parseInt(searchParams.get('page')  ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '24')
    const offset = (page - 1) * limit

    const { data, error, count } = await (supabase as any)
      .from('reading_lists')
      .select(`
        *,
        profiles!reading_lists_user_id_fkey(username, display_name, avatar_url),
        reading_list_items(
          count,
          recommendations(cover_url)
        )
      `, { count: 'exact' })
      .eq('is_public', true)
      .order('star_count', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    return NextResponse.json({
      lists:   data ?? [],
      total:   count ?? 0,
      hasMore: (count ?? 0) > offset + limit,
    })
  } catch (err) {
    console.error('Public lists GET error:', err)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}