'use client'

import { useState, useCallback, useEffect } from 'react'
import { Bell } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getDashboardRoutes } from '@/lib/utils/routes'
import type { UserType } from '@/lib/utils/routes'

interface Notification {
  id:         string
  type:       string
  title:      string
  is_read:    boolean
  created_at: string
  data?:      Record<string, any>
}

export function NotificationBell({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifHref, setNotifHref] = useState('/reader/dashboard/notifications')
  const supabase = createClient()

  // ── Resolve dashboard-aware notifications href dynamically ──────
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

      const isPro = profile.role === 'admin' || profile.role === 'moderator' ||
        (profile.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))
      const userType = (profile.user_type ?? 'reader') as UserType
      const routes = getDashboardRoutes(userType, isPro)

      if (isMounted) setNotifHref(routes.notifications)
    }

    fetchProfile()
    return () => { isMounted = false }
  }, [])

  const fetchNotifications = useCallback(async (): Promise<Notification[] | null> => {
    const res  = await fetch('/api/notifications')
    const data = await res.json()
    return data.notifications ?? []
  }, [])

  // ── Initial fetch + realtime subscription ────────────────────────
  useEffect(() => {
    let isMounted = true

    const loadInitial = async () => {
      const result = await fetchNotifications()
      if (isMounted && result) setNotifications(result)
    }
    loadInitial()

    const channelName = `notifications:${userId}:${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        if (!isMounted) return
        setNotifications(prev => [payload.new as Notification, ...prev])
      })
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [userId, fetchNotifications])

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <Link
      href={notifHref}
      className="relative h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors outline-none text-foreground"
      aria-label="Notifications"
    >
      <Bell size={16} />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center animate-in fade-in zoom-in-50">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  )
}
