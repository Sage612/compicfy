'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Loader2, RefreshCw } from 'lucide-react'
import { timeAgo } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

const ACTION_STYLES: Record<string, { color: string; bg: string }> = {
  approved:   { color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  rejected:   { color: 'text-red-600',     bg: 'bg-red-500/10'     },
  banned:     { color: 'text-red-600',     bg: 'bg-red-500/10'     },
  unbanned:   { color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  featured:   { color: 'text-amber-600',   bg: 'bg-amber-500/10'   },
  unfeatured: { color: 'text-zinc-500',    bg: 'bg-zinc-500/10'    },
  deleted:    { color: 'text-red-600',     bg: 'bg-red-500/10'     },
  edited:     { color: 'text-blue-600',    bg: 'bg-blue-500/10'    },
  resolved:   { color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  dismissed:  { color: 'text-zinc-500',    bg: 'bg-zinc-500/10'    },
}

const TARGET_EMOJI: Record<string, string> = {
  recommendation: '📚',
  user:           '👤',
  review:         '⭐',
  report:         '🚩',
  news:           '📰',
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
      if (append) setLogs(prev => [...prev, ...(data.logs ?? [])])
      else setLogs(data.logs ?? [])
      setHasMore(data.hasMore ?? false)
    } catch { console.error('Failed to fetch logs') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchLogs() }, [])

  const getActionStyle = (action: string) => {
    const key = Object.keys(ACTION_STYLES).find(k => action.includes(k))
    return key ? ACTION_STYLES[key] : { color: 'text-foreground', bg: 'bg-muted' }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{logs.length} actions logged</p>
        <Button variant="outline" size="sm" onClick={() => { setPage(1); fetchLogs() }} className="gap-1.5">
          <RefreshCw size={13} />
          Refresh
        </Button>
      </div>

      {loading && logs.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
          {logs.map((log) => {
            const profile = log.profiles
            const initials = (profile?.username || 'A').slice(0, 2).toUpperCase()
            const emoji = TARGET_EMOJI[log.target_type] ?? '🔧'
            const style = getActionStyle(log.action)

            return (
              <div key={log.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-violet-500 text-white font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-semibold">@{profile?.username}</span>
                    {' '}
                    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold', style.color, style.bg)}>
                      {log.action}
                    </span>
                    {' '}
                    <span className="text-muted-foreground text-xs">
                      {emoji} {log.target_label || log.target_type}
                    </span>
                  </p>
                  {log.details?.reason && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">Reason: {log.details.reason}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{timeAgo(log.created_at)}</span>
              </div>
            )
          })}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => { const p = page + 1; setPage(p); fetchLogs(p, true) }} disabled={loading} className="gap-2">
            {loading && <Loader2 size={14} className="animate-spin" />}
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}