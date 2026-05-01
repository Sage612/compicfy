'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { StarRating } from './StarRating'
import { ReviewForm, type ReviewWithProfile } from './ReviewForm'
import { AuthPromptModal } from '@/components/ui/auth-prompt-modal'
import { toast } from 'sonner'
import {
  AlertTriangle, Eye, EyeOff, Pencil, Trash2, ThumbsUp, Flag,
  X, Loader2,
} from 'lucide-react'
import { timeAgo } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

interface Props {
  review:           ReviewWithProfile
  currentUserId:    string | null
  recommendationId: string
  onUpdate:         (updated: ReviewWithProfile) => void
  onDelete:         (id: string) => void
}

const REPORT_REASONS = [
  { value: 'spam',           label: 'Spam'            },
  { value: 'inappropriate',  label: 'Inappropriate'   },
  { value: 'misinformation', label: 'Misinformation'  },
  { value: 'piracy',         label: 'Piracy'          },
  { value: 'harassment',     label: 'Harassment'      },
  { value: 'other',          label: 'Other'           },
]

// ── Inline report modal ───────────────────────────────────────────
function ReportModal({
  onClose,
  onSubmit,
  submitting,
}: {
  onClose:    () => void
  onSubmit:   (reason: string, details: string) => Promise<void>
  submitting: boolean
}) {
  const [reason,  setReason]  = useState('')
  const [details, setDetails] = useState('')

  const handleSubmit = async () => {
    if (!reason) { toast.error('Please select a reason'); return }
    await onSubmit(reason, details)
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-2xl p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center">
              <Flag size={13} className="text-destructive" />
            </div>
            <h3 className="text-sm font-black">Report Review</h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <X size={15} />
          </button>
        </div>

        {/* Reason selector */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Reason <span className="text-destructive">*</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {REPORT_REASONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setReason(value)}
                className={cn(
                  'px-3 py-2 rounded-xl border text-xs font-semibold text-left transition-all',
                  reason === value
                    ? 'bg-destructive/10 border-destructive/50 text-destructive'
                    : 'border-border text-muted-foreground hover:border-destructive/30 hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Details field */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Additional details
            <span className="text-muted-foreground/60 font-normal ml-1">(optional)</span>
          </label>
          <textarea
            value={details}
            onChange={e => setDetails(e.target.value)}
            placeholder="Explain why you're reporting this review…"
            rows={3}
            maxLength={500}
            className={cn(
              'w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5',
              'text-sm placeholder:text-muted-foreground outline-none',
              'focus:border-primary transition-colors'
            )}
          />
          <p className="text-[10px] text-muted-foreground text-right">{details.length}/500</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="flex-1 gap-1.5 bg-destructive hover:bg-destructive/90 border-0 text-white"
            onClick={handleSubmit}
            disabled={submitting || !reason}
          >
            {submitting
              ? <><Loader2 size={12} className="animate-spin" /> Submitting…</>
              : <><Flag size={12} /> Submit Report</>
            }
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── ReviewCard ────────────────────────────────────────────────────
export function ReviewCard({
  review,
  currentUserId,
  recommendationId,
  onUpdate,
  onDelete,
}: Props) {
  const [isEditing,        setIsEditing]        = useState(false)
  const [showSpoiler,      setShowSpoiler]       = useState(false)
  const [deleting,         setDeleting]          = useState(false)
  const [helpful,          setHelpful]           = useState(0)
  const [hasMarkedHelpful, setHasMarkedHelpful]  = useState(false)
  const [showReportModal,  setShowReportModal]   = useState(false)
  const [reportSubmitting, setReportSubmitting]  = useState(false)

  // Auth modal state
  const [showAuth,   setShowAuth]   = useState(false)
  const [authAction, setAuthAction] = useState<'helpful' | 'report'>('helpful')

  const isOwner  = currentUserId === review.user_id
  const profile  = review.profiles
  const initials = (profile?.display_name || profile?.username || 'U')
    .slice(0, 2).toUpperCase()

  const requireAuth = (action: 'helpful' | 'report', fn: () => void) => {
    if (!currentUserId) {
      setAuthAction(action)
      setShowAuth(true)
      return
    }
    fn()
  }

  const handleDelete = async () => {
    if (!confirm('Delete this review?')) return
    setDeleting(true)
    try {
      const res = await fetch(
        `/api/recommendations/${recommendationId}/reviews/${review.id}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error()
      toast.success('Review deleted')
      onDelete(review.id)
    } catch {
      toast.error('Failed to delete review')
      setDeleting(false)
    }
  }

  const handleHelpful = () => {
    requireAuth('helpful', () => {
      if (hasMarkedHelpful) {
        setHelpful(h => h - 1)
        setHasMarkedHelpful(false)
      } else {
        setHelpful(h => h + 1)
        setHasMarkedHelpful(true)
      }
    })
  }

  const handleReportClick = () => {
    requireAuth('report', () => setShowReportModal(true))
  }

  const handleReportSubmit = async (reason: string, details: string) => {
    setReportSubmitting(true)
    try {
      const res = await fetch('/api/reports', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          entity_type: 'review',
          entity_id:   review.id,
          reason,
          details:     details.trim() || null,
        }),
      })

      if (res.status === 409) {
        toast.info('You\'ve already reported this review')
        setShowReportModal(false)
        return
      }
      if (!res.ok) throw new Error()

      toast.success('Report submitted — thank you')
      setShowReportModal(false)
    } catch {
      toast.error('Failed to submit report')
    } finally {
      setReportSubmitting(false)
    }
  }

  const authConfig = authAction === 'helpful'
    ? { action: 'mark reviews as helpful', icon: <ThumbsUp size={24} className="text-primary" /> }
    : { action: 'report content',          icon: <Flag     size={24} className="text-destructive" /> }

  if (isEditing) {
    return (
      <div className="p-4 rounded-xl border border-primary/30 bg-card space-y-4">
        <p className="text-sm font-medium text-muted-foreground">Editing your review</p>
        <ReviewForm
          recommendationId={recommendationId}
          onSuccess={(updated) => { onUpdate(updated); setIsEditing(false) }}
          existingReview={review}
          onCancelEdit={() => setIsEditing(false)}
        />
      </div>
    )
  }

  return (
    <>
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
                variant="ghost" size="icon" className="h-7 w-7"
                onClick={() => setIsEditing(true)}
                aria-label="Edit review"
              >
                <Pencil size={13} />
              </Button>
              <Button
                variant="ghost" size="icon"
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
        {review.rating && <StarRating value={review.rating} readonly size={15} />}

        {/* Spoiler warning */}
        {review.contains_spoilers && !showSpoiler ? (
          <div className="flex flex-col items-center gap-2 py-4 px-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
            <div className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle size={16} />
              <span className="text-sm font-medium">Spoiler Warning</span>
            </div>
            <Button
              variant="outline" size="sm"
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
              onClick={handleReportClick}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-destructive/50 hover:text-destructive transition-colors"
            >
              <Flag size={11} />
              Report
            </button>
          )}
        </div>
      </div>

      {/* Report modal */}
      {showReportModal && (
        <ReportModal
          onClose={() => setShowReportModal(false)}
          onSubmit={handleReportSubmit}
          submitting={reportSubmitting}
        />
      )}

      {/* Auth prompt */}
      <AuthPromptModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        config={authConfig}
      />
    </>
  )
}