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

    // Split query into words so "solo leveling" matches title containing both words
    const words = q.split(/\s+/).filter(Boolean)

    // Build a filter: every word must appear somewhere in the title
    // Falls back to single ilike for single-word queries
    let query = supabase
      .from('recommendations')
      .select('id, title, type, cover_url, author, genres, status')
      .eq('is_approved', true)
      .not('content_rating', 'in', '("adult","mature")')

    if (words.length === 1) {
      // Single word — match title, author, or artist
      query = query.or(
        `title.ilike.%${words[0]}%,author.ilike.%${words[0]}%,artist.ilike.%${words[0]}%`
      )
    } else {
      // Multiple words — each word must appear in the title
      // This correctly handles "solo leveling", "tower of god", etc.
      for (const word of words) {
        query = query.ilike('title', `%${word}%`)
      }
    }

    const { data, error } = await query
      .order('score', { ascending: false })
      .limit(limit)

    if (error) throw error

    // Client-side re-rank: exact/prefix matches bubble to top
    const lower = q.toLowerCase()
    const ranked = ((data as SearchResult[]) ?? []).sort((a, b) => {
      const aTitle = a.title.toLowerCase()
      const bTitle = b.title.toLowerCase()
      // Exact match wins
      if (aTitle === lower && bTitle !== lower) return -1
      if (bTitle === lower && aTitle !== lower) return 1
      // Starts-with wins over contains
      const aStarts = aTitle.startsWith(lower)
      const bStarts = bTitle.startsWith(lower)
      if (aStarts && !bStarts) return -1
      if (bStarts && !aStarts) return 1
      return 0
    })

    return NextResponse.json({ results: ranked })
  } catch (err) {
    console.error('[/api/search]', err)
    return NextResponse.json({ results: [] }, { status: 500 })
  }
}