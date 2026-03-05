'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Loader2, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'


interface Props {
  userId: string
  initialEnabled: boolean
}

export function AdultContentToggle({ userId, initialEnabled }: Props) {
  const supabase = createClient()
  const [enabled, setEnabled] = useState(initialEnabled)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
 const [confirmed, setConfirmed] = useState(false)
  const [ageInput, setAgeInput] = useState('')
  const ageValid = parseInt(ageInput) >= 18

  const ariaChecked = enabled ? "true" : "false" as const

  // User clicks the toggle ON
  async function handleToggleOn() {
    // Must go through confirmation modal first
    setShowConfirm(true)
  }

  // User clicks the toggle OFF — no confirmation needed
  async function handleToggleOff() {
    setSaving(true)
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          adult_content_enabled: false,
          adult_content_enabled_at: null,
        })
        .eq('id', userId)

      if (error) throw error
      setEnabled(false)
      toast.success('Adult content disabled')
    } catch {
      toast.error('Failed to update preference')
    } finally {
      setSaving(false)
    }
  }

  // User confirmed they are 18+ inside the modal
  async function handleConfirm() {
    if (!confirmed) {
      toast.error('Please check the confirmation box first')
      return
    }

    setSaving(true)
    try {
      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          adult_content_enabled: true,
          adult_content_enabled_at: new Date().toISOString(),
        })
        .eq('id', userId)

      if (error) throw error
      setEnabled(true)
      setShowConfirm(false)
      setConfirmed(false)
      toast.success('Adult content enabled')
    } catch {
      toast.error('Failed to update preference')
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setShowConfirm(false)
    setConfirmed(false)
    setAgeInput('')
    }
    
  return (
    <>
      <Separator />

      <div className="space-y-4">
        {/* Section header */}
        <div className="flex items-start gap-3">
          <ShieldAlert size={20} className="text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <h2 className="text-base font-semibold">Adult Content</h2>
            <p className="text-sm text-muted-foreground">
              Enable to see 18+ manga, manhwa, and webtoons on the browse page.
              You must be 18 or older to enable this.
            </p>
          </div>
        </div>

        {/* Toggle row */}
        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3">
          <div>
            <p className="text-sm font-medium">Show adult content</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {enabled
                ? 'Adult content is currently visible in browse'
                : 'Adult content is currently hidden'}
            </p>
          </div>

          {/* Toggle switch */}
          <button
            type="button"
            role="switch"
            aria-checked={ariaChecked}
            aria-label={enabled ? "Disable adult content" : "Enable adult content"}
            disabled={saving}
            onClick={enabled ? handleToggleOff : handleToggleOn}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
              enabled ? "bg-foreground" : "bg-input"
            )}
          >
            <span
              className={cn(
                "pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform",
                enabled ? "translate-x-5" : "translate-x-0"
              )}
            />
          </button>
        </div>
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={handleCancel}
          />

          {/* Modal */}
          <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-background p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <ShieldAlert size={20} className="text-destructive" />
              </div>
              <div>
                <h3 className="text-base font-semibold">Age Confirmation Required</h3>
                <p className="text-xs text-muted-foreground">This content is for adults only</p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              Adult content includes explicit themes and mature subject matter.
              By enabling this, you confirm that you are 18 years of age or older
              and legally permitted to view such content in your jurisdiction.
                      </p>
                      
 {/* Age input */}
            <div className="mb-4 space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Enter your age to confirm
              </label>
              <input
                type="number"
                min={1}
                max={120}
                placeholder="Your age"
                value={ageInput}
                onChange={(e) => setAgeInput(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              {ageInput && !ageValid && (
                <p className="text-xs text-destructive">
                  You must be 18 or older to enable adult content.
                </p>
              )}
              {ageInput && ageValid && (
                <p className="text-xs text-green-600 dark:text-green-400">
                  ✓ Age confirmed
                </p>
              )}
            </div>

            {/* Checkbox confirmation */}
            <label className="flex items-start gap-3 mb-6 cursor-pointer group">
                         
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`h-4 w-4 rounded border-2 flex items-center justify-center transition-colors ${
                    confirmed
                      ? 'bg-foreground border-foreground'
                      : 'border-border group-hover:border-foreground'
                  }`}
                >
                  {confirmed && (
                    <svg className="h-2.5 w-2.5 text-background" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-sm leading-relaxed">
                I confirm I am <strong>18 years of age or older</strong> and understand
                I am enabling adult content on my account.
              </span>
            </label>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={saving || !confirmed || !ageValid}
                className="flex-1 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Confirm & Enable'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}