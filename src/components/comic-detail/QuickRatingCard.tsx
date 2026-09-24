'use client'

import { useState } from 'react'
import { Star, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  recommendationId: string
  isLoggedIn:        boolean
  /** The user's existing rating for this comic, fetched server-side on
   *  page load. When set, the card shows the already-rated state
   *  immediately instead of a blank picker the user has to re-tap. */
  initialRating?:    number | null
  onSubmitted?:      () => void
}

/**
 * Rating-only submission — sends rating_only: true so the API route
 * skips the full review schema (which requires 3+ chars of content) and
 * inserts a review row with empty content instead. See the route's
 * rating_only branch for details.
 *
 * Once a rating exists (from initialRating or a fresh submit), the stars
 * become read-only rather than re-submittable — I don't have the PATCH
 * /reviews/[reviewId] route, so I can't safely wire up "change your
 * rating" without guessing at its validation the same way the POST route
 * needed rating_only for. Send that file if you want re-rating enabled.
 */
export function QuickRatingCard({ recommendationId, isLoggedIn, initialRating = null, onSubmitted }: Props) {
  const [rating,     setRating]     = useState(initialRating ?? 0)
  const [hover,       setHover]     = useState(0)
  const [submitting,  setSubmitting] = useState(false)
  const [submitted,   setSubmitted]  = useState(!!initialRating)

  if (!isLoggedIn) return null

  const handleRate = async (value: number) => {
    setRating(value)
    setSubmitting(true)
    try {
      const res = await fetch(`/api/recommendations/${recommendationId}/reviews`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ rating: value, rating_only: true }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'Failed to submit rating')
        return
      }
      setSubmitted(true)
      onSubmitted?.()
      toast.success('Rating saved!')
    } catch {
      toast.error('Failed to submit rating')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="rounded-2xl border border-dossier-foreground/10 bg-dossier-panel/40 p-5 space-y-3">
      <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-dossier-foreground/40">
        Rate This Comic
      </p>

      {submitted ? (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map(n => (
              <Star
                key={n}
                size={22}
                className={rating >= n ? 'fill-amber-400 text-amber-400' : 'text-dossier-foreground/25'}
              />
            ))}
          </div>
          <p className="text-sm text-dossier-foreground/70">
            You rated this {rating}★. Want to add a written review too? Scroll down.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              disabled={submitting}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              onClick={() => handleRate(n)}
              aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
            >
              <Star
                size={26}
                className={
                  (hover || rating) >= n
                    ? 'fill-amber-400 text-amber-400'
                    : 'text-dossier-foreground/25'
                }
              />
            </button>
          ))}
          {submitting && <Loader2 size={16} className="animate-spin text-dossier-foreground/40 ml-2" />}
        </div>
      )}
    </div>
  )
}