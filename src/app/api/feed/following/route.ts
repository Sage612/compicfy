import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import {
  flattenActor, sortAndPage, isFeedWorthyReview, ACTOR_JOIN_FRAGMENT,
  type FeedItem, type RecommendationFeedItem, type CollectionFeedItem,
  type ListFeedItem, type ReviewFeedItem,
} from '@/lib/utils/feedTypes'

const PER_SOURCE_FETCH = 60

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const limit  = parseInt(searchParams.get('limit')  ?? '20')
    const offset = parseInt(searchParams.get('offset') ?? '0')

    const { data: followData } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)

    const followingIds = (followData ?? []).map((f: any) => f.following_id)

    if (followingIds.length === 0) {
      return NextResponse.json({ items: [], total: 0, hasMore: false, empty: true })
    }

    const [recsRes, collectionsRes, listsRes, reviewsRes] = await Promise.all([
      // ── Recommendations ──
      (supabase as any)
        .from('recommendations')
        .select(`
          id, title, cover_url, type, status, genres, description,
          upvotes, review_count, created_at, user_id,
          profiles!recommendations_user_id_fkey(${ACTOR_JOIN_FRAGMENT})
        `)
        .in('user_id', followingIds)
        .eq('is_approved', true)
        .not('content_rating', 'in', '("adult","mature")')
        .order('created_at', { ascending: false })
        .limit(PER_SOURCE_FETCH),

      // ── Collections ──
      (supabase as any)
        .from('collections')
        .select(`
          id, title, description, created_at, user_id,
          profiles!collections_user_id_fkey(${ACTOR_JOIN_FRAGMENT}),
          collection_items(recommendations(cover_url))
        `)
        .in('user_id', followingIds)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(PER_SOURCE_FETCH),

      // ── Reading lists ──
      (supabase as any)
        .from('reading_lists')
        .select(`
          id, name, description, star_count, created_at, user_id,
          profiles!reading_lists_user_id_fkey(${ACTOR_JOIN_FRAGMENT}),
          reading_list_items(recommendations(cover_url))
        `)
        .in('user_id', followingIds)
        .eq('is_public', true)
        .order('created_at', { ascending: false })
        .limit(PER_SOURCE_FETCH),

      (supabase as any)
        .from('reviews')
        .select(`
          id, content, rating, contains_spoilers, created_at, user_id,
          recommendation_id,
          profiles!reviews_user_id_fkey(${ACTOR_JOIN_FRAGMENT}),
          recommendations(title, cover_url)
        `)
        .in('user_id', followingIds)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(PER_SOURCE_FETCH),
    ])

    const recommendationItems: RecommendationFeedItem[] = (recsRes.data ?? []).map((r: any) => ({
      item_type:    'recommendation',
      ...flattenActor(r.user_id, r.profiles),
      id:           r.id,
      created_at:   r.created_at,
      title:        r.title,
      cover_url:    r.cover_url,
      type:         r.type,
      status:       r.status,
      genres:       r.genres ?? [],
      description:  r.description ?? '',
      upvotes:      r.upvotes ?? 0,
      review_count: r.review_count ?? 0,
    }))

    const collectionItems: CollectionFeedItem[] = (collectionsRes.data ?? []).map((c: any) => ({
      item_type:   'collection',
      ...flattenActor(c.user_id, c.profiles),
      id:          c.id,
      created_at:  c.created_at,
      title:       c.title,
      description: c.description,
      cover_urls:  (c.collection_items ?? [])
        .map((ci: any) => ci.recommendations?.cover_url)
        .filter(Boolean)
        .slice(0, 4),
      item_count:  (c.collection_items ?? []).length,
    }))

    const listItems: ListFeedItem[] = (listsRes.data ?? []).map((l: any) => ({
      item_type:   'list',
      ...flattenActor(l.user_id, l.profiles),
      id:          l.id,
      created_at:  l.created_at,
      name:        l.name,
      description: l.description,
      cover_urls:  (l.reading_list_items ?? [])
        .map((li: any) => li.recommendations?.cover_url)
        .filter(Boolean)
        .slice(0, 4),
      item_count:  (l.reading_list_items ?? []).length,
      star_count:  l.star_count ?? 0,
    }))

    const reviewItems: ReviewFeedItem[] = (reviewsRes.data ?? [])
      .filter((rv: any) => isFeedWorthyReview(rv.rating, rv.content ?? ''))
      .map((rv: any) => ({
        item_type:            'review',
        ...flattenActor(rv.user_id, rv.profiles),
        id:                   rv.id,
        created_at:           rv.created_at,
        content:              rv.content,
        rating:               rv.rating,
        contains_spoilers:    rv.contains_spoilers ?? false,
        recommendation_id:    rv.recommendation_id,
        recommendation_title: rv.recommendations?.title ?? '',
        recommendation_cover: rv.recommendations?.cover_url ?? null,
      }))

    const merged: FeedItem[] = [
      ...recommendationItems, ...collectionItems, ...listItems, ...reviewItems,
    ]

    const { page, hasMore } = sortAndPage(merged, offset, limit)

    return NextResponse.json({
      items:   page,
      total:   merged.length,
      hasMore,
      empty:   false,
    })
  } catch (err) {
    console.error('Following feed error:', err)
    return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 })
  }
}