'use client'

import Link from 'next/link'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  message?: string
  // How close to limit (e.g. 28/30 recs used)
  current?: number
  limit?: number
  feature?: string
  className?: string
  dismissible?: boolean
}

export function UpgradeBanner({
  message,
  current,
  limit,
  feature,
  className,
  dismissible = true,
}: Props) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const isNearLimit = current !== undefined && limit !== undefined
  const percentage = isNearLimit ? (current / limit) * 100 : 0
  const isAtLimit = isNearLimit && current >= limit

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 rounded-xl border border-border bg-card p-4',
        className
      )}
    >
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="font-dashboard-serif text-base text-foreground">
          {isAtLimit
            ? `You've reached your ${feature ?? 'monthly'} limit`
            : message ?? 'Upgrade to Pro for unlimited access'}
        </p>
        {isNearLimit && (
          <div className="space-y-1.5">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70 tabular-nums">
              {current} / {limit} {feature ?? 'used'}
            </p>
            <div className="h-1 w-full max-w-xs rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-foreground/70 transition-all"
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <Link
          href="/pricing"
          className="text-sm text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground transition-colors"
        >
          Upgrade to Pro
        </Link>
        {dismissible && (
          <button
            onClick={() => setDismissed(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  )
}