import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { recommendationSchema } from '@/lib/utils/validators'
import { enforceRecLimit } from '@/lib/utils/proEnforce'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const page   = parseInt(searchParams.get('page')  ?? '1')
    const limit  = parseInt(searchParams.get('limit') ?? '24')
    const type   = searchParams.get('type')   ?? ''
    const genre  = searchParams.get('genre')  ?? ''
    const status = searchParams.get('status') ?? ''
    const sort   = searchParams.get('sort')   ?? 'score'
    const q      = searchParams.get('q')      ?? ''
    const adult  = searchParams.get('adult')  === 'true'
    const offset = (page - 1) * limit

    const { data, error } = await (supabase as any).rpc('search_recommendations', {
      p_query:  q      || null,
      p_type:   type   || null,
      p_genre:  genre  || null,
      p_status: status || null,
      p_sort:   sort,
      p_adult:  adult,
      p_limit:  limit,
      p_offset: offset,
    })

    if (error) throw error

    let countQuery = supabase
      .from('recommendations')
      .select('*', { count: 'exact', head: true })
      .eq('is_approved', true)

    if (adult) {
      countQuery = countQuery.in('content_rating', ['adult', 'mature'])
    } else {
      countQuery = countQuery.not('content_rating', 'in', '("adult","mature")')
    }

    if (q)      countQuery = countQuery.or(`title.ilike.%${q}%,author.ilike.%${q}%,artist.ilike.%${q}%,description.ilike.%${q}%`)
    if (type)   countQuery = countQuery.eq('type', type as any)
    if (genre)  countQuery = countQuery.contains('genres', [genre])
    if (status) countQuery = countQuery.eq('status', status)

    const { count } = await countQuery

    return NextResponse.json({
      recommendations: data ?? [],
      total:   count ?? 0,
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

    // ── Enforce monthly recommendation limit for free users ──
    const { allowed, error: limitError } = await enforceRecLimit(user.id)
    if (!allowed) return limitError!

    const body = await request.json()
    const parsed = recommendationSchema.safeParse(body)

    if (!parsed.success) {
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
        cover_url:          data.cover_url    || null,
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
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ recommendation }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}