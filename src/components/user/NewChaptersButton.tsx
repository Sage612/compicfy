'use client'

import { useCallback, useEffect, useState } from 'react'
import { BookMarked } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getDashboardRoutes } from '@/lib/utils/routes'
import type { UserType } from '@/lib/utils/routes'
import { isProUser } from '@/lib/access'

// Converted from a DropdownMenu to a plain link, matching
// NotificationBell's real pattern exactly - per explicit direction, the
// real content (chapter updates AND bakes together, plus a chapter-range
// picker that a cramped DropdownMenuContent popover couldn't comfortably
// hold) now lives on a dedicated /updates page. This button is now just
// a badge-count entry point into that page, the same way NotificationBell
// is a badge-count entry point into /notifications - no dropdown content
// rendered here at all anymore.

export function NewChaptersButton({ userId }: { userId: string }) {
  const [count,     setCount]     = useState(0)
  const [updatesHref, setUpdatesHref] = useState<string | null>(null) // null = not resolved yet
  const router   = useRouter()
  const supabase = createClient()

  // Resolve the Free/Pro-aware /updates destination - identical pattern
  // to NotificationBell's own profile fetch for notifHref.
  useEffect(() => {
    let isMounted = true
    const fetchProfile = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser || !isMounted) return
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('role, is_pro, pro_expires_at, is_patron, patron_expires_at, user_type')
        .eq('id', currentUser.id)
        .single()
      if (!profile || !isMounted) return

      // No admin/moderator special-case here (unlike NotificationBell) -
      // updates (chapter tracking, bakes) are a reader-only concept, so
      // an admin viewing this button still just wants their own reader
      // updates page, not an admin equivalent that doesn't exist.
      const isPro = isProUser(profile)
      const userType = (profile.user_type ?? 'reader') as UserType
      const routes   = getDashboardRoutes(userType, isPro)
      if (isMounted && routes.updates) setUpdatesHref(routes.updates)
    }
    fetchProfile()
    return () => { isMounted = false }
  }, [supabase])

  const fetchCount = useCallback(async () => {
    try {
      const [updatesRes, bakesRes] = await Promise.all([
        fetch('/api/reading-progress/updates'),
        fetch('/api/bakes'),
      ])
      const updatesData = await updatesRes.json()
      const bakesData   = await bakesRes.json()
      const updatesCount = (updatesData.updates ?? []).length
      // Only FULFILLED bakes count toward this badge - an active bake
      // still cooking isn't something needing attention yet, same
      // reasoning as why NotificationBell only counts unread
      // notifications, not all of them.
      const readyBakesCount = (bakesData.bakes ?? []).filter((b: any) => b.status === 'fulfilled').length
      setCount(updatesCount + readyBakesCount)
    } catch {
      /* silent — this is a nice-to-have indicator, not critical path */
    }
  }, [])

  useEffect(() => {
    fetchCount()
  }, [fetchCount])

  // Refetch when a chapter_update or bake_ready notification comes in -
  // same realtime-piggyback pattern as before, just triggering a count
  // refresh instead of a dropdown-content refresh.
  useEffect(() => {
    const channel = supabase.channel(`new_chapters_${userId}_${Date.now()}`)
    channel
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'notifications',
        filter: `user_id=eq.${userId}`,
      }, (payload: any) => {
        if (payload.new?.type === 'chapter_update' || payload.new?.type === 'bake_ready') {
          fetchCount()
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, fetchCount, supabase])

  return (
    <button
      onClick={() => { if (updatesHref) router.push(updatesHref) }}
      disabled={!updatesHref}
      className="relative h-8 w-8 flex items-center justify-center rounded-lg active:bg-accent md:hover:bg-accent transition-colors outline-none focus:outline-none focus-visible:outline-none disabled:opacity-60 disabled:cursor-wait"
      aria-label="Comics with new chapters and ready bakes"
    >
      <BookMarked size={16} />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </button>
  )
}