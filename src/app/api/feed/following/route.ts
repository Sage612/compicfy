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

    // Get IDs of people the user follows
    const { data: followData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const followingIds = (followData ?? []).map((f: any) => f.following_id)

    if (followingIds.length === 0) {
      return NextResponse.json({ items: [], total: 0, hasMore: false, empty: true })
    }

    // Count total
    const { count } = await supabase
      .from('recommendations')
      .select('*', { count: 'exact', head: true })
      .in('user_id', followingIds)
      .eq('is_approved', true)
      .not('content_rating', 'in', '("adult","mature")')

    // Fetch page
    const { data: recs } = await (supabase as any)
      .from('recommendations')
      .select(`
        id, title, cover_url, type, status, genres, description,
        upvotes, review_count, created_at, user_id,
        profiles!recommendations_user_id_fkey(
          username, display_name, avatar_url,
          role, is_pro, pro_expires_at, verified_recommender
        )
      `)
      .in('user_id', followingIds)
      .eq('is_approved', true)
      .not('content_rating', 'in', '("adult","mature")')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Flatten profiles join into top-level fields to match RPC shape FeedCard expects
    const items = (recs ?? []).map((r: any) => {
      const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles
      return {
        ...r,
        username:           p?.username           ?? '',
        display_name:       p?.display_name        ?? null,
        avatar_url:         p?.avatar_url          ?? null,
        role:               p?.role               ?? 'user',
        is_pro:             p?.is_pro             ?? false,
        pro_expires_at:     p?.pro_expires_at      ?? null,
        verified_recommender: p?.verified_recommender ?? false,
        profiles: undefined,
      }
    })

    return NextResponse.json({
      items,
      total:   count ?? 0,
      hasMore: (count ?? 0) > offset + limit,
      empty:   false,
    })
  } catch (err) {
    console.error('Following feed error:', err)
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 })
  }
}