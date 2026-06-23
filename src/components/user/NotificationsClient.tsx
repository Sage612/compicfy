'use client'

import { useState } from 'react'
import {
  Bell, Trash2, BellOff, ThumbsUp,
  MessageSquare, UserPlus, AlertCircle,
  Star, Zap, CheckCircle2,
} from 'lucide-react'
import { timeAgo } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'

interface Notification {
  id:         string
  user_id:    string
  type:       'vote' | 'review' | 'reply' | 'feature' | 'achievement' | 'system' | 'follow'
  title:      string
  content:    string | null
  data:       any
  is_read:    boolean
  read_at:    string | null
  created_at: string
}

const TYPE_META: Record<string, {
  icon:       React.ReactNode
  colorClass: string
  label:      string
}> = {
  vote: {
    icon:       <ThumbsUp size={13} className="text-emerald-500" />,
    colorClass: 'bg-emerald-500/10 border-emerald-500/20',
    label:      'Vote',
  },
  review: {
    icon:       <Star size={13} className="text-amber-500" />,
    colorClass: 'bg-amber-500/10 border-amber-500/20',
    label:      'Review',
  },
  reply: {
    icon:       <MessageSquare size={13} className="text-blue-500" />,
    colorClass: 'bg-blue-500/10 border-blue-500/20',
    label:      'Reply',
  },
  follow: {
    icon:       <UserPlus size={13} className="text-violet-500" />,
    colorClass: 'bg-violet-500/10 border-violet-500/20',
    label:      'Follow',
  },
  feature: {
    icon:       <Zap size={13} className="text-amber-500" />,
    colorClass: 'bg-amber-500/10 border-amber-500/20',
    label:      'Featured',
  },
  achievement: {
    icon:       <CheckCircle2 size={13} className="text-teal-500" />,
    colorClass: 'bg-teal-500/10 border-teal-500/20',
    label:      'Achievement',
  },
  system: {
    icon:       <AlertCircle size={13} className="text-muted-foreground" />,
    colorClass: 'bg-muted border-border/60',
    label:      'System',
  },
}

/** Resolve the href for a notification.
 *  Follow notifications must use the username-based profile route.
 *  /profile/:uuid does not exist and will 404. */
function getHref(notif: Notification): string | null {
  const data = notif.data ?? {}

  switch (notif.type) {
    case 'vote':
    case 'review':
    case 'feature':
      return data.recommendation_id ? `/comic/${data.recommendation_id}` : null

    case 'follow':
      // Use username route — UUID route doesn't exist
      if (data.follower_username) return `/reader/${data.follower_username}`
      // If no username in data (old notifications), return null (no link)
      return null

    default:
      return null
  }
}

export function NotificationsClient({
  initialNotifications,
}: {
  initialNotifications: Notification[]
}) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [isClearingAll, setIsClearingAll] = useState(false)

  const getMeta = (type: string) => TYPE_META[type] ?? TYPE_META.system

  const dismiss = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setNotifications(prev => prev.filter(n => n.id !== id))
      toast.success('Dismissed')
    } catch {
      toast.error('Could not dismiss')
    }
  }

  const dismissAll = async () => {
    if (isClearingAll) return
    setIsClearingAll(true)
    try {
      await Promise.all(
        notifications.map(n =>
          fetch(`/api/notifications/${n.id}`, { method: 'DELETE' }).catch(() => {})
        )
      )
      setNotifications([])
      toast.success('All cleared')
    } catch {
      toast.error('Failed to clear all')
    } finally {
      setIsClearingAll(false)
    }
  }

  if (!notifications.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border/60 space-y-3 text-center">
        <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
          <BellOff size={22} className="text-muted-foreground/50" />
        </div>
        <div>
          <p className="font-black text-sm">All caught up</p>
          <p className="text-xs text-muted-foreground mt-1">
            Votes, reviews, and follows will appear here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Control bar */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          <span className="font-black text-foreground">{notifications.filter(n => !n.is_read).length}</span> unread
        </span>
        <button
          onClick={dismissAll}
          disabled={isClearingAll}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50 transition-colors px-2 py-1 rounded-lg hover:bg-destructive/5"
        >
          <Trash2 size={11} className={isClearingAll ? 'animate-pulse' : ''} />
          {isClearingAll ? 'Clearing…' : 'Clear all'}
        </button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {notifications.map(notif => {
          const meta = getMeta(notif.type)
          const href = getHref(notif)

          const inner = (
            <div className={cn(
              'group relative flex gap-3 p-4 rounded-2xl border transition-all duration-200',
              notif.is_read
                ? 'border-border bg-card hover:border-border/80'
                : 'border-primary/20 bg-primary/5 hover:border-primary/30'
            )}>
              {/* Unread indicator */}
              {!notif.is_read && (
                <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full bg-primary" />
              )}

              {/* Icon */}
              <div className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border mt-0.5',
                meta.colorClass
              )}>
                {meta.icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-0.5">
                    <p className={cn(
                      'text-sm leading-snug',
                      !notif.is_read ? 'font-semibold text-foreground' : 'text-foreground/80'
                    )}>
                      {notif.title}
                    </p>
                    {notif.content && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {notif.content}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={e => { e.preventDefault(); e.stopPropagation(); dismiss(notif.id) }}
                    className="text-muted-foreground/40 hover:text-destructive shrink-0 p-1 rounded-lg hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                    aria-label="Dismiss"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className={cn(
                    'inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-black border uppercase tracking-wide',
                    meta.colorClass
                  )}>
                    {meta.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {timeAgo(notif.created_at)}
                  </span>
                  {!notif.is_read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  )}
                </div>
              </div>
            </div>
          )

          return href ? (
            <Link key={notif.id} href={href} className="block">
              {inner}
            </Link>
          ) : (
            <div key={notif.id}>{inner}</div>
          )
        })}
      </div>
    </div>
  )
}