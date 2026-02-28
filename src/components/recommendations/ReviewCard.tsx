'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { StarRating } from './StarRating'
import { ReviewForm, type ReviewWithProfile } from './ReviewForm'
import { toast } from 'sonner'
import {
  AlertTriangle,
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  ThumbsUp,
  Flag,
} from 'lucide-react'
import { timeAgo } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

interface Props {
  review: ReviewWithProfile
  currentUserId: string | null
  recommendationId: string
  onUpdate: (updated: ReviewWithProfile) => void
  onDelete: (id: string) => void
}

export function ReviewCard({
  review,
  currentUserId,
  recommendationId,
  onUpdate,
  onDelete,
}: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [showSpoiler, setShowSpoiler] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [helpful, setHelpful] = useState(0)
  const [hasMarkedHelpful, setHasMarkedHelpful] = useState(false)

  const isOwner = currentUserId === review.user_id
  const profile = review.profiles

  const initials = (profile?.display_name || profile?.username || 'U')
    .slice(0, 2)
    .toUpperCase()

  const handleDelete = async () => {
    if (!confirm('Delete this review?')) return
    setDeleting(true)
    try {
      const response = await fetch(
        `/api/recommendations/${recommendationId}/reviews/${review.id}`,
        { method: 'DELETE' }
      )
      if (!response.ok) throw new Error()
      toast.success('Review deleted')
      onDelete(review.id)
    } catch {
      toast.error('Failed to delete review')
      setDeleting(false)
    }
  }

  const handleHelpful = () => {
    if (hasMarkedHelpful) {
      setHelpful(h => h - 1)
      setHasMarkedHelpful(false)
    } else {
      setHelpful(h => h + 1)
      setHasMarkedHelpful(true)
    }
  }

  const handleReport = () => {
    toast.info('Report submitted. Thank you!')
  }

  if (isEditing) {
    return (
      <div className="p-4 rounded-xl border border-primary/30 bg-card space-y-4">
        <p className="text-sm font-medium text-muted-foreground">Editing your review</p>
        <ReviewForm
          recommendationId={recommendationId}
          onSuccess={(updated) => {
            onUpdate(updated)
            setIsEditing(false)
          }}
          existingReview={review}
          onCancelEdit={() => setIsEditing(false)}
        />
      </div>
    )
  }

  return (
    <div className="p-4 rounded-xl border border-border bg-card space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold leading-none">
              {profile?.display_name || profile?.username}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-muted-foreground">{timeAgo(review.created_at)}</p>
              {review.is_edited && (
                <span className="text-xs text-muted-foreground italic">(edited)</span>
              )}
            </div>
          </div>
        </div>

        {/* Owner actions */}
        {isOwner && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsEditing(true)}
              aria-label="Edit review"
            >
              <Pencil size={13} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Delete review"
            >
              <Trash2 size={13} />
            </Button>
          </div>
        )}
      </div>

      {/* Star rating */}
      {review.rating && (
        <StarRating value={review.rating} readonly size={15} />
      )}

      {/* Spoiler warning */}
      {review.contains_spoilers && !showSpoiler ? (
        <div className="flex flex-col items-center gap-2 py-4 px-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
          <div className="flex items-center gap-2 text-yellow-600">
            <AlertTriangle size={16} />
            <span className="text-sm font-medium">Spoiler Warning</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSpoiler(true)}
            className="gap-1.5 h-7 text-xs border-yellow-500/30"
          >
            <Eye size={12} />
            Show anyway
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {review.contains_spoilers && (
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-yellow-600">
                <AlertTriangle size={11} />
                Contains spoilers
              </span>
              <button
                onClick={() => setShowSpoiler(false)}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <EyeOff size={11} />
                Hide
              </button>
            </div>
          )}
          <p className="text-sm leading-relaxed text-muted-foreground">{review.content}</p>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleHelpful}
          className={cn(
            'flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-colors',
            hasMarkedHelpful
              ? 'bg-primary/10 border-primary/30 text-primary'
              : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
          )}
        >
          <ThumbsUp size={11} />
          Helpful {helpful > 0 && `(${helpful})`}
        </button>

        {!isOwner && (
          <button
            onClick={handleReport}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive transition-colors"
          >
            <Flag size={11} />
            Report
          </button>
        )}
      </div>
    </div>
  )
}