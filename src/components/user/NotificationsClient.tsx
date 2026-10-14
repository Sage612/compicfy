'use client'

import { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { timeAgo } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import type { Notification as DbNotification } from '@/types/app.types'

export type Notification = Omit<DbNotification, 'data'> & { data: Record<string, any> | null }

// One neutral look for every type — the label is the only thing that varies.
// The unread dot is the single accent.
const TYPE_LABEL: Record<string, string> = {
  vote:                 'Vote',
  vote_milestone:       'Milestone',
  review:               'Review',
  reply:                'Reply',
  follow:               'Follow',
  feature:              'Featured',
  achievement:          'Achievement',
  chapter_update:       'New chapter',
  // Fires once when a bake's target chapter count is reached (chapter-check cron).
  bake_ready:           'Ready to binge',
  collection_saved:     'Collection saved',
  list_starred:         'List starred',
  followed_user_posted: 'New post',
  admin_new_submission: 'Needs review',
  system:               'System',
}

const FILTERS = [
  { key: 'all',                   label: 'All'          },
  { key: 'vote',                  label: 'Votes'        },
  { key: 'vote_milestone',        label: 'Milestones'   },
  { key: 'follow',                label: 'Follows'      },
  { key: 'review',                label: 'Reviews'      },
  { key: 'feature',               label: 'Featured'     },
  { key: 'chapter_update',        label: 'Chapters'     },
  { key: 'bake_ready',            label: 'Baked'        },
  { key: 'collection_saved',      label: 'Collections'  },
  { key: 'list_starred',          label: 'Lists'        },
  { key: 'followed_user_posted',  label: 'Following'    },
  { key: 'admin_new_submission',  label: 'Review queue' },
  { key: 'achievement',           label: 'Achievements' },
  { key: 'system',                label: 'System'       },
] as const

type FilterKey = typeof FILTERS[number]['key']

interface Props {
  initialNotifications: Notification[]
  profileBase?: string
  isAdminView?: boolean
}

export function NotificationsClient({ initialNotifications, profileBase = '/reader', isAdminView = false }: Props) {
  const [notifications,  setNotifications]  = useState<Notification[]>(initialNotifications)
  const [isClearingAll,  setIsClearingAll]  = useState(false)
  const [isMarkingAll,   setIsMarkingAll]   = useState(false)
  const [activeFilter,   setActiveFilter]   = useState<FilterKey>('all')
  const [usernameCache,  setUsernameCache]  = useState<Record<string, string>>({})
  const [markingReadId,  setMarkingReadId]  = useState<string | null>(null)
  const [markedReadIds,  setMarkedReadIds]  = useState<Set<string>>(new Set())
  const supabase = createClient()

  useEffect(() => {
    const followNotifs = notifications.filter(
      n => n.type === 'follow' && n.data?.follower_id &&
           !n.data?.follower_username && !n.data?.username
    )
    if (!followNotifs.length) return

    const ids = [...new Set(followNotifs.map(n => n.data?.follower_id as string))]
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
        newEntries[row.id] = `${row.username}|${row.user_type ?? 'reader'}`
      }
      setUsernameCache(prev => ({ ...prev, ...newEntries }))
    }
    fetchUsernames()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications])

  const getHref = (notif: Notification): string | null => {
    const data = notif.data ?? {}

    switch (notif.type) {
      case 'vote':
      case 'vote_milestone':
      case 'review':
      case 'reply':
      case 'feature':
      case 'chapter_update':
      // No dedicated bake page — same destination as chapter_update.
      case 'bake_ready':
      case 'followed_user_posted':
      case 'achievement':
        return data.recommendation_id ? `/comic/${data.recommendation_id}` : null

      case 'follow': {
        if (data.follower_username) {
          const base = data.follower_type === 'creator' ? '/creator' : '/profile'
          return `${base}/${data.follower_username}`
        }
        if (data.username) return `${profileBase}/${data.username}`
        if (data.follower_id && usernameCache[data.follower_id]) {
          const [username, userType] = usernameCache[data.follower_id].split('|')
          const base = userType === 'creator' ? '/creator' : '/reader'
          return `${base}/${username}`
        }
        return null
      }

      case 'collection_saved':
        return data.collection_id ? `/collections/${data.collection_id}` : null

      case 'list_starred':
        return data.list_id ? `/lists/${data.list_id}` : null

      case 'admin_new_submission':
        return '/admin/recommendations'

      case 'system': {
        if (data.entity_type && data.entity_id) {
          if (isAdminView) return '/admin/reports'
          if (data.entity_type === 'recommendation') return `/comic/${data.entity_id}`
          return null
        }
        return data.recommendation_id ? `/comic/${data.recommendation_id}` : null
      }

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
    if (!notifications.some(n => !n.is_read)) return
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

  const handleMarkChapterRead = async (e: React.MouseEvent, notif: Notification) => {
    e.preventDefault()
    e.stopPropagation()
    const { recommendation_id, new_chapter_count, list_id, status } = notif.data ?? {}
    if (!recommendation_id || !list_id || new_chapter_count == null) return

    setMarkingReadId(notif.id)
    try {
      const res = await fetch(`/api/reading-progress/${recommendation_id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list_id, status: status ?? 'reading', progress_chapter: new_chapter_count }),
      })
      if (!res.ok) throw new Error()
      setMarkedReadIds(prev => new Set(prev).add(notif.id))
      markOneRead(notif.id)
      toast.success(`Marked as read — ch. ${new_chapter_count}`)
    } catch {
      toast.error('Failed to update progress')
    } finally {
      setMarkingReadId(null)
    }
  }

  const filtered       = activeFilter === 'all' ? notifications : notifications.filter(n => n.type === activeFilter)
  const unreadCount    = notifications.filter(n => !n.is_read).length
  const presentTypes   = new Set(notifications.map(n => n.type))
  const visibleFilters = FILTERS.filter(f => f.key === 'all' || presentTypes.has(f.key as any))

  if (!notifications.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-border space-y-1 text-center">
        <p className="font-dashboard-serif text-lg text-foreground">All caught up</p>
        <p className="text-sm text-muted-foreground">Votes, reviews, follows and chapter updates will appear here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {visibleFilters.map(f => (
          <button
            key={f.key}
            onClick={() => setActiveFilter(f.key)}
            className={cn(
              'shrink-0 px-3 py-1.5 rounded-full text-xs border transition-colors whitespace-nowrap',
              activeFilter === f.key
                ? 'bg-foreground text-background border-foreground'
                : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
            )}
          >
            {f.label}
            {f.key !== 'all' && (
              <span className="ml-1.5 opacity-60 tabular-nums">{notifications.filter(n => n.type === f.key).length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground shrink-0">
          <span className="text-foreground tabular-nums">{unreadCount}</span> unread
          {activeFilter !== 'all' && <span className="ml-1 text-muted-foreground/60">· {filtered.length} shown</span>}
        </span>
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button onClick={markAllRead} disabled={isMarkingAll}
              className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors whitespace-nowrap">
              {isMarkingAll ? 'Marking…' : 'Mark all read'}
            </button>
          )}
          <button onClick={dismissAll} disabled={isClearingAll}
            className="text-xs text-muted-foreground hover:text-destructive disabled:opacity-50 transition-colors whitespace-nowrap">
            {isClearingAll ? 'Clearing…' : 'Clear all'}
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 rounded-xl border border-dashed border-border space-y-2 text-center">
          <p className="text-sm text-muted-foreground">No {activeFilter.replace(/_/g, ' ')} notifications</p>
          <button onClick={() => setActiveFilter('all')} className="text-xs text-foreground underline underline-offset-4">Show all</button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(notif => {
            const label = TYPE_LABEL[notif.type] ?? TYPE_LABEL.system
            const href  = getHref(notif)

            const isResolvingFollow = notif.type === 'follow' && !href
            const isChapterUpdate   = notif.type === 'chapter_update'
            const canMarkRead       = isChapterUpdate && !!notif.data?.list_id
            const isMarkingThis     = markingReadId === notif.id
            const alreadyMarked     = markedReadIds.has(notif.id)
            const sourceUrl         = notif.data?.source_url as string | undefined
            const sourceLabel       = notif.data?.source_label as string | undefined

            const inner = (
              <div className={cn(
                'group relative flex gap-3 p-4 rounded-xl border bg-card transition-colors hover:border-foreground/30',
                notif.is_read ? 'border-border' : 'border-foreground/20',
                isResolvingFollow && 'opacity-70'
              )}>
                <span className={cn('mt-1.5 w-1.5 h-1.5 rounded-full shrink-0', notif.is_read ? 'bg-transparent' : 'bg-primary')} />

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <p className={cn('text-sm leading-snug', notif.is_read ? 'text-foreground/80' : 'text-foreground font-medium')}>
                        {notif.title}
                      </p>
                      {notif.content && <p className="text-xs text-muted-foreground leading-relaxed">{notif.content}</p>}
                    </div>
                    <button
                      onClick={e => dismiss(e, notif.id)}
                      className="text-muted-foreground/50 hover:text-foreground shrink-0 p-1 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity"
                      aria-label="Dismiss"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    <span className="uppercase tracking-widest text-[10px] text-muted-foreground/70">{label}</span>
                    {notif.created_at && <> · {timeAgo(notif.created_at)}</>}
                    {isResolvingFollow && <span className="italic text-muted-foreground/50"> · loading profile…</span>}
                  </p>

                  {isChapterUpdate && (sourceUrl || canMarkRead) && (
                    <div className="flex items-center gap-4 pt-1.5" onClick={e => e.stopPropagation()}>
                      {sourceUrl && (
                        <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors">
                          Read on {sourceLabel ?? 'source'}
                        </a>
                      )}
                      {canMarkRead && (
                        alreadyMarked ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Check size={11} /> Marked as read</span>
                        ) : (
                          <button onClick={e => handleMarkChapterRead(e, notif)} disabled={isMarkingThis}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                            {isMarkingThis ? 'Saving…' : 'Mark as read'}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            )

            return href ? (
              <Link key={notif.id} href={href} className="block" onClick={() => markOneRead(notif.id)}>{inner}</Link>
            ) : (
              <div key={notif.id} onClick={() => markOneRead(notif.id)} className={!notif.is_read ? 'cursor-pointer' : ''}>{inner}</div>
            )
          })}
        </div>
      )}
    </div>
  )
}