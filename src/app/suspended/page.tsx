import Link from 'next/link'
import { Clock, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Account Suspended' }

interface Props {
  searchParams: Promise<{ reason?: string; until?: string }>
}

function formatTimeLeft(isoDate: string): string {
  const diff = new Date(isoDate).getTime() - Date.now()
  if (diff <= 0) return 'shortly'

  const hours = Math.floor(diff / 3600000)
  const mins  = Math.floor((diff % 3600000) / 60000)

  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    const remH = hours % 24
    return remH > 0 ? `${days}d ${remH}h` : `${days} day${days > 1 ? 's' : ''}`
  }
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins} minute${mins !== 1 ? 's' : ''}`
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month:   'long',
    day:     'numeric',
    hour:    '2-digit',
    minute:  '2-digit',
  })
}

export default async function SuspendedPage({ searchParams }: Props) {
  const { reason, until } = await searchParams
  const timeLeft = until ? formatTimeLeft(until) : null
  const liftDate = until ? formatDate(until)     : null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">

      {/* Background blobs */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />

      {/* Stacked comic panels */}
      <div className="relative mb-8 w-36 h-36 mx-auto">
        <div className="absolute top-0 left-0 w-20 h-28 rounded-2xl border-2 border-border bg-card rotate-[-12deg] opacity-40" />
        <div className="absolute top-2 left-6 w-20 h-28 rounded-2xl border-2 border-border bg-card rotate-[-5deg] opacity-60" />
        <div className="absolute top-4 left-10 w-20 h-28 rounded-2xl border-2 border-amber-500/40 bg-card shadow-xl flex flex-col items-center justify-center gap-1">
          <Clock size={18} className="text-amber-500 opacity-80" />
          <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-center px-1">Suspended</span>
        </div>
      </div>

      <div className="space-y-3 mb-8 max-w-sm">
        <h1 className="text-3xl font-black tracking-tight">Account Suspended</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Your account has been temporarily suspended.
          {timeLeft && (
            <> Access will be restored in <strong className="text-amber-500">{timeLeft}</strong>.</>
          )}
        </p>

        {liftDate && (
          <div className="mt-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">Suspension lifts</p>
            <p className="text-sm font-semibold">{liftDate}</p>
          </div>
        )}

        {reason && (
          <div className="p-3 rounded-xl bg-muted/50 border border-border text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Reason</p>
            <p className="text-sm text-muted-foreground">{reason}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
        <a href="mailto:support@compicfy.cloud">
          <Button
            variant="outline"
            className="gap-2 hover:border-amber-500/40 hover:text-amber-600"
          >
            <Mail size={14} />
            Contact Support
          </Button>
        </a>
      </div>

      <p className="text-xs text-muted-foreground max-w-xs">
        If you believe this is a mistake, email{' '}
        <a href="mailto:support@compicfy.cloud" className="text-primary hover:underline">
          support@compicfy.cloud
        </a>.
        Your suspension will lift automatically when the time expires.
      </p>

    </div>
  )
}