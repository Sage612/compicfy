'use client'

import { useState } from 'react'
import { Bell, Trash2 } from 'lucide-react'
import { timeAgo } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'

interface Notification {
  id:         string
  type:       string
  title:      string
  is_read:    boolean
  created_at: string
  data?:      Record<string, any>
}

export function NotificationsClient({
  initialNotifications,
}: {
  initialNotifications: Notification[]
}) {
  const [notifications, setNotifications] = useState(initialNotifications)

  const dismiss = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    toast.success('Notification dismissed')
  }

  const dismissAll = async () => {
    await Promise.all(
      notifications.map((n) => fetch(`/api/notifications/${n.id}`, { method: 'DELETE' }))
    )
    setNotifications([])
    toast.success('All notifications cleared')
  }

  if (!notifications.length) {
    return (
      /* ── Unified comic-panel empty state ── */
      <div className="relative flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border overflow-hidden">
        {/* blobs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />

        {/* stacked panels */}
        <div className="relative mb-8 w-36 h-36 mx-auto">
          <div className="absolute top-0 left-0 w-20 h-28 rounded-2xl border-2 border-border bg-card rotate-[-12deg] opacity-40" />
          <div className="absolute top-2 left-6 w-20 h-28 rounded-2xl border-2 border-border bg-card rotate-[-5deg] opacity-60" />
          <div className="absolute top-4 left-10 w-20 h-28 rounded-2xl border-2 border-primary/30 bg-card shadow-xl flex flex-col items-center justify-center gap-1">
            <Bell size={18} className="text-primary opacity-60" />
            <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-center px-1">All clear</span>
          </div>
        </div>

        <p className="text-sm font-black">No notifications yet</p>
        <p className="text-xs text-muted-foreground mt-1 text-center max-w-xs px-4">
          You'll be notified about your recommendations, reviews, and account activity.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Clear all */}
      <div className="flex justify-end">
        <button
          onClick={dismissAll}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
        >
          <Trash2 size={12} />
          Clear all
        </button>
      </div>

      {notifications.map((notif) => {
        const href = notif.data?.recommendation_id
          ? `/comic/${notif.data.recommendation_id}`
          : null

        return (
          <div
            key={notif.id}
            className={cn(
              'flex items-stretch rounded-xl border transition-colors',
              notif.is_read
                ? 'border-border bg-card'
                : 'border-primary/20 bg-primary/5'
            )}
          >
            <div className="flex items-start gap-3 p-4 flex-1 min-w-0">
              {!notif.is_read && (
                <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
              )}
              <div className={cn('flex-1 min-w-0', notif.is_read && 'pl-5')}>
                {href ? (
                  <Link
                    href={href}
                    className={cn(
                      'text-sm leading-snug hover:text-primary transition-colors',
                      !notif.is_read && 'font-medium'
                    )}
                  >
                    {notif.title}
                  </Link>
                ) : (
                  <p className={cn('text-sm leading-snug', !notif.is_read && 'font-medium')}>
                    {notif.title}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">{timeAgo(notif.created_at)}</p>
              </div>
            </div>
            <button
              onClick={() => dismiss(notif.id)}
              className="px-4 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors rounded-r-xl shrink-0 text-sm"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )
      })}
    </div>
  )
}