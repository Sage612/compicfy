import Link from 'next/link'
import {
  Bell, BookOpen, Croissant, Star, Users, Bookmark, ChevronRight,
} from 'lucide-react'
import { timeAgo } from '@/lib/utils/format'

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

// Icon per notification type — plain, no per-type color coding, matching the
// quieter overall language. The unread dot is the only color signal.
const TYPE_META: Record<string, { icon: React.ElementType }> = {
  chapter_update:       { icon: BookOpen  },
  bake_ready:           { icon: Croissant },
  followed_user_posted: { icon: Users     },
  collection_saved:     { icon: Bookmark  },
  list_starred:         { icon: Star      },
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
        <h2 className="font-dashboard-serif text-xl flex items-center gap-2">
          Recent activity
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full bg-foreground text-background text-[10px] font-medium">
              {unreadCount}
            </span>
          )}
        </h2>
        <Link href={notificationsHref} className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
          View all <ChevronRight size={12} />
        </Link>
      </div>

      <div className="space-y-2">
        {notifications.map(n => {
          const meta = TYPE_META[n.type] ?? { icon: Bell }
          const Icon = meta.icon
          const href = hrefFor(n)

          const inner = (
            <div className="flex items-start gap-3 p-3 rounded-2xl border border-border bg-card transition-colors">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Icon size={14} className="text-muted-foreground/60" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1">{n.title}</p>
                {n.content && (
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{n.content}</p>
                )}
                <p className="text-xs text-muted-foreground/60 mt-1">{timeAgo(n.created_at ?? new Date().toISOString())}</p>
              </div>
              {!n.is_read && <span className="w-1.5 h-1.5 rounded-full bg-foreground shrink-0 mt-1.5" />}
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