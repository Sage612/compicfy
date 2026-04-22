'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Props {
  until: string // ISO date string
}

function calcTimeLeft(isoDate: string) {
  const diff = new Date(isoDate).getTime() - Date.now()
  if (diff <= 0) return null

  const totalSeconds = Math.floor(diff / 1000)
  const days    = Math.floor(totalSeconds / 86400)
  const hours   = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  return { days, hours, minutes, seconds }
}

export function SuspendedCountdown({ until }: Props) {
  const router                  = useRouter()
  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(until))
  const redirected              = useRef(false)

  const doRedirect = () => {
    if (redirected.current) return
    redirected.current = true
    toast.success('Your suspension has been lifted! Welcome back.')
    router.replace('/browse')
  }

  // ── Countdown tick ───────────────────────────────────────────────
  useEffect(() => {
    if (!timeLeft) {
      doRedirect()
      return
    }

    const interval = setInterval(() => {
      const next = calcTimeLeft(until)
      setTimeLeft(next)
      if (!next) {
        clearInterval(interval)
        doRedirect()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [until]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Poll every 30 s to detect early admin lifts ─────────────────
  useEffect(() => {
    const poll = async () => {
      try {
        const res  = await fetch('/api/me/status')
        const data = await res.json()
        // If server says no longer suspended, redirect immediately
        if (data.authenticated && !data.is_suspended && !data.is_banned) {
          doRedirect()
        }
      } catch {
        // Network error — retry on next poll
      }
    }

    poll() // check immediately on mount
    const interval = setInterval(poll, 30_000)
    return () => clearInterval(interval)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!timeLeft) {
    return (
      <p className="text-sm text-amber-500 font-semibold animate-pulse">
        Lifting suspension…
      </p>
    )
  }

  const { days, hours, minutes, seconds } = timeLeft
  const parts: string[] = []
  if (days > 0)    parts.push(`${days}d`)
  if (hours > 0)   parts.push(`${hours}h`)
  if (minutes > 0) parts.push(`${minutes}m`)
  parts.push(`${seconds}s`)

  return (
    <p className="text-muted-foreground text-sm leading-relaxed">
      Access will be restored in{' '}
      <strong className="text-amber-500 tabular-nums">{parts.join(' ')}</strong>.
    </p>
  )
}