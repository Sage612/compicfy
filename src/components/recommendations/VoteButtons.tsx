'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown, Loader2, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/utils/format'
import { AuthPromptModal } from '@/components/ui/auth-prompt-modal'

interface Props {
  recommendationId: string
  initialUpvotes:   number
  initialDownvotes: number
  initialVote:      'up' | 'down' | null
  isLoggedIn:       boolean
  comicTitle?:      string
  /** 'default' = existing two-button pill row (unchanged).
   *  'icon'    = single circular icon+label button, used by the mobile
   *              hero action row and the "More" sheet's Downvote row. */
  variant?:         'default' | 'icon'
  /** icon variant only: which direction this button represents. */
  mode?:            'up' | 'down'
}

export function VoteButtons({
  recommendationId,
  initialUpvotes,
  initialDownvotes,
  initialVote,
  isLoggedIn,
  comicTitle,
  variant = 'default',
  mode = 'up',
}: Props) {
  const [upvotes,     setUpvotes]     = useState(initialUpvotes)
  const [downvotes,   setDownvotes]   = useState(initialDownvotes)
  const [userVote,    setUserVote]    = useState(initialVote)
  const [loadingVote, setLoadingVote] = useState<'up' | 'down' | null>(null)
  const [showAuth,    setShowAuth]    = useState(false)
  const [pendingVote, setPendingVote] = useState<'up' | 'down' | null>(null)

  const handleVote = async (type: 'up' | 'down') => {
    if (!isLoggedIn) {
      setPendingVote(type)
      setShowAuth(true)
      return
    }
    if (loadingVote) return
    setLoadingVote(type)

    const prev = { upvotes, downvotes, userVote }

    if (userVote === type) {
      if (type === 'up') setUpvotes(v => v - 1)
      else setDownvotes(v => v - 1)
      setUserVote(null)
    } else if (userVote) {
      if (type === 'up') { setUpvotes(v => v + 1); setDownvotes(v => v - 1) }
      else               { setDownvotes(v => v + 1); setUpvotes(v => v - 1) }
      setUserVote(type)
    } else {
      if (type === 'up') setUpvotes(v => v + 1)
      else setDownvotes(v => v + 1)
      setUserVote(type)
    }

    try {
      const res = await fetch(`/api/recommendations/${recommendationId}/vote`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ vote_type: type }),
      })

      if (res.status === 401) {
        setUpvotes(prev.upvotes)
        setDownvotes(prev.downvotes)
        setUserVote(prev.userVote)
        setPendingVote(type)
        setShowAuth(true)
        return
      }

      if (!res.ok) {
        setUpvotes(prev.upvotes)
        setDownvotes(prev.downvotes)
        setUserVote(prev.userVote)
        toast.error('Failed to vote')
      }
    } catch {
      setUpvotes(prev.upvotes)
      setDownvotes(prev.downvotes)
      setUserVote(prev.userVote)
      toast.error('Failed to vote')
    } finally {
      setLoadingVote(null)
    }
  }

  if (variant === 'icon') {
    const active = userVote === mode
    const label = mode === 'up' ? 'Voted' : 'Downvote'
    const Icon = mode === 'up' ? ChevronUp : ThumbsDown
    const loading = loadingVote === mode

    return (
      <>
        <button
          type="button"
          onClick={() => handleVote(mode)}
          disabled={!!loadingVote}
          aria-label={label}
          className="flex flex-col items-center gap-1.5 shrink-0"
        >
          <span
            className={cn(
              'w-11 h-11 rounded-full flex items-center justify-center transition-colors',
              active
                ? 'bg-dossier-foreground text-dossier'
                : 'border border-dossier-foreground/10 text-dossier-foreground/60'
            )}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
          </span>
          <span className="text-[11px] text-dossier-foreground/60">{label}</span>
        </button>

        <AuthPromptModal
          open={showAuth}
          onClose={() => { setShowAuth(false); setPendingVote(null) }}
          config={{
            action: pendingVote === 'up' ? 'upvote this comic' : 'downvote this comic',
            comicTitle,
            icon: pendingVote === 'up'
              ? <ThumbsUp size={24} className="text-emerald-500" />
              : <ThumbsDown size={24} className="text-rose-500" />,
          }}
        />
      </>
    )
  }

  return (
    <>
      {/*
        FIX (this pass): removed the `w-full sm:w-auto shrink-0` wrapper
        and the per-button `flex-1 sm:flex-initial` classes from the
        previous version. Those were fighting with the page's own
        `flex-1` wrapper around this component — at desktop width,
        `sm:w-auto`/`sm:flex-initial` made THIS component collapse to
        its content width regardless of what the parent grid/flex cell
        gave it, which is what was pushing Save outside the cover's
        column width.

        Now this is a plain `w-full grid grid-cols-2` with no opinion
        about its own width — it always fills whatever container the
        page puts it in (a flex-1 cell, a grid cell, 100% width,
        whatever), and the two buttons split THAT space 50/50 via the
        grid, not via flex-grow math that can disagree with a sibling.
      */}
      <div className="w-full grid grid-cols-2 gap-2">
        <button
          onClick={() => handleVote('up')}
          disabled={!!loadingVote}
          className={cn(
            'flex items-center justify-center gap-1.5 h-9 px-2 rounded-xl border text-sm font-semibold transition-all whitespace-nowrap',
            userVote === 'up'
              ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/20'
              : 'border-border text-muted-foreground hover:border-emerald-500/40 hover:text-emerald-600 hover:bg-emerald-500/5'
          )}
        >
          {loadingVote === 'up'
            ? <Loader2 size={14} className="animate-spin shrink-0" />
            : <ThumbsUp size={14} className="shrink-0" />
          }
          {formatNumber(upvotes)}
        </button>

        <button
          onClick={() => handleVote('down')}
          disabled={!!loadingVote}
          className={cn(
            'flex items-center justify-center gap-1.5 h-9 px-2 rounded-xl border text-sm font-semibold transition-all whitespace-nowrap',
            userVote === 'down'
              ? 'bg-rose-500/10 border-rose-500/50 text-rose-600 hover:bg-rose-500/20'
              : 'border-border text-muted-foreground hover:border-rose-500/40 hover:text-rose-600 hover:bg-rose-500/5'
          )}
        >
          {loadingVote === 'down'
            ? <Loader2 size={14} className="animate-spin shrink-0" />
            : <ThumbsDown size={14} className="shrink-0" />
          }
          {formatNumber(downvotes)}
        </button>
      </div>

      <AuthPromptModal
        open={showAuth}
        onClose={() => { setShowAuth(false); setPendingVote(null) }}
        config={{
          action: pendingVote === 'up' ? 'upvote this comic' : 'downvote this comic',
          comicTitle,
          icon: pendingVote === 'up'
            ? <ThumbsUp size={24} className="text-emerald-500" />
            : <ThumbsDown size={24} className="text-rose-500" />,
        }}
      />
    </>
  )
}