'use client'

import { useState } from 'react'
import { ArrowLeft, Check, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  TRACKING_STATUSES,
  TRACKING_STATUS_META,
  TRACKING_SUB_STATUS_CUSTOM_MAX_LENGTH,
} from '@/lib/utils/constants'

interface Props {
  currentStatus:    string
  currentSubStatus: string | null
  saving:           boolean
  onConfirm:        (status: string, subStatus: string | null) => void
  onClose:          () => void
}

export function StatusSubStatusModal({ currentStatus, currentSubStatus, saving, onConfirm, onClose }: Props) {
  const [pendingStatus, setPendingStatus] = useState<string | null>(null)
  const [showCustom,    setShowCustom]    = useState(false)
  const [customText,    setCustomText]    = useState('')

  const pendingMeta = pendingStatus ? TRACKING_STATUS_META[pendingStatus as keyof typeof TRACKING_STATUS_META] : null

  const handleCustomSubmit = () => {
    const trimmed = customText.trim()
    if (!trimmed || !pendingStatus) return
    onConfirm(pendingStatus, trimmed.slice(0, TRACKING_SUB_STATUS_CUSTOM_MAX_LENGTH))
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xs rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {!pendingStatus ? (
          /* ── Step 1: status list ── */
          <div className="p-2">
            <div className="flex items-center justify-between px-2 py-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Status
              </p>
              <button onClick={onClose} className="text-muted-foreground/50 hover:text-foreground transition-colors">
                <X size={14} />
              </button>
            </div>
            <div className="space-y-0.5">
              {TRACKING_STATUSES.map(({ value }) => {
                const meta = TRACKING_STATUS_META[value]
                return (
                  <button
                    key={value}
                    onClick={() => setPendingStatus(value)}
                    disabled={saving}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all text-left',
                      currentStatus === value
                        ? cn('border', meta.badge)
                        : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <span className="text-base leading-none w-5 text-center shrink-0">{meta.emoji}</span>
                    <span className="flex-1">{meta.label}</span>
                    {currentStatus === value && <Check size={13} className="shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          /* ── Step 2: sub-status picker ── */
          <div className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <button
                onClick={() => { setPendingStatus(null); setShowCustom(false); setCustomText('') }}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft size={11} />
                Back
              </button>
              <button onClick={onClose} className="text-muted-foreground/50 hover:text-foreground transition-colors">
                <X size={14} />
              </button>
            </div>

            <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground px-1">
              <span>{pendingMeta!.emoji}</span>
              {pendingMeta!.label} — add detail? <span className="font-normal text-muted-foreground">(optional)</span>
            </p>

            {!showCustom ? (
              <div className="space-y-1">
                {pendingMeta!.subStatusPresets.map(preset => (
                  <button
                    key={preset.value}
                    onClick={() => onConfirm(pendingStatus, preset.value)}
                    disabled={saving}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all"
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  onClick={() => setShowCustom(true)}
                  disabled={saving}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all"
                >
                  Custom…
                </button>
                <button
                  onClick={() => onConfirm(pendingStatus, null)}
                  disabled={saving}
                  className="w-full text-center px-3 py-2 rounded-xl text-xs text-muted-foreground/60 hover:text-muted-foreground transition-all"
                >
                  {saving ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Skip'}
                </button>
              </div>
            ) : (
              <div className="space-y-2 px-1">
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={customText}
                    onChange={e => setCustomText(e.target.value.slice(0, TRACKING_SUB_STATUS_CUSTOM_MAX_LENGTH))}
                    onKeyDown={e => e.key === 'Enter' && handleCustomSubmit()}
                    placeholder="e.g. Waiting for the anime to catch up"
                    className="flex-1 h-8 text-xs bg-muted border border-border rounded-lg px-2.5 outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
                  />
                  <button
                    onClick={() => setShowCustom(false)}
                    className="text-muted-foreground/60 hover:text-foreground transition-colors shrink-0"
                  >
                    <X size={13} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground/50">
                    {customText.length}/{TRACKING_SUB_STATUS_CUSTOM_MAX_LENGTH}
                  </span>
                  <button
                    onClick={handleCustomSubmit}
                    disabled={saving || !customText.trim()}
                    className="h-7 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center gap-1.5"
                  >
                    {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                    Save
                  </button>
                </div>
              </div>
            )}

            {currentSubStatus && !showCustom && (
              <button
                onClick={() => onConfirm(pendingStatus, null)}
                disabled={saving}
                className="w-full text-center pt-1 text-[11px] text-muted-foreground/40 hover:text-destructive transition-colors"
              >
                Clear existing detail
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}