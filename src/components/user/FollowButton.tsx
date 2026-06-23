'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UserPlus, UserCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { AuthPromptModal } from '@/components/ui/auth-prompt-modal'

interface Props {
  profileId:        string
  initialFollowing: boolean
  isLoggedIn:       boolean
}

export function FollowButton({ profileId, initialFollowing, isLoggedIn }: Props) {
  const [following,   setFollowing]   = useState(initialFollowing)
  const [loading,     setLoading]     = useState(false)
  const [authPrompt,  setAuthPrompt]  = useState(false)
  const router = useRouter()

  const handleFollow = async () => {
    if (!isLoggedIn) { setAuthPrompt(true); return }

    setLoading(true)
    try {
      let res: Response

      if (following) {
        res = await fetch(`/api/follows?following_id=${encodeURIComponent(profileId)}`, {
          method: 'DELETE',
        })
      } else {
        res = await fetch('/api/follows', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ following_id: profileId }),
        })
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        // Follow limit reached — show upgrade prompt
        if (res.status === 403 && data?.error === 'follow_limit_reached') {
          toast.error(data.message ?? 'Follow limit reached upgrade to Pro for unlimited follows', {
            action: {
              label:   'Upgrade',
              onClick: () => router.push('/pricing'),
            },
            duration: 6000,
          })
          return
        }
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
    <>
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
          <><UserCheck size={13} />Following</>
        ) : (
          <><UserPlus size={13} />Follow</>
        )}
      </Button>

      <AuthPromptModal
        open={authPrompt}
        onClose={() => setAuthPrompt(false)}
        config={{
          action: 'follow this account',
          icon:   <UserPlus size={24} className="text-primary" />,
        }}
      />
    </>
  )
}