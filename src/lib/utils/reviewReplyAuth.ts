import type { SupabaseClient } from '@supabase/supabase-js'

export async function canReplyToReview(
  supabase: SupabaseClient,
  userId: string,
  reviewId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const [{ data: review }, { data: profile }] = await Promise.all([
    (supabase as any)
      .from('reviews')
      .select('user_id, recommendation_id, recommendations(user_id)')
      .eq('id', reviewId)
      .single(),
    (supabase as any)
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single(),
  ])

  if (!review) return { allowed: false, reason: 'Review not found' }

  const isReviewAuthor = review.user_id === userId
  const isRecommender  = review.recommendations?.user_id === userId
  const isStaff        = profile?.role === 'admin' || profile?.role === 'moderator'

  if (isReviewAuthor || isRecommender || isStaff) {
    return { allowed: true }
  }

  return {
    allowed: false,
    reason: 'Only the review author, the comic\'s recommender, or a moderator can reply',
  }
}