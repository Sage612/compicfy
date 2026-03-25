'use client'

import { Crown, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
    <div className={cn(
      'relative flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 rounded-2xl border',
      isAtLimit
        ? 'border-red-500/30 bg-red-500/5'
        : 'border-amber-500/30 bg-amber-500/5',
      className
    )}>
      {/* Icon */}
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
        isAtLimit
          ? 'bg-red-500/15'
          : 'bg-amber-500/15'
      )}>
        <Crown size={18} className={isAtLimit ? 'text-red-500' : 'text-amber-500'} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-black text-sm">
          {isAtLimit
            ? `You've reached your ${feature ?? 'monthly'} limit`
            : message ?? `Upgrade to Pro for unlimited access`}
        </p>
        {isNearLimit && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {current} / {limit} {feature ?? 'used'}
            </p>
            <div className="h-1.5 w-full max-w-xs rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  percentage >= 100 ? 'bg-red-500' : percentage >= 80 ? 'bg-amber-500' : 'bg-primary'
                )}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="flex items-center gap-2 shrink-0">
        <Link href="/pricing">
          <Button
            size="sm"
            className={cn(
              'gap-1.5 border-0 text-white shadow-md',
              isAtLimit
                ? 'bg-gradient-to-r from-red-500 to-rose-500 shadow-red-500/20'
                : 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-amber-500/20'
            )}
          >
            <Sparkles size={13} />
            Upgrade to Pro
          </Button>
        </Link>

        {dismissible && (
          <button
            onClick={() => setDismissed(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X size={15} />
          </button>
        )}
      </div>
    </div>
  )
}