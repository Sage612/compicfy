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
import { Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const reviewFormSchema = z.object({
  content: z.string().min(3, 'Review must be at least 3 characters').max(1000),
  contains_spoilers: z.boolean(),
})

type ReviewFormValues = z.infer<typeof reviewFormSchema>

interface Props {
  recommendationId: string
  onSuccess: (review: ReviewWithProfile) => void
  existingReview?: ReviewWithProfile | null
  onCancelEdit?: () => void
}

export interface ReviewWithProfile {
  id: string
  user_id: string
  recommendation_id: string
  content: string
  rating: number | null
  contains_spoilers: boolean
  is_approved: boolean
  is_edited: boolean
  edited_at: string | null
  created_at: string
  updated_at: string
  profiles: {
    username: string
    display_name: string | null
    avatar_url: string | null
  } | null
}

export function ReviewForm({
  recommendationId,
  onSuccess,
  existingReview,
  onCancelEdit,
}: Props) {
  const [rating, setRating] = useState(existingReview?.rating ?? 0)
  const [submitting, setSubmitting] = useState(false)
  const isEditing = !!existingReview

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema) as any,
    defaultValues: {
      content: existingReview?.content ?? '',
      contains_spoilers: existingReview?.contains_spoilers ?? false,
    },
  })

  const contentValue = watch('content') || ''
  const hasSpoilers = watch('contains_spoilers')

  const onSubmit = async (data: ReviewFormValues) => {
    setSubmitting(true)
    try {
      const url = isEditing
        ? `/api/recommendations/${recommendationId}/reviews/${existingReview.id}`
        : `/api/recommendations/${recommendationId}/reviews`

      const method = isEditing ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, rating: rating || null }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Failed to submit review')
        return
      }

      toast.success(isEditing ? 'Review updated!' : 'Review submitted!')
      onSuccess(result.review)

      if (!isEditing) {
        reset()
        setRating(0)
      } else {
        onCancelEdit?.()
      }
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
          <span className="text-xs text-muted-foreground">
            {contentValue.length}/1000
          </span>
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

      {/* Spoiler toggle */}
      <label className={cn(
        'flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer transition-colors',
        hasSpoilers
          ? 'border-yellow-500/50 bg-yellow-500/5'
          : 'border-border hover:border-primary/50'
      )}>
        <input
          type="checkbox"
          {...register('contains_spoilers')}
          className="w-4 h-4 accent-yellow-500"
        />
        <div className="flex items-center gap-2">
          <AlertTriangle
            size={14}
            className={hasSpoilers ? 'text-yellow-500' : 'text-muted-foreground'}
          />
          <span className="text-sm font-medium">Contains spoilers</span>
        </div>
      </label>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        {isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancelEdit}
            disabled={submitting}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={submitting} className="gap-2 min-w-28">
          {submitting ? (
            <><Loader2 size={13} className="animate-spin" />Submitting...</>
          ) : isEditing ? (
            'Update Review'
          ) : (
            'Post Review'
          )}
        </Button>
      </div>
    </form>
  )
}