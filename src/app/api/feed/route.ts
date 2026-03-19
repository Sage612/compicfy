import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get IDs of people the user follows
    const { data: followData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const followingIds = (followData ?? []).map((f: any) => f.following_id)

    if (followingIds.length === 0) {
      return NextResponse.json({ items: [], empty: true })
    }

    // Get recent approved recommendations from followed users
    const { data: recs } = await supabase
      .from('recommendations')
      .select('id, title, cover_url, type, status, genres, upvotes, created_at, user_id, profiles(username, display_name, avatar_url)')
      .in('user_id', followingIds)
      .eq('is_approved', true)
      .not('content_rating', 'in', '("adult","mature")')
      .order('created_at', { ascending: false })
      .limit(30)

    return NextResponse.json({ items: recs ?? [], empty: false })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 })
  }
}