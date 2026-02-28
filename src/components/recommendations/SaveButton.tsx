'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Bookmark } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils/cn'
import { useRouter } from 'next/navigation'

interface Props {
  recommendationId: string
  initialSaved: boolean
  isLoggedIn: boolean
}

export function SaveButton({ recommendationId, initialSaved, isLoggedIn }: Props) {
  const router = useRouter()
  const supabase = createClient()
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

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    try {
      if (saved) {
        await supabase
          .from('saves')
          .delete()
          .eq('user_id', user.id)
          .eq('recommendation_id', recommendationId)
        setSaved(false)
        toast.success('Removed from saved')
      } else {
        await (supabase as any)
          .from('saves')
          .insert({ user_id: user.id, recommendation_id: recommendationId })
        setSaved(true)
        toast.success('Saved!')
      }
    } catch {
      toast.error('Failed to save')
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
      {saved ? 'Saved' : 'Save Comic'}
    </Button>
  )
}