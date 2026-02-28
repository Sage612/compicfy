import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { recommendationSchema } from '@/lib/utils/validators'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is banned
    const { data: profileData } = await supabase
  .from('profiles')
  .select('role, is_banned')
  .eq('id', user.id)
  .single()

const profile = profileData as { role: string; is_banned: boolean } | null

    // Parse body
    const body = await request.json()

    // Validate
    const parsed = recommendationSchema.safeParse(body)
    if (!parsed.success) {
      console.error('Validation errors:', parsed.error.flatten())
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const data = parsed.data

    // Auto-approve admins/moderators
    const isAutoApproved = ['admin', 'moderator'].includes(profile?.role ?? '')

    const { data: recommendation, error } = await (supabase as any)
  .from('recommendations')
  .insert({
    user_id: user.id,
        title: data.title,
        description: data.description,
        type: data.type,
        status: data.status,
        genres: data.genres,
        official_platforms: data.official_platforms,
        cover_url: data.cover_url || null,
        content_rating: data.content_rating,
        why_recommend: data.why_recommend || null,
        author: data.author || null,
        artist: data.artist || null,
        year_released: data.year_released || null,
        chapter_count: data.chapter_count || null,
        is_approved: isAutoApproved,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ recommendation }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '20')
    const type = searchParams.get('type')
    const genre = searchParams.get('genre')
    const sort = searchParams.get('sort') ?? 'score'
    const offset = (page - 1) * limit

    // Build query — typed explicitly to avoid 'never' errors
    let query = supabase
      .from('recommendations')
      .select('*, profiles(username, display_name, avatar_url)', { count: 'exact' })
      .eq('is_approved', true)
      .range(offset, offset + limit - 1)

    if (type) {
      query = query.eq('type', type as 'manga' | 'manhwa' | 'manhua' | 'webtoon' | 'comic' | 'other')
    }

    if (genre) {
      query = query.contains('genres', [genre])
    }

    if (sort === 'trending') {
      query = query.order('daily_votes', { ascending: false })
    } else if (sort === 'recent') {
      query = query.order('created_at', { ascending: false })
    } else {
      query = query.order('score', { ascending: false })
    }

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json({
      recommendations: data,
      total: count,
      page,
      limit,
      hasMore: (count ?? 0) > offset + limit,
    })
  } catch (error) {
    console.error('Failed to fetch recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    )
  }
}