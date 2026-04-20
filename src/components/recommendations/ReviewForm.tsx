'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { StarRating } from './StarRating'
import { toast } from 'sonner'
import { Loader2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const reviewFormSchema = z.object({
  content:           z.string().min(3, 'Review must be at least 3 characters').max(1000),
  contains_spoilers: z.boolean(),
})

type ReviewFormValues = z.infer<typeof reviewFormSchema>

interface Props {
  recommendationId: string
  onSuccess:        (review: ReviewWithProfile) => void
  existingReview?:  ReviewWithProfile | null
  onCancelEdit?:    () => void
}

export interface ReviewWithProfile {
  id:                 string
  user_id:            string
  recommendation_id:  string
  content:            string
  rating:             number | null
  contains_spoilers:  boolean
  is_approved:        boolean
  is_edited:          boolean
  edited_at:          string | null
  created_at:         string
  updated_at:         string
  profiles: {
    username:     string
    display_name: string | null
    avatar_url:   string | null
  } | null
}

// Structured prompt options — clicking inserts text into the review box
const PROMPTS: { label: string; question: string; options: string[]; freeText?: boolean }[] = [
  {
    label:    'Did you finish it?',
    question: 'Did you finish it?',
    options:  ['Yes, completed it', 'Still reading', 'Dropped it', 'On hiatus with it'],
  },
  {
    label:    'Best for?',
    question: 'Best for readers who enjoy',
    options:  ['Fast-paced action', 'Deep storytelling', 'Romance & drama', 'World-building', 'Comedy & light reads', 'Dark & mature themes'],
  },
  {
    label:    'Similar to?',
    question: 'Similar to',
    options:  [],
    freeText: true,
  },
]

export function ReviewForm({
  recommendationId,
  onSuccess,
  existingReview,
  onCancelEdit,
}: Props) {
  const [rating,          setRating]          = useState(existingReview?.rating ?? 0)
  const [submitting,      setSubmitting]       = useState(false)
  const [showPrompts,     setShowPrompts]      = useState(false)
  const [similarToText,   setSimilarToText]    = useState('')
  const isEditing = !!existingReview

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema) as any,
    defaultValues: {
      content:           existingReview?.content ?? '',
      contains_spoilers: existingReview?.contains_spoilers ?? false,
    },
  })

  const contentValue = watch('content') || ''
  const hasSpoilers  = watch('contains_spoilers')

  // Append a prompt snippet to the review textarea
  const appendPrompt = (snippet: string) => {
    const current = contentValue.trim()
    const divider = current ? '\n\n' : ''
    setValue('content', `${current}${divider}${snippet}`, { shouldValidate: true })
  }

  const handleOptionClick = (question: string, option: string) => {
    appendPrompt(`${question}: ${option}.`)
  }

  const handleSimilarTo = () => {
    if (!similarToText.trim()) return
    appendPrompt(`Similar to: ${similarToText.trim()}.`)
    setSimilarToText('')
  }

  const onSubmit = async (data: ReviewFormValues) => {
    setSubmitting(true)
    try {
      const url    = isEditing
        ? `/api/recommendations/${recommendationId}/reviews/${existingReview.id}`
        : `/api/recommendations/${recommendationId}/reviews`
      const method = isEditing ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...data, rating: rating || null }),
      })

      const result = await response.json()
      if (!response.ok) { toast.error(result.error || 'Failed to submit review'); return }

      toast.success(isEditing ? 'Review updated!' : 'Review submitted!')
      onSuccess(result.review)

      if (!isEditing) { reset(); setRating(0) }
      else onCancelEdit?.()
    } catch {
      toast.error('Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

      {/* Star rating */}
      <div className="space-y-1.5">
        <Label>Rating (optional)</Label>
        <StarRating value={rating} onChange={setRating} />
      </div>

      {/* Review text */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="review-content">
            Your Review <span className="text-destructive">*</span>
          </Label>
          <span className="text-xs text-muted-foreground">{contentValue.length}/1000</span>
        </div>
        <Textarea
          id="review-content"
          {...register('content')}
          placeholder="Share your thoughts about this comic..."
          rows={4}
          className="resize-none"
        />
        {errors.content && (
          <p className="text-xs text-destructive">{errors.content.message}</p>
        )}
      </div>

      {/* Structured prompts — collapsible */}
      <div className="rounded-xl border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setShowPrompts(v => !v)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          <span>✨ Need inspiration? Use a prompt</span>
          {showPrompts ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {showPrompts && (
          <div className="px-3.5 pb-3.5 pt-1 space-y-4 border-t border-border bg-muted/20">
            {PROMPTS.map(({ label, question, options, freeText }) => (
              <div key={label} className="space-y-1.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {label}
                </p>

                {options.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {options.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleOptionClick(question, opt)}
                        className="px-2.5 py-1 rounded-full text-xs border border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {freeText && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={similarToText}
                      onChange={e => setSimilarToText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSimilarTo())}
                      placeholder="e.g. Solo Leveling, Tower of God…"
                      className="flex-1 h-8 text-xs bg-card border border-border rounded-lg px-3 outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
                    />
                    <button
                      type="button"
                      onClick={handleSimilarTo}
                      disabled={!similarToText.trim()}
                      className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            ))}

            <p className="text-[10px] text-muted-foreground/60">
              Clicking a prompt appends it to your review. Edit freely after.
            </p>
          </div>
        )}
      </div>

      {/* Spoiler toggle */}
      <label className={cn(
        'flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors',
        hasSpoilers ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-border hover:border-primary/50'
      )}>
        <input
          type="checkbox"
          {...register('contains_spoilers')}
          className="w-4 h-4 accent-yellow-500"
        />
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className={hasSpoilers ? 'text-yellow-500' : 'text-muted-foreground'} />
          <span className="text-sm font-medium">Contains spoilers</span>
        </div>
      </label>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        {isEditing && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancelEdit} disabled={submitting}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={submitting} className="gap-2 min-w-28">
          {submitting
            ? <><Loader2 size={13} className="animate-spin" />Submitting...</>
            : isEditing ? 'Update Review' : 'Post Review'
          }
        </Button>
      </div>
    </form>
  )
}