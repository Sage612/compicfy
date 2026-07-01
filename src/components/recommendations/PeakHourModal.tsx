'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Zap, Clock, BookmarkPlus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Props {
  isOpen:      boolean
  onClose:     () => void
  onSaveDraft: () => Promise<void>
  messageType: 'peak_spike' | 'peak_cap'
}

export function PeakHourModal({ isOpen, onClose, onSaveDraft, messageType }: Props) {
  const [saving, setSaving] = useState(false)

  if (!isOpen) return null

  const handleSaveDraft = async () => {
    setSaving(true)
    try {
      await onSaveDraft()
      toast.success('Saved to drafts! You can submit when traffic eases.')
      onClose()
    } catch {
      toast.error('Failed to save draft')
    } finally {
      setSaving(false)
    }
  }

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
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Zap size={17} className="text-amber-500" />
            </div>
            <div>
              <p className="font-black text-sm">
                {messageType === 'peak_cap'
                  ? "We're at capacity right now"
                  : "High activity detected"
                }
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {messageType === 'peak_cap'
                  ? "ComPicfy is experiencing a surge in submissions. Your recommendation is ready save it as a draft and submit when things quiet down."
                  : "We're seeing a spike in submissions right now. To keep quality high, you can save your recommendation as a draft and try submitting later."
                }
              </p>
            </div>
          </div>

          {/* Peak hour indicator */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-border">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              <span className="font-semibold text-foreground">Peak hours</span> usually last 1–2 hours. Drafts are saved indefinitely.
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
              Try Later
            </Button>
            <Button
              size="sm"
              onClick={handleSaveDraft}
              disabled={saving}
              className="flex-1 gap-1.5 text-xs h-9 bg-amber-500 hover:bg-amber-600 border-0 text-white"
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