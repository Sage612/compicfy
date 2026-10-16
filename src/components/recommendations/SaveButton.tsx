'use client'

import { useState } from 'react'
import { Bookmark, Crown, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AuthPromptModal } from '@/components/ui/auth-prompt-modal'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Props {
  recommendationId: string
  initialSaved:     boolean
  isLoggedIn:       boolean
  comicTitle?:      string
  /** 'default' = existing full-width pill button (unchanged).
   *  'icon'    = circular icon+label button, used by the mobile hero
   *              action row. */
  variant?:         'default' | 'icon' | 'tile'
  /** tile variant: how many people have saved this comic. */
  count?:           number
}

export function SaveButton({
  recommendationId,
  initialSaved,
  isLoggedIn,
  comicTitle,
  variant = 'default',
  count = 0,
}: Props) {
  const router = useRouter()
  const [saved,     setSaved]     = useState(initialSaved)
  const [loading,   setLoading]   = useState(false)
  const [showAuth,  setShowAuth]  = useState(false)

  const handleSave = async () => {
    if (!isLoggedIn) {
      setShowAuth(true)
      return
    }
    if (loading) return
    setLoading(true)

    try {
      if (saved) {
        const res = await fetch('/api/saves', {
          method:  'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ recommendation_id: recommendationId }),
        })
        if (!res.ok) {
          const data = await res.json()
          toast.error(data.error ?? 'Failed to remove save')
          return
        }
        setSaved(false)
        toast.success('Removed from saved')
        router.refresh()
      } else {
        const res = await fetch('/api/saves', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ recommendation_id: recommendationId }),
        })
        const data = await res.json()

        if (!res.ok) {
          if (res.status === 401) { setShowAuth(true); return }
          if (res.status === 403) {
            toast.error(
              <div className="flex flex-col gap-1.5">
                <p className="font-black text-sm">Save limit reached</p>
                <p className="text-xs text-muted-foreground">{data.message}</p>
                <Link
                  href="/pricing"
                  className="text-xs font-bold text-amber-500 hover:underline flex items-center gap-1 mt-0.5"
                >
                  <Crown size={11} />
                  Upgrade to Pro for unlimited saves
                </Link>
              </div>,
              { duration: 6000 }
            )
            return
          }
          toast.error(data.error ?? 'Failed to save')
          return
        }

        setSaved(true)
        toast.success('Saved!')
        router.refresh()
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // 'tile': the comic page's action row cell (sits next to the Vote tiles).
  if (variant === 'tile') {
    const shown = Math.max(0, count + (saved === initialSaved ? 0 : saved ? 1 : -1))
    return (
      <>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          aria-pressed={saved}
          className="group flex flex-col items-center justify-center gap-2 px-2 py-4 transition-colors hover:bg-dossier-foreground/5 active:scale-[0.97] disabled:opacity-70"
        >
          <span
            className={cn(
              'w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all group-hover:scale-105',
              saved
                ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/30'
                : 'border-dossier-foreground/30 bg-dossier-foreground/5 text-dossier-foreground group-hover:border-amber-500 group-hover:text-amber-500 group-hover:bg-amber-500/10'
            )}
          >
            {loading
              ? <Loader2 size={18} className="animate-spin" />
              : <Bookmark size={20} className={saved ? 'fill-current' : ''} />}
          </span>
          <span className="text-sm font-bold text-dossier-foreground">{saved ? 'Saved' : 'Save'}</span>
          <span className={cn(
            'rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums transition-colors',
            saved ? 'bg-amber-500/15 text-amber-500' : 'bg-dossier-foreground/10 text-dossier-foreground/85'
          )}>{shown}</span>
        </button>

        <AuthPromptModal
          open={showAuth}
          onClose={() => setShowAuth(false)}
          config={{
            action: 'save this comic',
            comicTitle,
            icon: <Bookmark size={24} className="text-primary" />,
          }}
        />
      </>
    )
  }

  if (variant === 'icon') {
    return (
      <>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          aria-label={saved ? 'Saved' : 'Save'}
          className="flex flex-col items-center gap-1.5 shrink-0"
        >
          <span
            className={cn(
              'w-11 h-11 rounded-full flex items-center justify-center border transition-colors',
              saved
                ? 'bg-dossier-foreground/20 border-dossier-foreground/60 text-dossier-foreground'
                : 'border-dossier-foreground/10 text-dossier-foreground/60'
            )}
          >
            {loading
              ? <Loader2 size={16} className="animate-spin" />
              : saved ? <Check size={16} /> : <Bookmark size={16} />
            }
          </span>
          <span className="text-[11px] text-dossier-foreground/60">
            {saved ? 'Saved' : 'Save'}
          </span>
        </button>

        <AuthPromptModal
          open={showAuth}
          onClose={() => setShowAuth(false)}
          config={{
            action: 'save this comic',
            comicTitle,
            icon: <Bookmark size={24} className="text-primary" />,
          }}
        />
      </>
    )
  }

  return (
    <>
      {/*
        FIX (this pass): removed `w-full sm:w-auto` — same conflict as
        VoteButtons. This now has zero opinion about its own width and
        simply fills whatever container it's placed in (w-full always),
        so when the page wraps it in a grid-cols-2 cell next to Vote,
        it occupies exactly that cell — no more, no less.
      */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleSave}
        disabled={loading}
        className={cn(
          'w-full gap-1.5 whitespace-nowrap px-2',
          saved && 'bg-primary/10 border-primary/50 text-primary hover:bg-primary/20'
        )}
      >
        <Bookmark size={14} className={cn('shrink-0', saved && 'fill-current')} />
        <span className="truncate">{loading ? 'Saving...' : saved ? 'Saved' : 'Save Comic'}</span>
      </Button>

      <AuthPromptModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        config={{
          action: 'save this comic',
          comicTitle,
          icon: <Bookmark size={24} className="text-primary" />,
        }}
      />
    </>
  )
}