'use client'

import { useState } from 'react'
import { 
  Bell, 
  Trash2, 
  BellOff, 
  ThumbsUp, 
  MessageSquare, 
  UserPlus, 
  AlertCircle,
  ArrowRight,
  CheckCircle2
} from 'lucide-react'
import { timeAgo } from '@/lib/utils/format'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'

// Match your exact generated database schema signature
interface Notification {
  id:          string
  user_id:     string
  type:        "vote" | "review" | "reply" | "feature" | "achievement" | "system"
  title:       string
  content:     string | null
  data:        any // Allows matching Supabase's polymorphic Json column signature perfectly here
  is_read:     boolean
  read_at:     string | null
  created_at:  string
}

export function NotificationsClient({
  initialNotifications,
}: {
  initialNotifications: Notification[]
}) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications)
  const [isClearingAll, setIsClearingAll] = useState(false)

  // Determine dynamic event styling and icons for visual clarity
  const getNotificationContext = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'vote':
        return {
          icon: <ThumbsUp size={14} className="text-emerald-500 fill-emerald-500/10" />,
          colorClass: 'bg-emerald-500/10 border-emerald-500/20'
        }
      case 'review':
      case 'reply':
        return {
          icon: <MessageSquare size={14} className="text-blue-500 fill-blue-500/10" />,
          colorClass: 'bg-blue-500/10 border-blue-500/20'
        }
      case 'feature':
      case 'achievement':
        return {
          icon: <UserPlus size={14} className="text-violet-500" />,
          colorClass: 'bg-violet-500/10 border-violet-500/20'
        }
      default:
        return {
          icon: <AlertCircle size={14} className="text-muted-foreground" />,
          colorClass: 'bg-muted border-border/60'
        }
    }
  }

  const dismiss = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to dismiss notification')
      
      setNotifications((prev) => prev.filter((n) => n.id !== id))
      toast.success('Notification dismissed')
    } catch (error) {
      console.error(error)
      toast.error('Could not delete notification')
    }
  }

  const dismissAll = async () => {
    if (isClearingAll) return
    setIsClearingAll(true)
    try {
      await Promise.all(
        notifications.map((n) => 
          fetch(`/api/notifications/${n.id}`, { method: 'DELETE' }).catch((err) => err)
        )
      )
      setNotifications([])
      toast.success('All alerts cleared gracefully')
    } catch (error) {
      console.error(error)
      toast.error('Failed to fully clear matching records')
    } finally {
      setIsClearingAll(false)
    }
  }

  if (!notifications.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 rounded-3xl border border-dashed border-border/60 bg-muted/5 max-w-2xl mx-auto p-6 animate-in fade-in duration-300">
        <div className="w-14 h-14 rounded-2xl bg-muted/60 border border-border/40 flex items-center justify-center mb-4 shadow-sm">
          <BellOff size={22} className="text-muted-foreground/60" />
        </div>
        <h3 className="text-sm font-bold text-foreground">Your feed is pristine</h3>
        <p className="text-xs text-muted-foreground mt-1 text-center max-w-xs leading-normal font-medium">
          When creators vote, comment, or interact with your recommendations, they will stream natively straight to this feed.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto animate-in fade-in duration-200">
      
      {/* Feed Control Bar */}
      <div className="flex items-center justify-between px-1 pb-1 border-b border-border/30">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/80 flex items-center gap-1.5">
          <Bell size={10} className="text-primary" /> {notifications.length} Pending Actions
        </span>
        <button
          onClick={dismissAll}
          disabled={isClearingAll}
          className="text-xs font-semibold text-muted-foreground/80 hover:text-destructive disabled:opacity-50 transition-colors flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-muted/40"
        >
          <Trash2 size={12} className={isClearingAll ? 'animate-pulse' : ''} />
          {isClearingAll ? 'Clearing...' : 'Clear all'}
        </button>
      </div>

      {/* Stream List Containment Deck */}
      <div className="space-y-2.5">
        {notifications.map((notif) => {
          // Safely pull from Json payload avoiding runtime crashes
          const recommendationId = notif.data && typeof notif.data === 'object' && 'recommendation_id' in notif.data
            ? (notif.data as Record<string, any>).recommendation_id 
            : null

          const href = recommendationId ? `/comic/${recommendationId}` : null
          const context = getNotificationContext(notif.type)

          return (
            <div
              key={notif.id}
              className={cn(
                'group relative flex items-center justify-between rounded-2xl border transition-all duration-200 shadow-sm overflow-hidden',
                notif.is_read
                  ? 'border-border/50 bg-card hover:border-border'
                  : 'border-primary/20 bg-gradient-to-r from-primary/5 via-primary/[0.01] to-transparent'
              )}
            >
              {!notif.is_read && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
              )}

              <div className="flex items-start gap-3.5 p-4 flex-1 min-w-0">
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border shadow-sm mt-0.5', context.colorClass)}>
                  {context.icon}
                </div>

                <div className="flex-1 min-w-0 space-y-0.5">
                  {href ? (
                    <Link
                      href={href}
                      className={cn(
                        'text-sm leading-snug text-foreground/90 hover:text-primary transition-colors flex items-center inline-flex gap-1 group/link',
                        !notif.is_read ? 'font-bold' : 'font-medium'
                      )}
                    >
                      <span className="line-clamp-2">{notif.title}</span>
                      <ArrowRight size={12} className="text-muted-foreground/40 opacity-0 group-hover/link:opacity-100 group-hover/link:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                  ) : (
                    <p className={cn('text-sm leading-snug text-foreground/90 line-clamp-2', !notif.is_read ? 'font-bold' : 'font-medium')}>
                      {notif.title}
                    </p>
                  )}
                  
                  <p className="text-[11px] text-muted-foreground/70 font-semibold flex items-center gap-1.5">
                    {timeAgo(notif.created_at)}
                    {!notif.is_read && (
                      <span className="inline-block w-1 h-1 rounded-full bg-primary" />
                    )}
                  </p>
                </div>
              </div>

              <div className="pr-2 shrink-0">
                <button
                  onClick={() => dismiss(notif.id)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 bg-transparent transition-all duration-150"
                  title="Dismiss Item"
                  aria-label="Dismiss Alert"
                >
                  <CheckCircle2 size={15} className="group-hover:scale-105 transition-transform" />
                </button>
              </div>

            </div>
          )
        })}
      </div>
    </div>
  )
}