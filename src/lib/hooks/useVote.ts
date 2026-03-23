import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function useVote(recommendationId: string) {
  const [voting, setVoting] = useState(false)

  const vote = async (type: 'up' | 'down') => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      toast.error('Please login to vote')
      return
    }

    setVoting(true)
    try {
      const res = await fetch(`/api/recommendations/${recommendationId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote_type: type }),
      })

      if (!res.ok) throw new Error()
    } catch {
      toast.error('Failed to vote')
    } finally {
      setVoting(false)
    }
  }

  return { vote, voting }
}