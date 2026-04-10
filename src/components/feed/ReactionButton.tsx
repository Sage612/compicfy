'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Props {
  recommendationId: string
  initialCount:     number
  initialReacted:   boolean
  isLoggedIn:       boolean
  onToggle?:        (id: string, reacted: boolean) => void
}

export function ReactionButton({
  recommendationId,
  initialCount,
  initialReacted,
  isLoggedIn,
  onToggle,
}: Props) {
  const [reacted, setReacted] = useState(initialReacted)
  const [count,   setCount]   = useState(initialCount)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  // ── KEY FIX ──────────────────────────────────────────────────────
  // useState(initialReacted) only runs ONCE on first render.
  // When FeedList fetches reactions and passes updated props down,
  // the component ignores them — so the heart never fills in.
  // This effect syncs local state whenever the parent updates the prop.
  useEffect(() => {
    setReacted(initialReacted)
  }, [initialReacted])

  useEffect(() => {
    setCount(initialCount)
  }, [initialCount])
  // ─────────────────────────────────────────────────────────────────

  const handleReact = async () => {
    if (!isLoggedIn) {
      toast.error('Sign in to react')
      return
    }
    if (loading) return

    // Optimistic update
    const nextReacted = !reacted
    setReacted(nextReacted)
    setCount(c => nextReacted ? c + 1 : Math.max(0, c - 1))
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      if (nextReacted) {
        const { error } = await (supabase as any)
          .from('reactions')
          .upsert(
            { user_id: user.id, recommendation_id: recommendationId },
            { onConflict: 'user_id,recommendation_id', ignoreDuplicates: true }
          )
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('reactions')
          .delete()
          .eq('user_id', user.id)
          .eq('recommendation_id', recommendationId)
        if (error) throw error
      }

      onToggle?.(recommendationId, nextReacted)
    } catch {
      // Roll back on failure
      setReacted(!nextReacted)
      setCount(c => nextReacted ? Math.max(0, c - 1) : c + 1)
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