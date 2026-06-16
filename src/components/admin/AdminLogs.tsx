'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { timeAgo } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

const ACTION_COLORS: Record<string, { color: string; bg: string }> = {
  auto_approved:   { color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  flagged_for_review: { color: 'text-amber-600', bg: 'bg-amber-500/10' },
  chapter_check:   { color: 'text-blue-600', bg: 'bg-blue-500/10' },
  auto_rec_submit: { color: 'text-violet-600', bg: 'bg-violet-500/10' },
  id_check:        { color: 'text-cyan-600', bg: 'bg-cyan-500/10' },
  auto_rec_submit_summary: { color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
  auto_approval_submit_summary: { color: 'text-indigo-600', bg: 'bg-indigo-500/10' },
}

interface LogEntry {
  id: string
  action: string
  entity_type: string
  created_at: string
  profile: { username: string; avatar_url?: string } | null
  summary: {
    title: string
    status?: string
    type?: string
    source?: string
    reason?: string
    error?: string
  }
  approval?: {
    status: string
    passed: number
    total: number
    failed_count: number
  }
  submission?: {
    status: string
    type?: string
    author?: string
    artist?: string
    genres?: string[]
    platforms?: string[]
    ids?: Record<string, string>
  }
  chapter_check?: {
    database: string
    tried: string[]
    old_chapters?: number
    new_chapters?: number
    platforms?: string[]
  }
  id_check?: {
    found: Record<string, string>
    total: number
    databases: string[]
  }
  details: Record<string, any>
}

export function AdminLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('')

  const fetchLogs = async (currentPage = 1, append = false) => {
    setLoading(true)
    try {
      const url = new URL('/api/admin/logs', window.location.origin)
      url.searchParams.set('page', String(currentPage))
      if (filter) url.searchParams.set('action', filter)

      const res = await fetch(url.toString())
      const data = await res.json()

      if (append) setLogs(prev => [...prev, ...(data.logs ?? [])])
      else setLogs(data.logs ?? [])
      setHasMore(data.hasMore ?? false)
    } catch (err) {
      console.error('Failed to fetch logs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(1)
    fetchLogs(1, false)
  }, [filter])

  const getActionStyle = (action: string) => {
    const key = Object.keys(ACTION_COLORS).find(k => action.includes(k))
    return key ? ACTION_COLORS[key] : { color: 'text-foreground', bg: 'bg-muted' }
  }

  const renderLogDetails = (log: LogEntry) => {
    // Auto-approval logs
    if (log.action === 'auto_approved' || log.action === 'flagged_for_review') {
      return (
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground">Status:</span>
              <span className="ml-2 font-mono">{log.approval?.status}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Conditions:</span>
              <span className="ml-2 font-mono text-emerald-600">{log.approval?.passed}/{log.approval?.total}</span>
            </div>
          </div>
          {log.approval?.failed_count ? (
            <div>
              <span className="text-muted-foreground">Failed:</span>
              <span className="ml-2 font-mono text-red-600">{log.approval.failed_count} conditions</span>
            </div>
          ) : null}
          {log.details.failed_conditions && (
            <div className="pt-2 border-t">
              <p className="text-muted-foreground text-xs mb-1">Failed Conditions:</p>
              <ul className="space-y-1">
                {log.details.failed_conditions.slice(0, 5).map((cond: string, i: number) => (
                  <li key={i} className="text-xs bg-red-500/10 text-red-700 px-2 py-1 rounded break-words">
                    • {cond}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )
    }

    // Submission logs
    if (log.action === 'auto_rec_submit') {
      return (
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <span className="text-muted-foreground">Type:</span>
              <span className="ml-1 font-semibold capitalize">{log.submission?.type}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <Badge variant="outline" className="ml-1">
                {log.submission?.status}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Source:</span>
              <span className="ml-1 font-mono text-xs break-all">{log.details.source}</span>
            </div>
          </div>

          {log.submission?.author && (
            <div>
              <span className="text-muted-foreground">Author:</span>
              <span className="ml-2 break-words">{log.submission.author}</span>
            </div>
          )}

          {log.submission?.genres && log.submission.genres.length > 0 && (
            <div>
              <span className="text-muted-foreground">Genres:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {log.submission.genres.map((g: string) => (
                  <Badge key={g} variant="secondary" className="text-xs">
                    {g}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {log.submission?.platforms && log.submission.platforms.length > 0 && (
            <div>
              <span className="text-muted-foreground">Platforms:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {log.submission.platforms.map((p: string) => (
                  <Badge key={p} variant="outline" className="text-xs">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {log.submission?.ids && Object.values(log.submission.ids).some(Boolean) && (
            <div className="pt-2 border-t">
              <span className="text-muted-foreground text-xs">External IDs:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1 text-xs">
                {log.submission.ids.mu && <div className="bg-muted px-2 py-1 rounded break-all"><span className="text-muted-foreground">MU:</span> {log.submission.ids.mu}</div>}
                {log.submission.ids.al && <div className="bg-muted px-2 py-1 rounded break-all"><span className="text-muted-foreground">AL:</span> {log.submission.ids.al}</div>}
                {log.submission.ids.mal && <div className="bg-muted px-2 py-1 rounded break-all"><span className="text-muted-foreground">MAL:</span> {log.submission.ids.mal}</div>}
              </div>
            </div>
          )}

          {log.summary.reason && (
            <div className="pt-2 border-t bg-amber-500/10 px-2 py-1 rounded text-xs text-amber-700 break-words">
              {log.summary.reason}
            </div>
          )}
        </div>
      )
    }

    // Chapter check logs
    if (log.action === 'chapter_check') {
      return (
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <span className="text-muted-foreground">Database:</span>
              <span className="ml-1 font-semibold">{log.chapter_check?.database}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Old:</span>
              <span className="ml-1 font-mono">{log.chapter_check?.old_chapters ?? 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">New:</span>
              <span className="ml-1 font-mono text-emerald-600 font-bold">{log.chapter_check?.new_chapters ?? 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <Badge variant="outline" className="ml-1 text-xs">
                {log.details.status}
              </Badge>
            </div>
          </div>

          {log.chapter_check?.platforms && log.chapter_check.platforms.length > 0 && (
            <div>
              <span className="text-muted-foreground text-xs">Platforms Found:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {log.chapter_check.platforms.map((p: string) => (
                  <Badge key={p} variant="secondary" className="text-xs">
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }

    // ID check logs
    if (log.action === 'id_check') {
      return (
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground">IDs Found:</span>
              <span className="ml-2 font-bold text-emerald-600">{log.id_check?.total}/6</span>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <Badge variant="outline" className="ml-1 text-xs">
                {log.details.status}
              </Badge>
            </div>
          </div>

          {log.id_check?.found && Object.keys(log.id_check.found).length > 0 && (
            <div className="pt-2 border-t">
              <span className="text-muted-foreground text-xs">Found:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1 text-xs">
                {Object.entries(log.id_check.found).map(([key, val]) => (
                  val && (
                    <div key={key} className="bg-emerald-500/10 px-2 py-1 rounded text-emerald-700 break-all">
                      <span className="font-semibold uppercase">{key}:</span> {val}
                    </div>
                  )
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }

    // Summary logs
    if (log.action.includes('summary')) {
      return (
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <span className="text-muted-foreground">Submitted:</span>
              <span className="ml-1 font-bold text-emerald-600">{log.details.submitted_count}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Skipped:</span>
              <span className="ml-1 font-bold text-amber-600">{log.details.skipped_count}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Failed:</span>
              <span className="ml-1 font-bold text-red-600">{log.details.failed_count}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Total:</span>
              <span className="ml-1 font-mono">{log.details.total_processed}</span>
            </div>
          </div>

          {log.details.sources && (
            <div className="pt-2 border-t">
              <span className="text-muted-foreground text-xs">Sources Used:</span>
              <div className="space-y-1 mt-1 text-xs">
                {Object.entries(log.details.sources).map(([type, source]: [string, any]) => (
                  <div key={type} className="bg-muted px-2 py-1 rounded capitalize break-words">
                    <span className="font-semibold">{type}:</span> {source}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }

    // Fallback
    return (
      <div className="text-sm text-muted-foreground">
        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-48 break-words">
          {JSON.stringify(log.details, null, 2)}
        </pre>
      </div>
    )
  }

  const actionTypes = [
    'auto_approved',
    'flagged_for_review',
    'chapter_check',
    'auto_rec_submit',
    'id_check',
    'auto_rec_submit_summary',
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{logs.length} logs shown</p>
        <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
          {actionTypes.map(type => (
            <Button
              key={type}
              variant={filter === type ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(filter === type ? '' : type)}
              className="text-xs px-2 py-1 h-auto"
            >
              {type.replace(/_/g, ' ')}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setPage(1); fetchLogs(1, false) }}
          className="gap-1.5 shrink-0"
        >
          <RefreshCw size={13} />
          Refresh
        </Button>
      </div>

      {loading && logs.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No logs found
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
          {logs.map((log) => {
            const isExpanded = expandedId === log.id
            const style = getActionStyle(log.action)
            const initials = (log.profile?.username || 'A').slice(0, 2).toUpperCase()

            return (
              <div key={log.id} className="bg-card hover:bg-muted/20 transition-colors">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  className="w-full text-left px-3 py-3 flex items-start gap-2 sm:gap-3"
                >
                  <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                    <AvatarImage src={log.profile?.avatar_url} />
                    <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-violet-500 text-white font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                      <span className="text-sm font-semibold">@{log.profile?.username || 'System'}</span>
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-bold w-fit', style.color, style.bg)}>
                        {log.action}
                      </span>
                    </div>
                    <p className="text-sm text-foreground mt-0.5 break-words">
                      {log.summary.title}
                    </p>
                    {log.summary.reason && (
                      <p className="text-xs text-amber-600 mt-1 break-words">⚠️ {log.summary.reason}</p>
                    )}
                    {log.summary.error && (
                      <p className="text-xs text-red-600 mt-1 break-words">❌ {log.summary.error}</p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-1 shrink-0 ml-1">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{timeAgo(log.created_at)}</span>
                    {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 sm:px-4 py-3 bg-muted/30 border-t border-border">
                    {renderLogDetails(log)}
                  </div>
                )}
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
            onClick={() => { const p = page + 1; setPage(p); fetchLogs(p, true) }}
            disabled={loading}
            className="gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}