'use client'

import { useState } from 'react'
import { Star, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  recommendationId: string
  isLoggedIn:        boolean
  onSubmitted?:      () => void
}

/**
 * Rating-only submission — sends rating_only: true so the API route
 * skips the full review schema (which requires 3+ chars of content) and
 * inserts a review row with empty content instead. See the route's
 * rating_only branch for details.
 */
export function QuickRatingCard({ recommendationId, isLoggedIn, onSubmitted }: Props) {
  const [rating,     setRating]     = useState(0)
  const [hover,       setHover]     = useState(0)
  const [submitting,  setSubmitting] = useState(false)
  const [submitted,   setSubmitted]  = useState(false)

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
        <p className="text-sm text-dossier-foreground/70">
          Thanks — your rating is saved. Want to add a written review too? Scroll down.
        </p>
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