import type { Recommendation } from '@/types/database.types'

export interface FeedActor {
  user_id:               string
  username:               string
  display_name:           string | null
  avatar_url:             string | null
  role:                   string
  is_pro:                 boolean
  pro_expires_at:         string | null
  verified_recommender:   boolean
}

export interface RecommendationFeedItem extends FeedActor {
  item_type:    'recommendation'
  id:           string
  created_at:   string
  title:        string
  cover_url:    string | null
  type:         string
  status:       string
  genres:       string[]
  description:  string
  upvotes:      number
  review_count: number
  score?:       number
}

export interface CollectionFeedItem extends FeedActor {
  item_type:     'collection'
  id:            string
  created_at:    string
  title:         string
  description:   string | null
  cover_urls:    string[] // up to 4, pulled from collection_items
  item_count:    number
}

export interface ListFeedItem extends FeedActor {
  item_type:    'list'
  id:           string
  created_at:   string
  name:         string
  description:  string | null
  cover_urls:   string[] // up to 4, pulled from reading_list_items
  item_count:   number
  star_count:   number
}

export interface ReviewFeedItem extends FeedActor {
  item_type:          'review'
  id:                 string
  created_at:         string
  content:             string
  rating:              number | null
  contains_spoilers:   boolean
  recommendation_id:   string
  recommendation_title: string
  recommendation_cover: string | null
}

export type FeedItem =
  | RecommendationFeedItem
  | CollectionFeedItem
  | ListFeedItem
  | ReviewFeedItem

export const REVIEW_MIN_POSITIVE_RATING = 4
export const REVIEW_MIN_THOUGHTFUL_LENGTH = 200

export function isFeedWorthyReview(rating: number | null, content: string): boolean {
  const isPositive   = rating !== null && rating >= REVIEW_MIN_POSITIVE_RATING
  const isThoughtful = content.length >= REVIEW_MIN_THOUGHTFUL_LENGTH
  return isPositive || isThoughtful
}

export function flattenActor(userId: string, profileJoin: any): FeedActor {
  const p = Array.isArray(profileJoin) ? profileJoin[0] : profileJoin
  return {
    user_id:               userId,
    username:               p?.username               ?? '',
    display_name:           p?.display_name            ?? null,
    avatar_url:             p?.avatar_url              ?? null,
    role:                   p?.role                   ?? 'user',
    is_pro:                 p?.is_pro                 ?? false,
    pro_expires_at:         p?.pro_expires_at          ?? null,
    verified_recommender:   p?.verified_recommender   ?? false,
  }
}

export function sortAndPage<T extends { created_at: string }>(
  items: T[], offset: number, limit: number,
): { page: T[]; hasMore: boolean } {
  const sorted = [...items].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const page = sorted.slice(offset, offset + limit)
  return { page, hasMore: sorted.length > offset + limit }
}

export const ACTOR_JOIN_FRAGMENT = `
  username, display_name, avatar_url,
  role, is_pro, pro_expires_at, verified_recommender
`