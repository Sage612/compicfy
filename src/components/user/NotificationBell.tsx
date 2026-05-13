'use client'

import { useState, useCallback, useEffect } from 'react'
import { Bell, BellOff } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { timeAgo } from '@/lib/utils/format'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Notification {
  id:         string
  type:       string
  title:      string
  is_read:    boolean
  created_at: string
  data?:      Record<string, any>
}



async function subscribeToPush(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) return false

    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false

    // Register Firebase messaging service worker
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
    await navigator.serviceWorker.ready

    const { getFirebaseMessaging } = await import('@/lib/firebase/client')
    const { getToken } = await import('firebase/messaging')

    const messaging = await getFirebaseMessaging()
    if (!messaging) return false

    const token = await getToken(messaging, {
      vapidKey:            process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: reg,
    })

    if (!token) return false

    const res = await fetch('/api/push/subscribe', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ token }),
    })

    return res.ok
  } catch (err) {
    console.error('Push subscription error:', err)
    return false
  }
}

async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const { getFirebaseMessaging } = await import('@/lib/firebase/client')
    const { getToken, deleteToken } = await import('firebase/messaging')

    const messaging = await getFirebaseMessaging()
    if (!messaging) return false

    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    })

    if (token) {
      await fetch('/api/push/subscribe', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ token }),
      })
      await deleteToken(messaging)
    }

    return true
  } catch {
    return false
  }
}

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open,          setOpen]          = useState(false)
  const [pushEnabled,   setPushEnabled]   = useState<boolean | null>(null)
  const [pushLoading,   setPushLoading]   = useState(false)
  const [notifHref, setNotifHref] = useState('/dashboard/notifications')
  const supabase = createClient()

  useEffect(() => {
    const fetchProStatus = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('role, is_pro, pro_expires_at')
        .eq('id', currentUser.id)
        .single()
      if (!profile) return
      const isPro =
        profile.role === 'admin' ||
        profile.role === 'moderator' ||
        (profile.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))
      setNotifHref(isPro ? '/pro/notifications' : '/dashboard/notifications')
    }
    fetchProStatus()
  }, [supabase])

  const fetchNotifications = useCallback(async () => {
    const res  = await fetch('/api/notifications')
    const data = await res.json()
    setNotifications(data.notifications ?? [])
  }, [])

  // Check current push state on mount
  useEffect(() => {
    const checkPush = async () => {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) return
      if (Notification.permission === 'denied') { setPushEnabled(false); return }
      if (Notification.permission !== 'granted') { setPushEnabled(false); return }

      try {
        const { getFirebaseMessaging } = await import('@/lib/firebase/client')
        const { getToken } = await import('firebase/messaging')
        const messaging = await getFirebaseMessaging()
        if (!messaging) { setPushEnabled(false); return }

        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        })
        setPushEnabled(!!token)
      } catch {
        setPushEnabled(false)
      }
    }
    checkPush()
  }, [])

  useEffect(() => {
    fetchNotifications()

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications(prev => [payload.new as Notification, ...prev])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, fetchNotifications])

  const unreadCount = notifications.filter(n => !n.is_read).length
  const preview     = notifications.slice(0, 5)

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH' })
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const dismiss = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen)
    if (isOpen && unreadCount > 0) {
      setTimeout(markAllRead, 1500)
    }
  }

  const handleTogglePush = async () => {
    setPushLoading(true)
    try {
      if (pushEnabled) {
        const ok = await unsubscribeFromPush()
        if (ok) {
          setPushEnabled(false)
          toast.success('Push notifications disabled')
        }
      } else {
        if (Notification.permission === 'denied') {
          toast.error('Notifications blocked, enable them in your browser settings')
          return
        }
        const ok = await subscribeToPush()
        if (ok) {
          setPushEnabled(true)
          toast.success('Push notifications enabled! 🔔')
        } else {
          toast.error('Could not enable push notifications')
        }
      }
    } finally {
      setPushLoading(false)
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

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        collisionPadding={12}
        className="w-[calc(100vw-24px)] sm:w-80 p-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold">Notifications</span>
          <div className="flex items-center gap-2">
            {pushEnabled !== null && 'Notification' in window && (
              <button
                onClick={handleTogglePush}
                disabled={pushLoading}
                className={cn(
                  'flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full border transition-all',
                  pushEnabled
                    ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
                    : 'border-border text-muted-foreground hover:border-primary/40 hover:text-primary'
                )}
                title={pushEnabled ? 'Disable push notifications' : 'Enable push notifications'}
              >
                {pushEnabled
                  ? <><Bell size={9} /> On</>
                  : <><BellOff size={9} /> Off</>
                }
              </button>
            )}
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Push prompt — only shown when permission not yet asked */}
        {'Notification' in window && Notification.permission === 'default' && pushEnabled === false && (
          <div className="px-4 py-3 border-b border-border bg-primary/5">
            <p className="text-xs font-semibold text-foreground">Stay in the loop</p>
            <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">
              Get notified when someone votes or reviews your comics
            </p>
            <button
              onClick={handleTogglePush}
              disabled={pushLoading}
              className="w-full h-7 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity"
            >
              Enable notifications 🔔
            </button>
          </div>
        )}

        {/* Notification list */}
        <div className="max-h-80 overflow-y-auto">
          {preview.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              <BellOff size={24} className="mx-auto mb-2 opacity-30" />
              No notifications yet
            </div>
          ) : (
            preview.map((notif) => {
              const href = notif.data?.recommendation_id
                ? `/comic/${notif.data.recommendation_id}`
                : notif.data?.follower_id
                ? `/profile/${notif.data.follower_id}`
                : notifHref

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
              href={notifHref}
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