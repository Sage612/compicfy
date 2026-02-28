'use client'

import { useState } from 'react'
import { Bell, CheckCircle, XCircle, BookOpen, Star, ThumbsUp } from 'lucide-react'
import { timeAgo } from '@/lib/utils/format'
import { cn } from '@/lib/utils/cn'
import Link from 'next/link'

interface Notification {
  id: string
  type: string
  title: string
  is_read: boolean
  created_at: string
  data?: Record<string, any>
}

const typeConfig: Record<string, { icon: any; color: string }> = {
  recommendation_approve: { icon: CheckCircle, color: 'text-green-500' },
  recommendation_reject: { icon: XCircle, color: 'text-destructive' },
  recommendation_resolve_appeal: { icon: BookOpen, color: 'text-primary' },
  account_ban: { icon: XCircle, color: 'text-destructive' },
  account_unban: { icon: CheckCircle, color: 'text-green-500' },
  account_resolve_appeal: { icon: CheckCircle, color: 'text-primary' },
  new_review: { icon: Star, color: 'text-yellow-500' },
  new_vote: { icon: ThumbsUp, color: 'text-primary' },
}

export function NotificationsClient({
  initialNotifications,
}: {
  initialNotifications: Notification[]
}) {
  const [notifications] = useState(initialNotifications)

  if (!notifications.length) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Bell size={40} className="mx-auto mb-3 opacity-30" />
        <p className="font-semibold">No notifications yet</p>
        <p className="text-sm mt-1">
          You'll be notified about your recommendations, reviews, and account activity.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {notifications.map((notif) => {
        const config = typeConfig[notif.type] ?? { icon: Bell, color: 'text-muted-foreground' }
        const Icon = config.icon
        const href = notif.data?.recommendation_id
          ? `/comic/${notif.data.recommendation_id}`
          : undefined

        const content = (
          <div
            className={cn(
              'flex items-start gap-3 p-4 rounded-xl border transition-colors',
              notif.is_read
                ? 'border-border bg-card'
                : 'border-primary/20 bg-primary/5'
            )}
          >
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5',
              notif.is_read ? 'bg-muted' : 'bg-primary/10'
            )}>
              <Icon size={15} className={config.color} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-sm leading-snug',
                !notif.is_read && 'font-medium'
              )}>
                {notif.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {timeAgo(notif.created_at)}
              </p>
            </div>
            {!notif.is_read && (
              <div className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />
            )}
          </div>
        )

        return href ? (
          <Link key={notif.id} href={href}>{content}</Link>
        ) : (
          <div key={notif.id}>{content}</div>
        )
      })}
    </div>
  )
}