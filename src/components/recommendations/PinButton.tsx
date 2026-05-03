'use client'

import { useState } from 'react'
import { Pin, PinOff, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props {
  recommendationId: string
  isPinned:         boolean
  onPinChange?:     (id: string | null) => void
  className?:       string
  size?:            'sm' | 'xs'
}

export function PinButton({
  recommendationId,
  isPinned,
  onPinChange,
  className,
  size = 'sm',
}: Props) {
  const [loading, setLoading] = useState(false)
  const [pinned,  setPinned]  = useState(isPinned)

  const handlePin = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (loading) return
    setLoading(true)

    try {
      const res = await fetch('/api/recommendations/pin', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          recommendation_id: pinned ? null : recommendationId,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Failed to pin')
      }

      const data  = await res.json()
      const nowPinned = !!data.pinned
      setPinned(nowPinned)
      onPinChange?.(nowPinned ? recommendationId : null)
      toast.success(nowPinned ? 'Pinned to your profile!' : 'Unpinned from profile')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to pin')
    } finally {
      setLoading(false)
    }
  }

  const iconSize = size === 'xs' ? 11 : 13

  return (
    <button
      onClick={handlePin}
      disabled={loading}
      title={pinned ? 'Unpin from profile' : 'Pin to profile'}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg border font-semibold transition-all disabled:opacity-50',
        size === 'xs'
          ? 'px-2 py-1 text-[10px]'
          : 'px-2.5 py-1.5 text-xs',
        pinned
          ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 hover:bg-amber-500/20'
          : 'border-border text-muted-foreground hover:border-amber-500/40 hover:text-amber-600 hover:bg-amber-500/5',
        className
      )}
    >
      {loading
        ? <Loader2 size={iconSize} className="animate-spin" />
        : pinned
        ? <PinOff size={iconSize} />
        : <Pin    size={iconSize} />
      }
      {pinned ? 'Pinned' : 'Pin'}
    </button>
  )
}