'use client'

import { useState } from 'react'
import { Bell, Trash2, BellOff } from 'lucide-react'
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
      /* ── Empty state: simple icon, no stacked panels ── */
      <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
          <BellOff size={26} className="text-muted-foreground opacity-50" />
        </div>
        <p className="text-sm font-black">All clear</p>
        <p className="text-xs text-muted-foreground mt-1 text-center max-w-xs px-4">
          You'll see votes, reviews, and follows here when they come in.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
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