'use client'

import { useState, useEffect, useRef } from 'react'
import { Croissant, ChevronDown, Check, Loader2, ArrowLeft, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { AuthPromptModal } from '@/components/ui/auth-prompt-modal'
import { useRouter } from 'next/navigation'
import {
  FREE_LIMITS,
  BAKE_MIN_TARGET_CHAPTERS,
  BAKE_MAX_TARGET_CHAPTERS,
  BAKE_COUNTING_MODES,
  type BakeCountingMode,
} from '@/lib/utils/constants'


interface ActiveBake {
  id: number
  target_chapter_count: number
  counting_mode: BakeCountingMode
  chapter_count_at_bake_start: number
  status: 'active' | 'fulfilled' | 'cleared'
}

interface Props {
  comicId:      string
  chapterCount: number | null
  isLoggedIn:   boolean
  isPro:        boolean
  /** Open in the page flow instead of floating (for use inside a sheet). */
  inline?:      boolean
}

export function BakeButton({ comicId, chapterCount, isLoggedIn, isPro, inline = false }: Props) {
  const router = useRouter()
  const [activeBake,   setActiveBake]   = useState<ActiveBake | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [saving,       setSaving]       = useState(false)
  const [open,         setOpen]         = useState(false)
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)

  // Step 1 -> 2 flow state, mirroring ReadingProgressButton's
  // pendingStatus/showCustom shape
  const [step,          setStep]          = useState<'mode' | 'target'>('mode')
  const [pendingMode,    setPendingMode]    = useState<BakeCountingMode | null>(null)
  const [targetInput,    setTargetInput]    = useState<string>('20')

  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setStep('mode')
        setPendingMode(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return }

    const load = async () => {
      try {
        const res = await fetch('/api/bakes')
        const data = await res.json()
        const bakes: ActiveBake[] = data.bakes ?? []
        // GET /api/bakes returns all of a user's active bakes - find the
        // one for THIS comic, if any. The route joins recommendations for
        // display purposes elsewhere; here we only need this comic's row.
        const thisComic = bakes.find((b: any) => b.recommendation_id === comicId) ?? null
        setActiveBake(thisComic)
      } catch {
        // Silent - a failed background fetch just means the button shows
        // its default "not baking yet" state, which is still correct to
        // offer even if we couldn't confirm current status.
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [comicId, isLoggedIn])

  const handleModeSelect = (mode: BakeCountingMode) => {
    if (!isLoggedIn) { toast.error('Sign in to bake a comic'); return }
    setPendingMode(mode)
    setStep('target')
  }

  const handleConfirmBake = async () => {
    if (!pendingMode) return
    const target = parseInt(targetInput, 10)
    if (!target || target < BAKE_MIN_TARGET_CHAPTERS || target > BAKE_MAX_TARGET_CHAPTERS) {
      toast.error(`Enter a target between ${BAKE_MIN_TARGET_CHAPTERS} and ${BAKE_MAX_TARGET_CHAPTERS} chapters`)
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/bakes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendation_id: comicId,
          target_chapter_count: target,
          counting_mode: pendingMode,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        // Surfaces the real free-tier-limit message from the route
        // (code: 'BAKE_LIMIT_REACHED') rather than a generic failure,
        // since that's an expected/actionable case, not a bug.
        throw new Error(data.error ?? 'Failed to start bake')
      }
      setActiveBake(data.bake)
      toast.success(`🍞 Baking — you'll be notified at +${target} chapters`)
      router.refresh()
      setOpen(false)
      setStep('mode')
      setPendingMode(null)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to start bake')
    } finally {
      setSaving(false)
    }
  }

  const handleClearBake = async () => {
    if (!activeBake) return
    setSaving(true)
    try {
      const res = await fetch(`/api/bakes?id=${activeBake.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setActiveBake(null)
      toast.success('Bake cleared')
      router.refresh()
      setOpen(false)
    } catch {
      toast.error('Failed to clear bake')
    } finally {
      setSaving(false)
    }
  }

  if (!isLoggedIn) {
    return (
      <>
        <AuthPromptModal
          open={showAuthPrompt}
          onClose={() => setShowAuthPrompt(false)}
          config={{
            action: 'bake a comic and get notified when it\'s ready to binge',
            icon: <Croissant size={24} className="text-primary" />,
          }}
        />
        <button
          onClick={() => setShowAuthPrompt(true)}
          className="flex items-center justify-center gap-2 w-full h-10 px-4 rounded-xl border border-border bg-card text-sm font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary transition-all"
        >
          <Croissant size={14} />
          Let It Bake
        </button>
      </>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 w-full h-10 px-4 rounded-xl border border-border bg-card text-sm text-muted-foreground">
        <Loader2 size={14} className="animate-spin" />
        <span>Loading…</span>
      </div>
    )
  }

  const chaptersSoFar = activeBake
    ? Math.max(0, (chapterCount ?? 0) - activeBake.chapter_count_at_bake_start)
    : 0

  return (
    <div ref={dropdownRef} className="relative w-full">

      {/* ── Trigger — matches ReadingProgressButton's exact height/padding ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center justify-between w-full h-10 px-4 rounded-xl border text-sm font-semibold transition-all text-center',
          activeBake
            ? 'border-orange-500/30 bg-orange-500/10 text-orange-600'
            : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary'
        )}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1 justify-center">
          {saving
            ? <Loader2 size={14} className="animate-spin shrink-0" />
            : <Croissant size={14} className="shrink-0" />
          }
          <span className="truncate">
            {activeBake ? `Baking · ${chaptersSoFar}/${activeBake.target_chapter_count}` : 'Let It Bake'}
          </span>
        </span>

        <ChevronDown
          size={14}
          className={cn('shrink-0 transition-transform ml-2', open && 'rotate-180')}
        />
      </button>

      {/* ── Dropdown ── */}
      {open && (
        <div className={`${inline ? 'relative' : 'absolute top-full left-0 right-0'} mt-2 z-50 rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 overflow-hidden`}>

          {activeBake ? (
            /* ── Already baking this comic — show status + clear option ── */
            <div className="p-3 space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground px-1">
                <Croissant size={13} className="text-orange-500" />
                Waiting for {activeBake.target_chapter_count} chapters
              </p>
              <p className="text-[11px] text-muted-foreground px-1">
                {chaptersSoFar} of {activeBake.target_chapter_count} ready
                {' '}({BAKE_COUNTING_MODES.find(m => m.value === activeBake.counting_mode)?.description.toLowerCase() ?? 'counting chapters'})
              </p>
              <button
                onClick={handleClearBake}
                disabled={saving}
                className="w-full text-center px-3 py-2 rounded-xl text-xs text-muted-foreground/60 hover:text-destructive transition-all"
              >
                {saving ? <Loader2 size={11} className="animate-spin mx-auto" /> : 'Stop baking'}
              </button>
            </div>
          ) : step === 'target' && pendingMode ? (
            /* ── Step 2: target chapter count ── */
            <div className="p-3 space-y-2">
              <button
                onClick={() => { setStep('mode'); setPendingMode(null) }}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors mb-1"
              >
                <ArrowLeft size={11} />
                Back
              </button>

              <p className="text-xs font-semibold text-foreground px-1">
                Wait for how many chapters?
              </p>
              <p className="text-[10px] text-muted-foreground px-1 pb-1">
                {BAKE_COUNTING_MODES.find(m => m.value === pendingMode)?.description}
              </p>

              <div className="flex items-center gap-2 px-1">
                <input
                  autoFocus
                  type="number"
                  min={BAKE_MIN_TARGET_CHAPTERS}
                  max={BAKE_MAX_TARGET_CHAPTERS}
                  value={targetInput}
                  onChange={e => setTargetInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleConfirmBake()}
                  className="flex-1 h-8 text-xs bg-muted border border-border rounded-lg px-2.5 outline-none focus:border-primary text-foreground"
                />
                <button
                  onClick={handleConfirmBake}
                  disabled={saving}
                  className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center gap-1.5 shrink-0"
                >
                  {saving ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                  Bake
                </button>
              </div>

              {!isPro && (
                <p className="text-[10px] text-muted-foreground/60 px-1 pt-1">
                  Free tier: up to {FREE_LIMITS.bakes} active bakes at a time.
                </p>
              )}
            </div>
          ) : (
            /* ── Step 1: counting mode ── */
            <div className="p-2 space-y-0.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2 py-1">
                How should we count?
              </p>
              {BAKE_COUNTING_MODES.map(mode => (
                <button
                  key={mode.value}
                  onClick={() => handleModeSelect(mode.value)}
                  disabled={saving}
                  className="w-full flex items-start gap-2.5 px-3 py-2.5 rounded-xl text-left hover:bg-muted/60 transition-all"
                >
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-foreground">{mode.label}</span>
                    <span className="block text-[11px] text-muted-foreground">{mode.description}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}