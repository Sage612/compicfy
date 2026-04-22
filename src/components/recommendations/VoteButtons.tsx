'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/utils/format'
import { useRouter } from 'next/navigation'

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
  const router    = useRouter()
  const [upvotes,   setUpvotes]   = useState(initialUpvotes)
  const [downvotes, setDownvotes] = useState(initialDownvotes)
  const [userVote,  setUserVote]  = useState(initialVote)
  const [loading,   setLoading]   = useState(false)

  const handleVote = async (type: 'up' | 'down') => {
    if (!isLoggedIn) {
      toast.error('Please log in to vote')
      router.push('/login')
      return
    }
    if (loading) return
    setLoading(true)

    // Optimistic update
    const prev = { upvotes, downvotes, userVote }

    if (userVote === type) {
      // Remove vote
      if (type === 'up') setUpvotes(v => v - 1)
      else setDownvotes(v => v - 1)
      setUserVote(null)
    } else if (userVote) {
      // Switch vote
      if (type === 'up') { setUpvotes(v => v + 1); setDownvotes(v => v - 1) }
      else               { setDownvotes(v => v + 1); setUpvotes(v => v - 1) }
      setUserVote(type)
    } else {
      // New vote
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
        // Session expired — roll back and redirect
        setUpvotes(prev.upvotes)
        setDownvotes(prev.downvotes)
        setUserVote(prev.userVote)
        toast.error('Please log in to vote')
        router.push('/login')
        return
      }

      if (!res.ok) {
        // Roll back optimistic update
        setUpvotes(prev.upvotes)
        setDownvotes(prev.downvotes)
        setUserVote(prev.userVote)
        toast.error('Failed to vote')
      }
    } catch {
      // Roll back
      setUpvotes(prev.upvotes)
      setDownvotes(prev.downvotes)
      setUserVote(prev.userVote)
      toast.error('Failed to vote')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleVote('up')}
        disabled={loading}
        className={cn(
          'flex-1 gap-1.5',
          userVote === 'up' && 'bg-green-500/10 border-green-500/50 text-green-600 hover:bg-green-500/20'
        )}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <ThumbsUp size={14} />}
        {formatNumber(upvotes)}
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleVote('down')}
        disabled={loading}
        className={cn(
          'flex-1 gap-1.5',
          userVote === 'down' && 'bg-red-500/10 border-red-500/50 text-red-600 hover:bg-red-500/20'
        )}
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <ThumbsDown size={14} />}
        {formatNumber(downvotes)}
      </Button>
    </div>
  )
}