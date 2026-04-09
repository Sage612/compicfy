import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const limit  = parseInt(searchParams.get('limit')  ?? '20')
    const offset = parseInt(searchParams.get('offset') ?? '0')

    // Exclude people the user already follows + themselves
    const { data: followData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const excludeIds = [
      user.id,
      ...(followData ?? []).map((f: any) => f.following_id),
    ]

    // Count total
    const { count } = await (supabase as any)
      .from('recommendations')
      .select('*', { count: 'exact', head: true })
      .eq('is_approved', true)
      .not('content_rating', 'in', '("adult","mature")')
      .not('user_id', 'in', `(${excludeIds.map(() => '?').join(',')})`)

    // Use a simpler exclude approach Supabase supports
    let countQ = (supabase as any)
      .from('recommendations')
      .select('*', { count: 'exact', head: true })
      .eq('is_approved', true)
      .not('content_rating', 'in', '("adult","mature")')

    excludeIds.forEach(id => {
      countQ = countQ.neq('user_id', id)
    })

    const { count: totalCount } = await countQ

    // Fetch page
    let query = (supabase as any)
      .from('recommendations')
      .select(`
        id, title, cover_url, type, status, genres, description,
        upvotes, review_count, created_at, user_id, score,
        profiles!recommendations_user_id_fkey(
          username, display_name, avatar_url,
          role, is_pro, pro_expires_at, verified_recommender
        )
      `)
      .eq('is_approved', true)
      .not('content_rating', 'in', '("adult","mature")')
      .order('score', { ascending: false })
      .range(offset, offset + limit - 1)

    excludeIds.forEach(id => {
      query = query.neq('user_id', id)
    })

    const { data: recs } = await query

    const items = (recs ?? []).map((r: any) => {
      const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
      return {
        ...r,
        username:             p?.username             ?? '',
        display_name:         p?.display_name         ?? null,
        avatar_url:           p?.avatar_url           ?? null,
        role:                 p?.role                 ?? 'user',
        is_pro:               p?.is_pro               ?? false,
        pro_expires_at:       p?.pro_expires_at        ?? null,
        verified_recommender: p?.verified_recommender ?? false,
        profiles: undefined,
      }
    })

    return NextResponse.json({
      items,
      total:   totalCount ?? 0,
      hasMore: (totalCount ?? 0) > offset + limit,
      empty:   items.length === 0,
    })
  } catch (err) {
    console.error('Discover feed error:', err)
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 })
  }
}