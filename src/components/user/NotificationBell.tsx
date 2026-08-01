'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getDashboardRoutes, getAdminRoutes } from '@/lib/utils/routes'
import type { UserType } from '@/lib/utils/routes'
import { getFirebaseMessaging } from '@/lib/firebase/client'
import { onMessage } from 'firebase/messaging'
import { isProUser } from '@/lib/access'

interface Notification {
  id:      string
  is_read: boolean
}

export function NotificationBell({ userId }: { userId: string }) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifHref,   setNotifHref]   = useState<string | null>(null) // null = not resolved yet
  const router   = useRouter()
  const supabase = createClient()

  useEffect(() => {
    let isMounted = true
    const fetchProfile = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser || !isMounted) return
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('role, is_pro, pro_expires_at, user_type')
        .eq('id', currentUser.id)
        .single()
      if (!profile || !isMounted) return

      // FIX: this previously derived the bell's destination purely from
      // user_type (reader/creator), with no admin/moderator case at all.
      // An admin's bell silently sent them to their personal reader or
      // creator dashboard's notifications page — nowhere near the report
      // queue their notifications were actually about.
      if (['admin', 'moderator'].includes(profile.role)) {
        if (isMounted) setNotifHref(getAdminRoutes().notifications)
        return
      }

      // Real Pro status only — moderator does NOT count as Pro here.
      const isPro = isProUser(profile)
      const userType = (profile.user_type ?? 'reader') as UserType
      const routes   = getDashboardRoutes(userType, isPro)
      if (isMounted) setNotifHref(routes.notifications)
    }
    fetchProfile()
    return () => { isMounted = false }
  }, [supabase])

  // Fetch unread count + realtime subscription
  const fetchUnread = useCallback(async () => {
    const res  = await fetch('/api/notifications')
    const data = await res.json()
    const notifs: Notification[] = data.notifications ?? []
    setUnreadCount(notifs.filter((n: Notification) => !n.is_read).length)
  }, [])

  useEffect(() => {
    let isMounted = true
    fetchUnread()

    const channel = supabase.channel(`notifications_bell_${userId}_${Date.now()}`)

    channel
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, () => {
        if (isMounted) setUnreadCount(prev => prev + 1)
      })
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [userId, fetchUnread, supabase])

  // Foreground FCM messages — when the tab is open and focused, FCM does NOT
  // go through the service worker's onBackgroundMessage, it fires here instead.
  useEffect(() => {
    let unsubscribe: (() => void) | undefined

    const setupForegroundListener = async () => {
      const messaging = await getFirebaseMessaging()
      if (!messaging) return // unsupported browser, e.g. some iOS Safari contexts

      unsubscribe = onMessage(messaging, (payload) => {
        setUnreadCount(prev => prev + 1)

        if (Notification.permission === 'granted' && payload.notification) {
          new Notification(payload.notification.title ?? 'ComPicfy', {
            body: payload.notification.body,
            icon: payload.notification.image ?? '/icons/icon-192.png',
          })
        }
      })
    }

    setupForegroundListener()
    return () => { unsubscribe?.() }
  }, [])

  return (
    <button
      onClick={() => { if (notifHref) router.push(notifHref) }}
      disabled={!notifHref}
      className="relative h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors outline-none disabled:opacity-60 disabled:cursor-wait"
      aria-label="Go to notifications"
    >
      <Bell size={16} />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  )
}