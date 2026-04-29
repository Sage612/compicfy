'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, CheckCircle2, Circle, User, FileText, Globe } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  hasAvatar: boolean
  hasBio: boolean
  hasWebsite: boolean
}

const PROFILE_SESSION_KEY = 'compicfy_profile_banner_dismissed'

export function ProfileCompletionBanner({ hasAvatar, hasBio, hasWebsite }: Props) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return typeof window !== 'undefined'
        ? !!sessionStorage.getItem(PROFILE_SESSION_KEY)
        : false
    } catch { return false }
  })

  const items = [
    { label: 'Add a profile photo',  done: hasAvatar,  icon: User,     anchor: '#avatar'  },
    { label: 'Write a bio',          done: hasBio,     icon: FileText, anchor: '#bio'     },
    { label: 'Add your website',     done: hasWebsite, icon: Globe,    anchor: '#website' },
  ]

  const completedCount = items.filter(i => i.done).length
  const totalCount = items.length
  const percentage = Math.round((completedCount / totalCount) * 100)

  // All done or dismissed — hide
  if (dismissed || completedCount === totalCount) return null

  return (
    <div className="relative rounded-2xl border border-primary/20 bg-primary/5 p-5 overflow-hidden">

      {/* Background glow */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />

      {/* Dismiss button */}
      <button
       onClick={() => {
        try { sessionStorage.setItem(PROFILE_SESSION_KEY, '1') } catch {}
        setDismissed(true)
      }}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-muted/50"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>

      <div className="space-y-4">

        {/* Header */}
        <div className="space-y-1 pr-6">
          <div className="flex items-center gap-2">
            <p className="text-sm font-black">Complete your profile</p>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
              {percentage}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            A complete profile gets more followers and builds trust with the community.
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Checklist */}
        <div className="flex flex-col sm:flex-row gap-2">
          {items.map(({ label, done, icon: Icon, anchor }) => (
            <Link
              key={label}
              href={`/dashboard/settings${anchor}`}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all flex-1',
                done
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 cursor-default pointer-events-none'
                  : 'border-border bg-card hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground'
              )}
            >
              {done
                ? <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                : <Circle size={13} className="text-muted-foreground/50 shrink-0" />
              }
              <Icon size={12} className="shrink-0" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}