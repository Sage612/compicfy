'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Props {
  recommendationId: string
  initialCount: number
  initialReacted: boolean
  isLoggedIn: boolean
}

export function ReactionButton({ recommendationId, initialCount, initialReacted, isLoggedIn }: Props) {
  const [reacted, setReacted] = useState(initialReacted)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleReact = async () => {
    if (!isLoggedIn) {
      toast.error('Sign in to react')
      return
    }

    setLoading(true)
    try {
      if (reacted) {
        // Remove reaction
        const { data: { user } } = await supabase.auth.getUser()
        await supabase
          .from('reactions')
          .delete()
          .eq('user_id', user!.id)
          .eq('recommendation_id', recommendationId)
        setReacted(false)
        setCount(c => Math.max(0, c - 1))
      } else {
        // Add reaction
        const { data: { user } } = await supabase.auth.getUser()
        await (supabase as any)
          .from('reactions')
          .insert({ user_id: user!.id, recommendation_id: recommendationId })
        setReacted(true)
        setCount(c => c + 1)
      }
    } catch {
      toast.error('Failed to react')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleReact}
      disabled={loading}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold border transition-all',
        reacted
          ? 'bg-rose-500/15 text-rose-500 border-rose-500/30 hover:bg-rose-500/25'
          : 'bg-muted/50 text-muted-foreground border-border hover:border-rose-500/30 hover:text-rose-500 hover:bg-rose-500/10'
      )}
    >
      <Heart
        size={12}
        className={cn(
          'transition-all',
          reacted ? 'fill-rose-500 text-rose-500' : '',
          loading ? 'opacity-50' : ''
        )}
      />
      {count > 0 && <span>{count}</span>}
    </button>
  )
}