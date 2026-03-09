'use client'

import { useEffect, useState, useCallback } from 'react'
import { Bell } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { timeAgo } from '@/lib/utils/format'
import { createClient } from '@/lib/supabase/client'

interface Notification {
  id: string
  type: string
  title: string
  is_read: boolean
  created_at: string
  data?: Record<string, any>
}

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const supabase = createClient()

  const fetchNotifications = useCallback(async () => {
    const res = await fetch('/api/notifications')
    const data = await res.json()
    setNotifications(data.notifications ?? [])
  }, [])

  useEffect(() => {
    fetchNotifications()

    // Realtime subscription for new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, fetchNotifications])

  const unreadCount = notifications.filter((n) => !n.is_read).length
  const preview = notifications.slice(0, 5)

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH' })
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  const dismiss = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen && unreadCount > 0) {
      setTimeout(markAllRead, 1500)
    }
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent transition-colors outline-none"
          aria-label="Notifications"
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <button onClick={markAllRead} className="text-xs text-primary hover:underline">
              Mark all read
            </button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {preview.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <Bell size={24} className="mx-auto mb-2 opacity-30" />
              No notifications
            </div>
          ) : (
            preview.map((notif) => {
              const href = notif.data?.recommendation_id
                ? `/comic/${notif.data.recommendation_id}`
                : '/dashboard/notifications'

              return (
                <Link
                  key={notif.id}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'group flex items-start gap-3 px-4 py-3 hover:bg-accent/50 transition-colors border-b border-border/50 last:border-0',
                    !notif.is_read && 'bg-primary/5'
                  )}
                >
                  {!notif.is_read && (
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                  )}
                  <div className={cn('flex-1 min-w-0', notif.is_read && 'pl-5')}>
                    <p className={cn('text-xs leading-snug', !notif.is_read && 'font-medium')}>
                      {notif.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {timeAgo(notif.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => dismiss(e, notif.id)}
                    className="text-muted-foreground hover:text-foreground text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity px-1"
                    aria-label="Dismiss"
                  >
                    ✕
                  </button>
                </Link>
              )
            })
          )}
        </div>

        {notifications.length > 0 && (
          <div className="px-4 py-2 border-t border-border">
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="text-xs text-primary hover:underline"
            >
              View all notifications →
            </Link>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}