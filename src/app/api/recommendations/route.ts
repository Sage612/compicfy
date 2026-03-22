import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { recommendationSchema } from '@/lib/utils/validators'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const page   = parseInt(searchParams.get('page')  ?? '1')
    const limit  = parseInt(searchParams.get('limit') ?? '24')
    const type   = searchParams.get('type')
    const genre  = searchParams.get('genre')
    const status = searchParams.get('status')
    const sort   = searchParams.get('sort') ?? 'score'
    const q      = searchParams.get('q')?.trim()
    const adult  = searchParams.get('adult') === 'true'
    const offset = (page - 1) * limit

    // Search query present — use the search_recommendations RPC function
    // which searches title, author, artist, description, genres with relevance ranking
    if (q && q.length >= 2) {
      // Get matching rows via RPC
      const { data: searchData, error: searchError } = await (supabase.rpc as any) (
        'search_recommendations',
        {
          p_query:  q,
          p_adult:  adult,
          p_limit:  limit,
          p_offset: offset,
          p_type:   type   || null,
          p_genre:  genre  || null,
          p_status: status || null,
          p_sort:   sort,
        }
      )
      if (searchError) throw searchError

      // RPC returns rows only — get total count with a separate lightweight call
      const { data: countData, error: countError } = await (supabase.rpc as any) (
        'search_recommendations',
        {
          p_query:  q,
          p_adult:  adult,
          p_limit:  10000, // large enough to count all matches
          p_offset: 0,
          p_type:   type   || null,
          p_genre:  genre  || null,
          p_status: status || null,
          p_sort:   sort,
        }
      )
      if (countError) throw countError

      const total = (countData ?? []).length

      return NextResponse.json({
        recommendations: searchData ?? [],
        total,
        page,
        limit,
        hasMore: total > offset + limit,
      })
    }

    // No search query — standard filter query
    let query = supabase
      .from('recommendations')
      .select('*', { count: 'exact' })
      .eq('is_approved', true)

    // Content rating gate
    if (adult) {
      query = query.in('content_rating', ['adult', 'mature'])
    } else {
      query = query.not('content_rating', 'in', '("adult","mature")')
    }

    if (type)   query = query.eq('type', type as any)
    if (genre)  query = query.contains('genres', [genre])
    if (status) query = query.eq('status', status)

    switch (sort) {
      case 'trending': query = query.order('daily_votes', { ascending: false }); break
      case 'recent':   query = query.order('created_at',  { ascending: false }); break
      default:         query = query.order('score',        { ascending: false })
    }

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json({
      recommendations: data,
      total:   count,
      page,
      limit,
      hasMore: (count ?? 0) > offset + limit,
    })
  } catch (error) {
    console.error('Failed to fetch recommendations:', error)
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, is_banned')
      .eq('id', user.id)
      .single()

    const profile = profileData as { role: string; is_banned: boolean } | null

    if (profile?.is_banned) {
      return NextResponse.json({ error: 'Your account has been banned' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = recommendationSchema.safeParse(body)

    if (!parsed.success) {
      console.error('Validation errors:', parsed.error.flatten())
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Duplicate title check
    const { data: existing } = await (supabase as any)
      .from('recommendations')
      .select('id, title, is_approved')
      .ilike('title', data.title.trim())
      .single()

    if (existing) {
      return NextResponse.json(
        {
          error:       'duplicate',
          message:     `"${existing.title}" has already been recommended.`,
          existing_id: existing.id,
          is_approved: existing.is_approved,
        },
        { status: 409 }
      )
    }

    const isAutoApproved = ['admin', 'moderator'].includes(profile?.role ?? '')

    const { data: recommendation, error } = await (supabase as any)
      .from('recommendations')
      .insert({
        user_id:            user.id,
        title:              data.title,
        description:        data.description,
        type:               data.type,
        status:             data.status,
        genres:             data.genres,
        official_platforms: data.official_platforms,
        cover_url:          data.cover_url   || null,
        content_rating:     data.content_rating,
        why_recommend:      data.why_recommend || null,
        author:             data.author        || null,
        artist:             data.artist        || null,
        year_released:      data.year_released || null,
        chapter_count:      data.chapter_count || null,
        is_approved:        isAutoApproved,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ recommendation }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}