'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ThumbsUp, ThumbsDown } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/utils/format'
import { useRouter } from 'next/navigation'

interface Props {
  recommendationId: string
  initialUpvotes: number
  initialDownvotes: number
  initialVote: 'up' | 'down' | null
  isLoggedIn: boolean
}

export function VoteButtons({
  recommendationId,
  initialUpvotes,
  initialDownvotes,
  initialVote,
  isLoggedIn,
}: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [upvotes, setUpvotes] = useState(initialUpvotes)
  const [downvotes, setDownvotes] = useState(initialDownvotes)
  const [userVote, setUserVote] = useState(initialVote)
  const [loading, setLoading] = useState(false)

  const handleVote = async (type: 'up' | 'down') => {
    if (!isLoggedIn) {
      toast.error('Please log in to vote')
      router.push('/login')
      return
    }

    if (loading) return
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    try {
      if (userVote === type) {
        // Remove vote
        await supabase
          .from('votes')
          .delete()
          .eq('user_id', user.id)
          .eq('recommendation_id', recommendationId)

        if (type === 'up') setUpvotes(v => v - 1)
        else setDownvotes(v => v - 1)
        setUserVote(null)
      } else if (userVote) {
        // Switch vote
        await (supabase as any)
  .from('votes')
  .update({ vote_type: type })
  .eq('user_id', user.id)
  .eq('recommendation_id', recommendationId)

        if (type === 'up') {
          setUpvotes(v => v + 1)
          setDownvotes(v => v - 1)
        } else {
          setDownvotes(v => v + 1)
          setUpvotes(v => v - 1)
        }
        setUserVote(type)
      } else {
        // New vote
        await (supabase as any)
  .from('votes')
  .insert({ user_id: user.id, recommendation_id: recommendationId, vote_type: type })

        if (type === 'up') setUpvotes(v => v + 1)
        else setDownvotes(v => v + 1)
        setUserVote(type)
      }
    } catch {
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
        <ThumbsUp size={14} />
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
        <ThumbsDown size={14} />
        {formatNumber(downvotes)}
      </Button>
    </div>
  )
}