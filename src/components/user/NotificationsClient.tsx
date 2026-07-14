'use client'

import { useState, useEffect } from 'react'
import {
  BellOff, Trash2, ThumbsUp, BookOpen,
  MessageSquare, UserPlus, AlertCircle,
  Star, Zap, CheckCircle2, Check, Trophy,
} from 'lucide-react'
import { timeAgo } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Notification {
  id:         string
  user_id:    string
  type:       'vote' | 'vote_milestone' | 'review' | 'reply' | 'feature' | 'achievement' | 'system' | 'follow' | 'chapter_update'
  title:      string
  content:    string | null
  data:       any
  is_read:    boolean
  read_at:    string | null
  created_at: string
}

const TYPE_META: Record<string, { icon: React.ReactNode; colorClass: string; label: string }> = {
  vote:           { icon: <ThumbsUp      size={13} className="text-emerald-500"      />, colorClass: 'bg-emerald-500/10 border-emerald-500/20', label: 'Vote'        },
  vote_milestone: { icon: <Trophy        size={13} className="text-yellow-500"       />, colorClass: 'bg-yellow-500/10 border-yellow-500/20',   label: 'Milestone'   },
  review:         { icon: <Star          size={13} className="text-amber-500"        />, colorClass: 'bg-amber-500/10 border-amber-500/20',     label: 'Review'      },
  reply:          { icon: <MessageSquare size={13} className="text-blue-500"         />, colorClass: 'bg-blue-500/10 border-blue-500/20',       label: 'Reply'       },
  follow:         { icon: <UserPlus      size={13} className="text-violet-500"       />, colorClass: 'bg-violet-500/10 border-violet-500/20',   label: 'Follow'      },
  feature:        { icon: <Zap           size={13} className="text-amber-500"        />, colorClass: 'bg-amber-500/10 border-amber-500/20',     label: 'Featured'    },
  achievement:    { icon: <CheckCircle2  size={13} className="text-teal-500"         />, colorClass: 'bg-teal-500/10 border-teal-500/20',       label: 'Achievement' },
  chapter_update: { icon: <BookOpen      size={13} className="text-primary"          />, colorClass: 'bg-primary/10 border-primary/20',         label: 'New Chapter' },
  system:         { icon: <AlertCircle   size={13} className="text-muted-foreground" />, colorClass: 'bg-muted border-border/60',               label: 'System'      },
}

const FILTERS = [
  { key: 'all',            label: 'All'          },
  { key: 'vote',           label: 'Votes'        },
  { key: 'vote_milestone', label: 'Milestones'   },
  { key: 'follow',         label: 'Follows'      },
  { key: 'review',         label: 'Reviews'      },
  { key: 'feature',        label: 'Featured'     },
  { key: 'chapter_update', label: 'Chapters'     },
  { key: 'achievement',    label: 'Achievements' },
  { key: 'system',         label: 'System'       },
] as const

type FilterKey = typeof FILTERS[number]['key']

interface Props {
  initialNotifications: Notification[]
  profileBase?: string
}

export function NotificationsClient({ initialNotifications, profileBase = '/reader' }: Props) {
  const [notifications,  setNotifications]  = useState<Notification[]>(initialNotifications)
  const [isClearingAll,  setIsClearingAll]  = useState(false)
  const [isMarkingAll,   setIsMarkingAll]   = useState(false)
  const [activeFilter,   setActiveFilter]   = useState<FilterKey>('all')
  // Cache: follower_id → username resolved from profiles table
  const [usernameCache,  setUsernameCache]  = useState<Record<string, string>>({})
  const supabase = createClient()

  // ── Resolve usernames for follow notifications that only have follower_id ──
  // Handles 3 data shapes:
  //   1. New:  { follower_id, follower_username, follower_type }  → use directly
  //   2. Mid:  { follower_id, username }                          → remap to follower_username
  //   3. Old:  { follower_id }                                    → fetch from profiles
  useEffect(() => {
    const followNotifs = notifications.filter(
      n => n.type === 'follow' && n.data?.follower_id &&
           !n.data?.follower_username && !n.data?.username
    )
    if (!followNotifs.length) return

    const ids = [...new Set(followNotifs.map(n => n.data.follower_id as string))]
    const missing = ids.filter(id => !usernameCache[id])
    if (!missing.length) return

    const fetchUsernames = async () => {
      const { data } = await (supabase as any)
        .from('profiles')
        .select('id, username, user_type')
        .in('id', missing)

      if (!data) return
      const newEntries: Record<string, string> = {}
      for (const row of data) {
        // Store as "username|user_type" so we can build the correct route
        newEntries[row.id] = `${row.username}|${row.user_type ?? 'reader'}`
      }
      setUsernameCache(prev => ({ ...prev, ...newEntries }))
    }
    fetchUsernames()
  }, [notifications])

  const getMeta = (type: string) => TYPE_META[type] ?? TYPE_META.system

  // Build href for a notification — handles both old (follower_id only) and new (follower_username) data
  const getHref = (notif: Notification): string | null => {
    const data = notif.data ?? {}

    switch (notif.type) {
      case 'vote':
      case 'vote_milestone':
      case 'review':
      case 'reply':
      case 'feature':
      case 'chapter_update':
        return data.recommendation_id ? `/comic/${data.recommendation_id}` : null

      case 'follow': {
        // Shape 1 — new: has follower_username + follower_type
        if (data.follower_username) {
          const base = data.follower_type === 'creator' ? '/creator' : '/reader'
          return `${base}/${data.follower_username}`
        }
        // Shape 2 — mid: has username (old field name, stored as data.username)
        if (data.username) {
          return `${profileBase}/${data.username}`
        }
        // Shape 3 — old: only follower_id, resolve from profiles cache
        if (data.follower_id && usernameCache[data.follower_id]) {
          const [username, userType] = usernameCache[data.follower_id].split('|')
          const base = userType === 'creator' ? '/creator' : '/reader'
          return `${base}/${username}`
        }
        return null // still loading from cache
      }

      case 'achievement':
      case 'system':
        return data.recommendation_id ? `/comic/${data.recommendation_id}` : null

      default:
        return null
    }
  }

  const markOneRead = async (id: string) => {
    const notif = notifications.find(n => n.id === id)
    if (!notif || notif.is_read) return
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch { /* silent */ }
  }

  const markAllRead = async () => {
    if (isMarkingAll) return
    const unread = notifications.filter(n => !n.is_read)
    if (!unread.length) return
    setIsMarkingAll(true)
    try {
      await fetch('/api/notifications', { method: 'PATCH' })
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
      toast.success('All marked as read')
    } catch { toast.error('Failed to mark all read') }
    finally { setIsMarkingAll(false) }
  }

  const dismiss = async (e: React.MouseEvent, id: string) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setNotifications(prev => prev.filter(n => n.id !== id))
      toast.success('Dismissed')
    } catch { toast.error('Could not dismiss') }
  }

  const dismissAll = async () => {
    if (isClearingAll) return
    setIsClearingAll(true)
    try {
      await Promise.all(notifications.map(n =>
        fetch(`/api/notifications/${n.id}`, { method: 'DELETE' }).catch(() => {})
      ))
      setNotifications([])
      toast.success('All cleared')
    } catch { toast.error('Failed to clear all') }
    finally { setIsClearingAll(false) }
  }

  const filtered       = activeFilter === 'all' ? notifications : notifications.filter(n => n.type === activeFilter)
  const unreadCount    = notifications.filter(n => !n.is_read).length
  const presentTypes   = new Set(notifications.map(n => n.type))
  const visibleFilters = FILTERS.filter(f => f.key === 'all' || presentTypes.has(f.key as any))

  if (!notifications.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border/60 space-y-3 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <BellOff size={22} className="text-muted-foreground/50" />
        </div>
        <div>
          <p className="font-black text-sm">All caught up</p>
          <p className="text-xs text-muted-foreground mt-1">Votes, reviews, follows and chapter updates will appear here.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* ── Horizontal scrollable filter pills ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {visibleFilters.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={cn(
              'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 whitespace-nowrap',
              activeFilter === f.key
                ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20'
                : 'bg-background/80 border-border/60 text-muted-foreground hover:text-foreground hover:border-border'
            )}
          >
            {f.key !== 'all' && (
              <span className={cn('opacity-80', activeFilter === f.key && '[&_svg]:text-primary-foreground')}>
                {TYPE_META[f.key]?.icon}
              </span>
            )}
            {f.label}
            {f.key !== 'all' && (
              <span className={cn(
                'inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-black',
                activeFilter === f.key ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
              )}>
                {notifications.filter(n => n.type === f.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Control bar ── */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground shrink-0">
          <span className="font-black text-foreground">{unreadCount}</span> unread
          {activeFilter !== 'all' && (
            <span className="ml-1 text-muted-foreground/60">· {filtered.length} {activeFilter}</span>
          )}
        </span>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              disabled={isMarkingAll}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary disabled:opacity-50 transition-colors px-2 py-1 rounded-lg hover:bg-primary/5 whitespace-nowrap"
            >
              <Check size={11} className={isMarkingAll ? 'animate-pulse' : ''} />
              {isMarkingAll ? 'Marking…' : 'Mark all read'}
            </button>
          )}
          <button
            onClick={dismissAll}
            disabled={isClearingAll}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50 transition-colors px-2 py-1 rounded-lg hover:bg-destructive/5 whitespace-nowrap"
          >
            <Trash2 size={11} className={isClearingAll ? 'animate-pulse' : ''} />
            {isClearingAll ? 'Clearing…' : 'Clear all'}
          </button>
        </div>
      </div>

      {/* ── List ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 rounded-2xl border border-dashed border-border/60 space-y-2 text-center">
          <BellOff size={18} className="text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No {activeFilter} notifications</p>
          <button onClick={() => setActiveFilter('all')} className="text-xs text-primary hover:underline">Show all</button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(notif => {
            const meta = getMeta(notif.type)
            const href = getHref(notif)

            // Follow notifications that are still resolving username show as non-clickable
            const isResolvingFollow = notif.type === 'follow' && !href

            const inner = (
              <div className={cn(
                'group relative flex gap-3 p-4 rounded-2xl border transition-all duration-200',
                notif.is_read
                  ? 'border-border bg-card hover:border-border/80'
                  : 'border-primary/20 bg-primary/5 hover:border-primary/30',
                isResolvingFollow && 'opacity-70'
              )}>
                {!notif.is_read && (
                  <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full bg-primary" />
                )}

                <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border mt-0.5', meta.colorClass)}>
                  {meta.icon}
                </div>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <p className={cn('text-sm leading-snug', !notif.is_read ? 'font-semibold text-foreground' : 'text-foreground/80')}>
                        {notif.title}
                      </p>
                      {notif.content && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{notif.content}</p>
                      )}
                    </div>
                    <button
                      onClick={e => dismiss(e, notif.id)}
                      className="text-muted-foreground/40 hover:text-destructive shrink-0 p-1 rounded-lg hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                      aria-label="Dismiss"
                    >✕</button>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-black border uppercase tracking-wide', meta.colorClass)}>
                      {meta.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{timeAgo(notif.created_at)}</span>
                    {!notif.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                    {isResolvingFollow && (
                      <span className="text-[10px] text-muted-foreground/50 italic">loading profile…</span>
                    )}
                  </div>
                </div>
              </div>
            )

            return href ? (
              <Link key={notif.id} href={href} className="block" onClick={() => markOneRead(notif.id)}>
                {inner}
              </Link>
            ) : (
              <div key={notif.id} onClick={() => markOneRead(notif.id)} className={!notif.is_read ? 'cursor-pointer' : ''}>
                {inner}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}