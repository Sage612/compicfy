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

  // Optional tag filter — roadmap item #2. Comma-separated tag UUIDs,
  // e.g. ?tags=<uuid1>,<uuid2>. Matches ANY of the given tags.
  const tagsParam = searchParams.get('tags')?.trim()
  const tagIds = tagsParam
    ? tagsParam.split(',').map(t => t.trim()).filter(Boolean)
    : null
  const hasTags = !!tagIds && tagIds.length > 0

  const supabase = await createClient()

  // Tag-only browse: no name typed, at least one tag selected. This is
  // the main trope/mood discovery use case — finding a comic you don't
  // already know the name of — so it needs its own path rather than
  // being folded into the fuzzy-title RPC, which requires a query to
  // score similarity against and has nothing to do when there isn't one.
  if (q.length < 2) {
    if (!hasTags) {
      return NextResponse.json({ results: [] })
    }

    try {
      const { data, error } = await (supabase as any).rpc('browse_by_tags', {
        p_tag_ids: tagIds,
        p_limit:   limit,
        p_offset:  0,
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
      console.error('[/api/search tag-only]', err)
      return NextResponse.json({ results: [] }, { status: 500 })
    }
  }

  // Normal path: fuzzy title/alt-title search, optionally further
  // narrowed by tags (intersection — must match the query AND have at
  // least one of the given tags).
  try {
    const { data, error } = await (supabase as any).rpc('search_recommendations_fuzzy', {
      p_query:     q,
      p_threshold: 0.2,
      p_limit:     limit,
      p_offset:    0,
      ...(hasTags ? { p_tag_ids: tagIds } : {}),
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