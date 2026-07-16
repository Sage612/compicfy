import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const SIMILARITY_THRESHOLD = 0.35

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title')?.trim()

  if (!title || title.length < 2) {
    return NextResponse.json({ duplicate: null, similar: [] })
  }

  const supabase = await createClient()

  const { data, error } = await (supabase as any).rpc('find_similar_recommendations', {
    p_title:     title,
    p_threshold: SIMILARITY_THRESHOLD,
  })

  if (error) {
    console.error('[check-duplicate] RPC error:', error)
    // Fail open — don't block submission over a broken duplicate check.
    return NextResponse.json({ duplicate: null, similar: [] })
  }

  const matches = (data ?? []) as {
    id:          string
    title:       string
    is_approved: boolean
    match_type:  'exact_title' | 'exact_alt_title' | 'fuzzy_title' | 'fuzzy_alt_title'
    similarity:  number
  }[]

  if (matches.length === 0) {
    return NextResponse.json({ duplicate: null, similar: [] })
  }

  const topMatch = matches[0]
  const isExact  = topMatch.match_type === 'exact_title' || topMatch.match_type === 'exact_alt_title'

  return NextResponse.json({
    duplicate: isExact
      ? { id: topMatch.id, title: topMatch.title, is_approved: topMatch.is_approved }
      : null,
    similar: isExact
      ? []
      : matches.map(m => ({
          id:          m.id,
          title:       m.title,
          is_approved: m.is_approved,
          match_type:  m.match_type,
          similarity:  Math.round(m.similarity * 100), // as a 0-100 percentage for display
        })),
  })
}