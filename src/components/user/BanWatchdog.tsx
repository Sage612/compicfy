'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Props {
  userId: string
}

export function BanWatchdog({ userId }: Props) {
  const router = useRouter()
  const redirected = useRef(false)

  const doRedirect = () => {
    if (redirected.current) return
    redirected.current = true
    toast.success('Your appeal was approved! Welcome back to Compicfy.')
    
    // Force a hard navigation to clear all middleware caches
    window.location.href = '/browse'
  }

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/me/status')
        if (!res.ok) return
        
        const data = await res.json()
        
        // If the API says the user is no longer banned, trigger the escape
        if (data.authenticated && !data.is_banned) {
          doRedirect()
        }
      } catch (err) {
        // Silently fail and wait for next poll
      }
    }

    // Check immediately on mount
    poll()

    // Poll every 30 seconds (matching your SuspendedCountdown)
    const interval = setInterval(poll, 30000)
    
    return () => clearInterval(interval)
  }, [router])

  return null // Pure logic component
}