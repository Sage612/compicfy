'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react'
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
}

export function VoteButtons({
  recommendationId,
  initialUpvotes,
  initialDownvotes,
  initialVote,
  isLoggedIn,
  comicTitle,
}: Props) {
  const [upvotes,     setUpvotes]     = useState(initialUpvotes)
  const [downvotes,   setDownvotes]   = useState(initialDownvotes)
  const [userVote,    setUserVote]    = useState(initialVote)
  // ── Track WHICH button is spinning, not just a boolean ──
  const [loadingVote, setLoadingVote] = useState<'up' | 'down' | null>(null)
  const [showAuth,    setShowAuth]    = useState(false)
  const [pendingVote, setPendingVote] = useState<'up' | 'down' | null>(null)

  const handleVote = async (type: 'up' | 'down') => {
    if (!isLoggedIn) {
      setPendingVote(type)
      setShowAuth(true)
      return
    }
    if (loadingVote) return   // block if any vote is in flight
    setLoadingVote(type)      // only spin THIS button

    const prev = { upvotes, downvotes, userVote }

    // Optimistic update
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

  return (
    <>
      {/*
        FIX: this component was built for a full-width vertical sidebar,
        where `flex-1` buttons splitting a 100%-wide parent looked fine.
        Dropped into the new horizontal control-deck row (flex-wrap with
        5+ siblings), that same flex-1 had nothing to anchor against and
        got squeezed down to near-icon-only width.

        w-full sm:w-auto + shrink-0 on the wrapper: takes full width on
        very small screens (one row of its own), but on anything wider
        it sizes to its content and refuses to shrink below that, exactly
        like the other deck buttons (Save, Track Progress, etc).
      */}
      <div className="flex gap-2 w-full sm:w-auto shrink-0">
        {/* ── Upvote ── */}
        <button
          onClick={() => handleVote('up')}
          disabled={!!loadingVote}
          className={cn(
            'flex-1 sm:flex-initial flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-xl border text-sm font-semibold transition-all whitespace-nowrap shrink-0',
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

        {/* ── Downvote ── */}
        <button
          onClick={() => handleVote('down')}
          disabled={!!loadingVote}
          className={cn(
            'flex-1 sm:flex-initial flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-xl border text-sm font-semibold transition-all whitespace-nowrap shrink-0',
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