'use client'

import { useState, useEffect, useCallback } from 'react'
import { ReviewForm, type ReviewWithProfile } from './ReviewForm'
import { ReviewCard } from './ReviewCard'
import { Button } from '@/components/ui/button'
import { AuthPromptModal } from '@/components/ui/auth-prompt-modal'
import { Loader2, MessageSquare, LogIn, Plus, Star } from 'lucide-react'
import { StarRating } from './StarRating'
import { cn } from '@/lib/utils'
import type { ReplyWithProfile } from './ReplyThread'

interface Props {
  recommendationId: string
  currentUserId:    string | null
  isLoggedIn:       boolean
  recommenderId?:    string | null
  currentUserRole?:  string | null
}

type ReviewWithReplies = ReviewWithProfile & { review_replies?: ReplyWithProfile[] }

export function ReviewSection({
  recommendationId,
  currentUserId,
  isLoggedIn,
  recommenderId = null,
  currentUserRole = null,
}: Props) {
  const [reviews, setReviews] = useState<ReviewWithReplies[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [showReviewAuth, setShowReviewAuth] = useState(false)
  const LIMIT = 10

  const userReview = reviews.find(r => r.user_id === currentUserId)

  const isStaff        = currentUserRole === 'admin' || currentUserRole === 'moderator'
  const isRecommender  = !!currentUserId && currentUserId === recommenderId

  const fetchReviews = useCallback(async (currentOffset: number, append = false) => {
    try {
      const res = await fetch(
        `/api/recommendations/${recommendationId}/reviews?limit=${LIMIT}&offset=${currentOffset}`
      )
      const data = await res.json()
      if (append) setReviews(prev => [...prev, ...data.reviews])
      else setReviews(data.reviews ?? [])
      setTotal(data.total ?? 0)
      setHasMore(data.hasMore ?? false)
      setOffset(currentOffset + LIMIT)
    } catch {
      console.error('Failed to fetch reviews')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [recommendationId])

  useEffect(() => { fetchReviews(0) }, [fetchReviews])

  const handleLoadMore = async () => {
    setLoadingMore(true)
    await fetchReviews(offset, true)
  }

  const handleNewReview = (review: ReviewWithProfile) => {
    setReviews(prev => [review, ...prev])
    setTotal(t => t + 1)
    setShowForm(false)
  }

  const handleUpdate = (updated: ReviewWithProfile) =>
    setReviews(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r))

  const handleDelete = (id: string) => {
    setReviews(prev => prev.filter(r => r.id !== id))
    setTotal(t => t - 1)
  }

  const ratingsOnly = reviews.filter(r => r.rating !== null)
  const avgRating = ratingsOnly.length
    ? ratingsOnly.reduce((sum, r) => sum + (r.rating ?? 0), 0) / ratingsOnly.length
    : 0

  const ratingCounts = [5, 4, 3, 2, 1].map(n => ({
    n,
    count: ratingsOnly.filter(r => r.rating === n).length,
    pct: ratingsOnly.length
      ? Math.round((ratingsOnly.filter(r => r.rating === n).length / ratingsOnly.length) * 100)
      : 0,
  }))

  return (
    <div className="space-y-6">

      {/* Section header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <MessageSquare size={14} className="text-primary" />
            </div>
            <h2 className="text-lg font-black tracking-tight">
              Reviews
              {total > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-1.5">({total})</span>
              )}
            </h2>
          </div>
          {avgRating > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              <StarRating value={Math.round(avgRating)} readonly size={12} />
              <span className="text-xs font-black text-amber-600">{avgRating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {isLoggedIn && !userReview && !showForm && (
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="gap-1.5 shrink-0"
          >
            <Plus size={13} />
            <span className="hidden sm:inline">Write Review</span>
            <span className="sm:hidden">Review</span>
          </Button>
        )}
      </div>

      {/* Rating summary bar */}
      {ratingsOnly.length >= 3 && (
        <div className="p-4 rounded-2xl border border-border bg-card space-y-2.5">
          <div className="flex items-center gap-4">
            <div className="text-center shrink-0">
              <p className="text-4xl font-black text-foreground leading-none">{avgRating.toFixed(1)}</p>
              <div className="mt-1.5 flex justify-center">
                <StarRating value={Math.round(avgRating)} readonly size={13} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{ratingsOnly.length} ratings</p>
            </div>
            <div className="flex-1 space-y-1.5">
              {ratingCounts.map(({ n, count, pct }) => (
                <div key={n} className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5 w-14 justify-end shrink-0">
                    {Array.from({ length: n }).map((_, i) => (
                      <Star key={i} size={9} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-amber-400 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-6 shrink-0">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Write a review */}
      {isLoggedIn ? (
        <>
          {showForm && !userReview && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-primary/5">
                <p className="text-xs font-black uppercase tracking-widest text-primary">Write a Review</p>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
              </div>
              <div className="p-5">
                <ReviewForm
                  recommendationId={recommendationId}
                  onSuccess={handleNewReview}
                />
              </div>
            </div>
          )}
          {userReview && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-sm text-emerald-600">
              <span>You've reviewed this comic, find it below to edit.</span>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl border border-dashed border-border bg-card/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare size={15} className="text-muted-foreground/60" />
              Have thoughts on this comic? Sign in to write a review.
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 whitespace-nowrap shrink-0"
              onClick={() => setShowReviewAuth(true)}
            >
              <LogIn size={13} />
              Sign in to Review
            </Button>
          </div>

          <AuthPromptModal
            open={showReviewAuth}
            onClose={() => setShowReviewAuth(false)}
            config={{
              action: 'write a review',
              icon: <MessageSquare size={24} className="text-amber-500" />,
            }}
          />
        </>
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={22} className="animate-spin text-muted-foreground" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-border space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <MessageSquare size={18} className="text-muted-foreground opacity-40" />
          </div>
          <div>
            <p className="font-black text-sm">No reviews yet</p>
            <p className="text-xs text-muted-foreground mt-1">Be the first to share your thoughts!</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(review => {
            // A viewer can reply if they're: the review's own author, the
            // comic's recommender, or staff (admin/mod). This mirrors the
            // RLS policy and API check exactly, so the UI never offers a
            // reply option the backend would reject.
            const canReply = isLoggedIn && (
              currentUserId === review.user_id ||
              isRecommender ||
              isStaff
            )

            return (
              <ReviewCard
                key={review.id}
                review={review}
                currentUserId={currentUserId}
                recommendationId={recommendationId}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                canReply={canReply}
                isStaff={isStaff}
              />
            )
          })}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className={cn(
                  'gap-2 rounded-xl min-w-[160px]',
                  'border-border hover:border-primary/50 transition-colors'
                )}
              >
                {loadingMore ? (
                  <><Loader2 size={13} className="animate-spin" /> Loading...</>
                ) : (
                  <><Plus size={13} /> Load more ({total - reviews.length})</>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}