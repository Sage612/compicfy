'use client'

import { useState } from 'react'
import { Bookmark, Crown } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AuthPromptModal } from '@/components/ui/auth-prompt-modal'
import Link from 'next/link'

interface Props {
  recommendationId: string
  initialSaved:     boolean
  isLoggedIn:       boolean
  comicTitle?:      string
}

export function SaveButton({
  recommendationId,
  initialSaved,
  isLoggedIn,
  comicTitle,
}: Props) {
  const [saved,     setSaved]     = useState(initialSaved)
  const [loading,   setLoading]   = useState(false)
  const [showAuth,  setShowAuth]  = useState(false)

  const handleSave = async () => {
    if (!isLoggedIn) {
      setShowAuth(true)
      return
    }
    if (loading) return
    setLoading(true)

    try {
      if (saved) {
        const res = await fetch('/api/saves', {
          method:  'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ recommendation_id: recommendationId }),
        })
        if (!res.ok) {
          const data = await res.json()
          toast.error(data.error ?? 'Failed to remove save')
          return
        }
        setSaved(false)
        toast.success('Removed from saved')
      } else {
        const res = await fetch('/api/saves', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ recommendation_id: recommendationId }),
        })
        const data = await res.json()

        if (!res.ok) {
          if (res.status === 401) { setShowAuth(true); return }
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
    <>
     
      <Button
        variant="outline"
        size="sm"
        onClick={handleSave}
        disabled={loading}
        className={cn(
          'gap-2 shrink-0 whitespace-nowrap w-full sm:w-auto',
          saved && 'bg-primary/10 border-primary/50 text-primary hover:bg-primary/20'
        )}
      >
        <Bookmark size={14} className={cn('shrink-0', saved && 'fill-current')} />
        {loading ? 'Saving...' : saved ? 'Saved' : 'Save Comic'}
      </Button>

      <AuthPromptModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        config={{
          action: 'save this comic',
          comicTitle,
          icon: <Bookmark size={24} className="text-primary" />,
        }}
      />
    </>
  )
}