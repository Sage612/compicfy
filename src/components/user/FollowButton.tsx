'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UserPlus, UserCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Props {
  profileId: string
  initialFollowing: boolean
  isLoggedIn: boolean
}

export function FollowButton({ profileId, initialFollowing, isLoggedIn }: Props) {
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleFollow = async () => {
    if (!isLoggedIn) {
      router.push('/login')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/follows', {
        method: following ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ following_id: profileId }),
      })

      if (!res.ok) throw new Error()

      setFollowing(!following)
      toast.success(following ? 'Unfollowed' : 'Following!')
      router.refresh()
    } catch {
      toast.error('Failed to update follow')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      size="sm"
      variant={following ? 'outline' : 'default'}
      onClick={handleFollow}
      disabled={loading}
      className={
        following
          ? 'gap-1.5 border-primary/30 text-primary hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors'
          : 'gap-1.5 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0 shadow-md shadow-primary/20'
      }
    >
      {loading ? (
        <Loader2 size={13} className="animate-spin" />
      ) : following ? (
        <>
          <UserCheck size={13} />
          Following
        </>
      ) : (
        <>
          <UserPlus size={13} />
          Follow
        </>
      )}
    </Button>
  )
}