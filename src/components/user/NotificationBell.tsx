'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getDashboardRoutes } from '@/lib/utils/routes'
import type { UserType } from '@/lib/utils/routes'

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
      const isPro = profile.role === 'admin' || profile.role === 'moderator' ||
        (profile.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))
      const userType = (profile.user_type ?? 'reader') as UserType
      const routes   = getDashboardRoutes(userType, isPro)
      if (isMounted) setNotifHref(routes.notifications)
    }
    fetchProfile()
    return () => { isMounted = false }
  }, [supabase])

  // ── Fetch unread count + realtime subscription ──────────────────
  const fetchUnread = useCallback(async () => {
    const res  = await fetch('/api/notifications')
    const data = await res.json()
    const notifs: Notification[] = data.notifications ?? []
    setUnreadCount(notifs.filter((n: Notification) => !n.is_read).length)
  }, [])

  useEffect(() => {
    let isMounted = true
    fetchUnread()

    // Fixed channel name format to remain completely static across re-renders
    const channel = supabase.channel(`notifications_bell_${userId}`)

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
