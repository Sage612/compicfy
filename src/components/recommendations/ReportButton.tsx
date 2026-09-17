'use client'

import { useState } from 'react'
import { Flag, X, ChevronDown, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { AuthPromptModal } from '@/components/ui/auth-prompt-modal'

const REPORT_REASONS = [
  { value: 'wrong_info',      label: 'Incorrect information'       },
  { value: 'duplicate',       label: 'Duplicate recommendation'    },
  { value: 'spam',            label: 'Spam or advertisement'       },
  { value: 'inappropriate',   label: 'Inappropriate content'       },
  { value: 'wrong_platform',  label: 'Wrong platform listed'       },
  { value: 'broken_links',    label: 'Broken or wrong links'       },
  { value: 'other',           label: 'Other'                       },
]

// A separate, tag-specific reason set — "duplicate recommendation" and
// "wrong platform listed" don't make sense for a bad tag assignment.
// Kept short and relevant to what a tag report is actually ever about:
// the tag is wrong for this comic, or it's abusive/spam.
const TAG_REPORT_REASONS = [
  { value: 'irrelevant_tag', label: "Doesn't apply to this comic" },
  { value: 'spam',           label: 'Spam or abusive tag'         },
  { value: 'duplicate_tag',  label: 'Duplicate of another tag'    },
  { value: 'other',          label: 'Other'                       },
]

// entityType-to-display-label — extend here, not with more inline
// ternaries, whenever ReportButton needs to support another entity.
const ENTITY_LABELS: Record<Props['entityType'], string> = {
  recommendation:     'Recommendation',
  review:              'Review',
  recommendation_tag: 'Tag',
}

interface Props {
  entityType: 'recommendation' | 'review' | 'recommendation_tag'
  entityId:   string
  isLoggedIn: boolean
  compact?:   boolean
  /**
   * Renders as a full bordered button matching ShareButton's non-compact
   * style, instead of the bare text link. Used when Report is paired in
   * a button row (e.g. next to Share in the action deck) so the two
   * visually match instead of one being a tiny inline link next to a
   * real button. Does not affect the existing `compact` byline usage.
   */
  asButton?: boolean
}

export function ReportButton({ entityType, entityId, isLoggedIn, compact = false, asButton = false }: Props) {
  const [open,         setOpen]         = useState(false)
  const [reason,       setReason]       = useState('')
  const [details,      setDetails]      = useState('')
  const [submitting,   setSubmitting]   = useState(false)
  const [submitted,    setSubmitted]    = useState(false)
  const [authPrompt,   setAuthPrompt]   = useState(false)

  const reasons = entityType === 'recommendation_tag' ? TAG_REPORT_REASONS : REPORT_REASONS

  const handleOpen = () => {
    if (!isLoggedIn) { setAuthPrompt(true); return }
    setOpen(true)
  }

  const handleSubmit = async () => {
    if (!reason) { toast.error('Please select a reason'); return }
    setSubmitting(true)
    try {
      const res = await fetch('/api/reports', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          entity_type: entityType,
          entity_id:   entityId,
          reason,
          details:     details.trim() || null,
        }),
      })
      const data = await res.json()

      if (res.status === 409) {
        toast.info('You already reported this')
        setOpen(false)
        return
      }
      if (!res.ok) throw new Error(data.error)

      setSubmitted(true)
      setTimeout(() => { setOpen(false); setSubmitted(false); setReason(''); setDetails('') }, 2000)
    } catch {
      toast.error('Failed to submit report')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {asButton ? (
        <button
          onClick={handleOpen}
          className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2 h-9 rounded-xl border border-border bg-card text-xs font-semibold text-muted-foreground hover:text-destructive hover:border-destructive/30 shadow-sm transition-all active:scale-95"
          title="Report this content"
        >
          <Flag size={14} />
          <span>Report</span>
        </button>
      ) : (
        <button
          onClick={handleOpen}
          className={cn(
            'inline-flex items-center gap-1.5 text-muted-foreground hover:text-destructive transition-colors',
            compact ? 'text-[10px]' : 'text-xs'
          )}
          title="Report this content"
        >
          <Flag size={compact ? 10 : 12} />
          {!compact && <span>Report</span>}
        </button>
      )}

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border bg-card shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-destructive/5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <Flag size={11} className="text-destructive" />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-destructive">
                  Report {ENTITY_LABELS[entityType]}
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={14} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {submitted ? (
                <div className="flex flex-col items-center gap-3 py-4 text-center">
                  <CheckCircle2 size={32} className="text-emerald-500" />
                  <div>
                    <p className="font-black text-sm">Report submitted</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Our team will review this shortly.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Reason select */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Reason <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <select
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        className="w-full appearance-none h-10 px-3 pr-8 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                      >
                        <option value="">Select a reason…</option>
                        {reasons.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    </div>
                  </div>

                  {/* Optional details */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Additional details <span className="text-muted-foreground/50">(optional)</span>
                    </label>
                    <textarea
                      value={details}
                      onChange={e => setDetails(e.target.value)}
                      placeholder="Help us understand the issue…"
                      rows={3}
                      maxLength={500}
                      className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                    />
                    <p className="text-[10px] text-muted-foreground text-right">{details.length}/500</p>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setOpen(false)}
                      className="flex-1 h-9 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSubmit}
                      disabled={!reason || submitting}
                      className="flex-1 h-9 text-xs gap-1.5 bg-destructive hover:bg-destructive/90 border-0 text-white"
                    >
                      {submitting
                        ? <Loader2 size={12} className="animate-spin" />
                        : <Flag size={12} />
                      }
                      {submitting ? 'Submitting…' : 'Submit Report'}
                    </Button>
                  </div>

                  <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                    False reports may result in account restrictions.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <AuthPromptModal
        open={authPrompt}
        onClose={() => setAuthPrompt(false)}
        config={{
          action: 'report this content',
          icon:   <Flag size={24} className="text-destructive" />,
        }}
      />
    </>
  )
}