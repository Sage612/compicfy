import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q     = searchParams.get('q')?.trim() ?? ''
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '8'), 20)

  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  try {
    const supabase = await createClient()

    const { data } = await supabase
      .from('recommendations')
      .select('id, title, type, cover_url, author, genres, status')
      .eq('is_approved', true)
      .not('content_rating', 'in', '("adult","mature")')
      .or(`title.ilike.%${q}%,author.ilike.%${q}%,artist.ilike.%${q}%`)
      .order('score', { ascending: false })
      .limit(limit)

    return NextResponse.json({ results: data ?? [] })
  } catch {
    return NextResponse.json({ results: [] }, { status: 500 })
  }
}