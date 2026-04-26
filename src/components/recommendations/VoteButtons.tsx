'use client'

import { useState } from 'react'
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/utils/format'

interface Props {
  recommendationId: string
  initialUpvotes:   number
  initialDownvotes: number
  initialVote:      'up' | 'down' | null
  isLoggedIn:       boolean
}

export function VoteButtons({
  recommendationId,
  initialUpvotes,
  initialDownvotes,
  initialVote,
  isLoggedIn,
}: Props) {
  const [upvotes,       setUpvotes]       = useState(initialUpvotes)
  const [downvotes,     setDownvotes]     = useState(initialDownvotes)
  const [userVote,      setUserVote]      = useState(initialVote)
  const [loading,       setLoading]       = useState(false)
  // Inline nudge shown instead of a hard redirect when user is not logged in
  const [showNudge,     setShowNudge]     = useState(false)

  const handleVote = async (type: 'up' | 'down') => {
    if (!isLoggedIn) {
      // Show inline prompt — no redirect, no page jump
      setShowNudge(true)
      setTimeout(() => setShowNudge(false), 3500)
      return
    }
    if (loading) return
    setLoading(true)

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
        setShowNudge(true)
        setTimeout(() => setShowNudge(false), 3500)
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
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          onClick={() => handleVote('up')}
          disabled={loading}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border text-sm font-semibold transition-all',
            userVote === 'up'
              ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/20'
              : 'border-border text-muted-foreground hover:border-emerald-500/40 hover:text-emerald-600 hover:bg-emerald-500/5'
          )}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <ThumbsUp size={14} />}
          {formatNumber(upvotes)}
        </button>
        <button
          onClick={() => handleVote('down')}
          disabled={loading}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border text-sm font-semibold transition-all',
            userVote === 'down'
              ? 'bg-rose-500/10 border-rose-500/50 text-rose-600 hover:bg-rose-500/20'
              : 'border-border text-muted-foreground hover:border-rose-500/40 hover:text-rose-600 hover:bg-rose-500/5'
          )}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <ThumbsDown size={14} />}
          {formatNumber(downvotes)}
        </button>
      </div>

      {/* Inline login nudge — fades in/out, no redirect */}
      <div className={cn(
        'overflow-hidden transition-all duration-300',
        showNudge ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'
      )}>
        <p className="text-xs text-center text-muted-foreground py-1">
          <a href="/login" className="text-primary font-semibold hover:underline">Sign in</a>
          {' '}or{' '}
          <a href="/signup" className="text-primary font-semibold hover:underline">create an account</a>
          {' '}to vote
        </p>
      </div>
    </div>
  )
}