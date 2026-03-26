'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Bookmark, Crown } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Props {
  recommendationId: string
  initialSaved: boolean
  isLoggedIn: boolean
}

export function SaveButton({ recommendationId, initialSaved, isLoggedIn }: Props) {
  const router = useRouter()
  const [saved, setSaved] = useState(initialSaved)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!isLoggedIn) {
      toast.error('Please log in to save comics')
      router.push('/login')
      return
    }

    if (loading) return
    setLoading(true)

    try {
      if (saved) {
        // Unsave
        const res = await fetch('/api/saves', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recommendation_id: recommendationId }),
        })

        if (!res.ok) {
          const data = await res.json()
          toast.error(data.error ?? 'Failed to remove save')
          return
        }

        setSaved(false)
        toast.success('Removed from saved')
      } else {
        // Save
        const res = await fetch('/api/saves', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recommendation_id: recommendationId }),
        })

        const data = await res.json()

        if (!res.ok) {
          // Hit the save limit — show upgrade prompt
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
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSave}
      disabled={loading}
      className={cn(
        'w-full gap-2',
        saved && 'bg-primary/10 border-primary/50 text-primary hover:bg-primary/20'
      )}
    >
      <Bookmark size={14} className={cn(saved && 'fill-current')} />
      {loading ? 'Saving...' : saved ? 'Saved' : 'Save Comic'}
    </Button>
  )
}