import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const q      = searchParams.get('q')?.trim() ?? ''
    const adult  = searchParams.get('adult') === 'true'
    const limit  = parseInt(searchParams.get('limit') ?? '8')

    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] })
    }

    const { data, error } = await (supabase.rpc as any) ('search_recommendations', {
      p_query:  q,
      p_adult:  adult,
      p_limit:  limit,
      p_offset: 0,
      p_type:   null,
      p_genre:  null,
      p_status: null,
      p_sort:   'score',
    })

    if (error) throw error

    // Dropdown only needs a subset of fields
    const results = (data ?? []).map((r: any) => ({
      id:             r.id,
      title:          r.title,
      type:           r.type,
      cover_url:      r.cover_url,
      author:         r.author,
      artist:         r.artist,
      genres:         r.genres,
      score:          r.score,
      status:         r.status,
      content_rating: r.content_rating,
    }))

    return NextResponse.json({ results })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}