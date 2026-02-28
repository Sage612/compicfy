'use client'

import { useState, useEffect, useCallback } from 'react'
import { ReviewForm, type ReviewWithProfile } from './ReviewForm'
import { ReviewCard } from './ReviewCard'
import { Button } from '@/components/ui/button'
import { Loader2, MessageSquare, LogIn } from 'lucide-react'
import Link from 'next/link'
import { StarRating } from './StarRating'

interface Props {
  recommendationId: string
  currentUserId: string | null
  isLoggedIn: boolean
}

export function ReviewSection({ recommendationId, currentUserId, isLoggedIn }: Props) {
  const [reviews, setReviews] = useState<ReviewWithProfile[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const LIMIT = 10

  // Check if current user already reviewed
  const userReview = reviews.find((r) => r.user_id === currentUserId)

  const fetchReviews = useCallback(async (currentOffset: number, append = false) => {
    try {
      const res = await fetch(
        `/api/recommendations/${recommendationId}/reviews?limit=${LIMIT}&offset=${currentOffset}`
      )
      const data = await res.json()

      if (append) {
        setReviews((prev) => [...prev, ...data.reviews])
      } else {
        setReviews(data.reviews ?? [])
      }

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

  useEffect(() => {
    fetchReviews(0)
  }, [fetchReviews])

  const handleLoadMore = async () => {
    setLoadingMore(true)
    await fetchReviews(offset, true)
  }

  const handleNewReview = (review: ReviewWithProfile) => {
    setReviews((prev) => [review, ...prev])
    setTotal((t) => t + 1)
  }

  const handleUpdate = (updated: ReviewWithProfile) => {
    setReviews((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
  }

  const handleDelete = (id: string) => {
    setReviews((prev) => prev.filter((r) => r.id !== id))
    setTotal((t) => t - 1)
  }

  // Calculate average rating
  const ratingsOnly = reviews.filter((r) => r.rating !== null)
  const avgRating = ratingsOnly.length
    ? ratingsOnly.reduce((sum, r) => sum + (r.rating ?? 0), 0) / ratingsOnly.length
    : 0

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <MessageSquare size={18} />
            Reviews
            {total > 0 && (
              <span className="text-sm font-normal text-muted-foreground">({total})</span>
            )}
          </h2>
          {avgRating > 0 && (
            <div className="flex items-center gap-1.5">
              <StarRating value={Math.round(avgRating)} readonly size={14} />
              <span className="text-sm text-muted-foreground">
                {avgRating.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Write a review */}
      {isLoggedIn ? (
        !userReview ? (
          <div className="p-4 rounded-xl border border-border bg-card/50 space-y-3">
            <p className="text-sm font-medium">Write a Review</p>
            <ReviewForm
              recommendationId={recommendationId}
              onSuccess={handleNewReview}
            />
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-muted-foreground">
            ✅ You have already reviewed this comic. Find your review below to edit it.
          </div>
        )
      ) : (
        <div className="p-4 rounded-xl border border-dashed border-border text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Sign in to write a review
          </p>
          <Link href="/login">
            <Button variant="outline" size="sm" className="gap-2">
              <LogIn size={14} />
              Sign in to Review
            </Button>
          </Link>
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <MessageSquare size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No reviews yet. Be the first!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              currentUserId={currentUserId}
              recommendationId={recommendationId}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}

          {/* Load more */}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="gap-2"
              >
                {loadingMore ? (
                  <><Loader2 size={14} className="animate-spin" />Loading...</>
                ) : (
                  `Load more reviews (${total - reviews.length} remaining)`
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}