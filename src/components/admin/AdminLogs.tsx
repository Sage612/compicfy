'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, RefreshCw } from 'lucide-react'
import { timeAgo } from '@/lib/utils/format'

const actionColors: Record<string, string> = {
  approved: 'text-green-500',
  rejected: 'text-destructive',
  banned: 'text-destructive',
  unbanned: 'text-green-500',
  featured: 'text-yellow-500',
  unfeatured: 'text-muted-foreground',
  deleted: 'text-destructive',
  edited: 'text-blue-500',
  resolved: 'text-green-500',
  dismissed: 'text-muted-foreground',
}

export function AdminLogs() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)

  const fetchLogs = async (currentPage = 1, append = false) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/logs?page=${currentPage}`)
      const data = await res.json()
      if (append) {
        setLogs(prev => [...prev, ...(data.logs ?? [])])
      } else {
        setLogs(data.logs ?? [])
      }
      setHasMore(data.hasMore ?? false)
    } catch {
      console.error('Failed to fetch logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs() }, [])

  const handleLoadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchLogs(nextPage, true)
  }

  const getActionColor = (action: string) => {
    const key = Object.keys(actionColors).find(k => action.includes(k))
    return key ? actionColors[key] : 'text-foreground'
  }

  const targetTypeEmoji: Record<string, string> = {
    recommendation: '📚',
    user: '👤',
    review: '⭐',
    report: '🚩',
    news: '📰',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{logs.length} actions logged</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setPage(1); fetchLogs() }}
          className="gap-1.5"
        >
          <RefreshCw size={13} />
          Refresh
        </Button>
      </div>

      {loading && logs.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-1">
          {logs.map((log) => {
            const profile = log.profiles
            const initials = (profile?.username || 'A').slice(0, 2).toUpperCase()
            const emoji = targetTypeEmoji[log.target_type] ?? '🔧'

            return (
              <div
                key={log.id}
                className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-accent/50 transition-colors"
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">@{profile?.username}</span>
                    {' '}
                    <span className={getActionColor(log.action)}>{log.action}</span>
                    {' '}
                    <span className="text-muted-foreground">
                      {emoji} {log.target_label || log.target_type}
                    </span>
                  </p>
                  {log.details?.reason && (
                    <p className="text-xs text-muted-foreground truncate">
                      Reason: {log.details.reason}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {timeAgo(log.created_at)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadMore}
            disabled={loading}
            className="gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : null}
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}