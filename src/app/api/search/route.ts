// src/app/api/search/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface SearchResult {
  id: string
  title: string
  type: string
  cover_url: string | null
  author: string | null
  genres: string[]
  status: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q     = searchParams.get('q')?.trim() ?? ''
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '8'), 20)

  if (q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  try {
    const supabase = await createClient()

    const { data, error } = await (supabase as any).rpc('search_recommendations_fuzzy', {
      p_query:     q,
      p_threshold: 0.2,
      p_limit:     limit,
      p_offset:    0,
    })

    if (error) throw error

    const results: SearchResult[] = ((data ?? []) as any[]).map(r => ({
      id:        r.id,
      title:     r.title,
      type:      r.type,
      cover_url: r.cover_url,
      author:    r.author,
      genres:    r.genres ?? [],
      status:    r.status,
    }))

    return NextResponse.json({ results })
  } catch (err) {
    console.error('[/api/search]', err)
    return NextResponse.json({ results: [] }, { status: 500 })
  }
}