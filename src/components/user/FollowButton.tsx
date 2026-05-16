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
  const [loading, setLoading]     = useState(false)
  const router = useRouter()

  const handleFollow = async () => {
    if (!isLoggedIn) {
      router.push('/login')
      return
    }

    setLoading(true)
    try {
      let res: Response

      if (following) {
        // DELETE — pass following_id as query param (body on DELETE is unreliable)
        res = await fetch(`/api/follows?following_id=${encodeURIComponent(profileId)}`, {
          method: 'DELETE',
        })
      } else {
        // POST — body is fine
        res = await fetch('/api/follows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ following_id: profileId }),
        })
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error ?? 'Failed to update follow')
      }

      setFollowing(!following)
      toast.success(following ? 'Unfollowed' : 'Following!')
      router.refresh()
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update follow')
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
          : 'gap-1.5 bg-primary hover:bg-primary/90 border-0 shadow-md shadow-primary/20'
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