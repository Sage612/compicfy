import Link from 'next/link'
import {
  Bell, BookOpen, Croissant, Star, Users, Bookmark, ChevronRight,
} from 'lucide-react'
import { timeAgo } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

type Notification = {
  id:         string
  type:       string
  title:      string
  content:    string | null
  data:       unknown
  is_read:    boolean | null
  created_at: string | null
}

interface Props {
  notifications:  Notification[]
  unreadCount:    number
  notificationsHref: string // '/reader/dashboard/notifications' or the /pro equivalent
}

// Icon + accent per notification type. Falls back to a plain bell for any
// type not listed here, so a new notification type added elsewhere in the
// codebase renders sensibly instead of breaking.
const TYPE_META: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  chapter_update:       { icon: BookOpen,  color: 'text-blue-500',   bg: 'bg-blue-500/10'   },
  bake_ready:           { icon: Croissant, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  followed_user_posted: { icon: Users,     color: 'text-violet-500', bg: 'bg-violet-500/10' },
  collection_saved:     { icon: Bookmark,  color: 'text-teal-500',   bg: 'bg-teal-500/10'   },
  list_starred:         { icon: Star,      color: 'text-amber-500',  bg: 'bg-amber-500/10'  },
}

function hrefFor(n: Notification): string | null {
  if (!n.data || typeof n.data !== 'object' || Array.isArray(n.data)) return null
  const recId = (n.data as { recommendation_id?: unknown }).recommendation_id
  return typeof recId === 'string' && recId.length > 0 ? `/comic/${recId}` : null
}

export function NotificationsFeedSection({ notifications, unreadCount, notificationsHref }: Props) {
  if (notifications.length === 0) return null

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Bell size={13} />
          Recent Activity
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-black">
              {unreadCount}
            </span>
          )}
        </h2>
        <Link href={notificationsHref} className="text-xs text-primary hover:underline flex items-center gap-1">
          View all <ChevronRight size={12} />
        </Link>
      </div>

      <div className="space-y-2">
        {notifications.map(n => {
          const meta = TYPE_META[n.type] ?? { icon: Bell, color: 'text-muted-foreground', bg: 'bg-muted' }
          const Icon = meta.icon
          const href = hrefFor(n)

          const inner = (
            <div className={cn(
              'flex items-start gap-3 p-3 rounded-2xl border transition-colors',
              n.is_read
                ? 'border-border bg-card'
                : 'border-primary/25 bg-primary/5'
            )}>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', meta.bg)}>
                <Icon size={14} className={meta.color} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black line-clamp-1">{n.title}</p>
                {n.content && (
                  <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{n.content}</p>
                )}
                <p className="text-[10px] text-muted-foreground/70 mt-1">{timeAgo(n.created_at ?? new Date().toISOString())}</p>
              </div>
              {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />}
            </div>
          )

          return href
            ? <Link key={n.id} href={href} className="block">{inner}</Link>
            : <div key={n.id}>{inner}</div>
        })}
      </div>
    </div>
  )
}