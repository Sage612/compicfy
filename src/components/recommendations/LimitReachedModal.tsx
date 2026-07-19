'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CalendarClock, Clock, BookmarkPlus, X, ThumbsUp, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import Link from 'next/link'

interface Props {
  isOpen:      boolean
  onClose:     () => void
  onSaveDraft: () => Promise<void>
  /** 'daily' resets at midnight tonight. 'monthly' resets on the 1st of next month. */
  limitType:   'daily' | 'monthly'
}

function getResetLabel(limitType: 'daily' | 'monthly'): string {
  if (limitType === 'daily') {
    const midnight = new Date()
    midnight.setHours(24, 0, 0, 0)
    return `Resets at midnight (${midnight.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })})`
  }
  const firstOfNextMonth = new Date()
  firstOfNextMonth.setMonth(firstOfNextMonth.getMonth() + 1, 1)
  firstOfNextMonth.setHours(0, 0, 0, 0)
  return `Resets ${firstOfNextMonth.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}`
}

export function LimitReachedModal({ isOpen, onClose, onSaveDraft, limitType }: Props) {
  const [saving, setSaving] = useState(false)
  if (!isOpen) return null

  const handleSaveDraft = async () => {
    setSaving(true)
    try {
      await onSaveDraft()
      toast.success('Saved to drafts! Submit it once your limit resets.')
      onClose()
    } catch {
      toast.error('Failed to save draft')
    } finally {
      setSaving(false)
    }
  }

  const resetLabel = getResetLabel(limitType)

  return (
    // Backdrop
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal */}
      <div className={cn(
        'relative w-full max-w-sm rounded-2xl border bg-card shadow-2xl',
        'animate-in fade-in slide-in-from-bottom-4 duration-300'
      )}>
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X size={14} />
        </button>
        <div className="p-5 space-y-4">
          {/* Icon + heading */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <CalendarClock size={17} className="text-primary" />
            </div>
            <div>
              <p className="font-black text-sm">
                {limitType === 'daily'
                  ? "You've reached today's submission limit"
                  : "You've reached this month's submission limit"
                }
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {resetLabel}. Your recommendation isn't lost, save it as a draft and submit it the moment your limit resets.
              </p>
            </div>
          </div>

          {/* In the meantime */}
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-muted/50 border border-border">
            <ThumbsUp size={13} className="text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              In the meantime, upvoting and reviewing comics is unlimited and helps the community discover great titles too.
            </p>
          </div>

          {/* Score system teaser */}
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/15">
            <Sparkles size={13} className="text-primary shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              We're building a contribution score system so active community members unlock higher submission limits over time.{' '}
              <Link href="/guidelines#submission-limits" className="font-semibold text-primary hover:underline">
                Learn more
              </Link>
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="flex-1 gap-1.5 text-xs h-9"
            >
              <Clock size={12} />
              Okay
            </Button>
            <Button
              size="sm"
              onClick={handleSaveDraft}
              disabled={saving}
              className="flex-1 gap-1.5 text-xs h-9"
            >
              <BookmarkPlus size={12} />
              {saving ? 'Saving…' : 'Save as Draft'}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            Find your drafts in Dashboard → Recommendations → Drafts tab
          </p>
        </div>
      </div>
    </div>
  )
}