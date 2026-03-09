'use client'

import { useState } from 'react'
import { Bell, Trash2 } from 'lucide-react'
import { timeAgo } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'

interface Notification {
  id: string
  type: string
  title: string
  is_read: boolean
  created_at: string
  data?: Record<string, any>
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
      <div className="text-center py-16 text-muted-foreground">
        <Bell size={40} className="mx-auto mb-3 opacity-30" />
        <p className="font-semibold">No notifications yet</p>
        <p className="text-sm mt-1">
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
            {/* Content */}
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
                <p className="text-xs text-muted-foreground mt-1">
                  {timeAgo(notif.created_at)}
                </p>
              </div>
            </div>

            {/* Dismiss */}
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