'use client'

import { useEffect, useState } from 'react'
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

  return { days, hours, minutes, seconds, diff }
}

export function SuspendedCountdown({ until }: Props) {
  const router = useRouter()
  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(until))

  useEffect(() => {
    // Already expired on mount — redirect immediately
    if (!timeLeft) {
      toast.success('Your suspension has lifted! Welcome back.')
      router.replace('/browse')
      return
    }

    const interval = setInterval(() => {
      const next = calcTimeLeft(until)
      setTimeLeft(next)

      if (!next) {
        clearInterval(interval)
        toast.success('Your suspension has lifted! Welcome back.')
        router.replace('/browse')
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [until, router]) // eslint-disable-line react-hooks/exhaustive-deps

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