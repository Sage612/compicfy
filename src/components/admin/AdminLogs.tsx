'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw, ChevronDown, ChevronUp, Search, X } from 'lucide-react'
import { timeAgo } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

const ACTION_COLORS: Record<string, { color: string; bg: string }> = {
  auto_approved:                { color: 'text-emerald-600', bg: 'bg-emerald-500/10' },
  flagged_for_review:           { color: 'text-amber-600',  bg: 'bg-amber-500/10'   },
  chapter_check:                { color: 'text-blue-600',   bg: 'bg-blue-500/10'    },
  auto_rec_submit:              { color: 'text-violet-600', bg: 'bg-violet-500/10'  },
  id_check:                     { color: 'text-cyan-600',   bg: 'bg-cyan-500/10'    },
  auto_rec_submit_summary:      { color: 'text-indigo-600', bg: 'bg-indigo-500/10'  },
  auto_approval_submit_summary: { color: 'text-indigo-600', bg: 'bg-indigo-500/10'  },
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

const ACTION_TYPES = [
  'auto_approved',
  'flagged_for_review',
  'chapter_check',
  'auto_rec_submit',
  'id_check',
  'auto_rec_submit_summary',
]

const ACTION_LABELS: Record<string, string> = {
  auto_approved:           'Approved',
  flagged_for_review:      'Flagged',
  chapter_check:           'Chapters',
  auto_rec_submit:         'Submitted',
  id_check:                'ID Check',
  auto_rec_submit_summary: 'Summary',
}

export function AdminLogs() {
  const [logs,       setLogs]       = useState<LogEntry[]>([])
  const [loading,    setLoading]    = useState(true)
  const [hasMore,    setHasMore]    = useState(false)
  const [page,       setPage]       = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter,     setFilter]     = useState<string>('')
  const [search,     setSearch]     = useState<string>('')
  const [searchInput, setSearchInput] = useState<string>('')
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchLogs = async (currentPage = 1, append = false) => {
    setLoading(true)
    try {
      const url = new URL('/api/admin/logs', window.location.origin)
      url.searchParams.set('page', String(currentPage))
      if (filter) url.searchParams.set('action', filter)
      if (search) url.searchParams.set('search', search)
      const res  = await fetch(url.toString())
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, search])

  // Debounce search input → search state
  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      setSearch(value.trim())
    }, 400)
  }

  const clearSearch = () => {
    setSearchInput('')
    setSearch('')
  }

  const getActionStyle = (action: string) => {
    const key = Object.keys(ACTION_COLORS).find(k => action.includes(k))
    return key ? ACTION_COLORS[key] : { color: 'text-foreground', bg: 'bg-muted' }
  }

  const renderLogDetails = (log: LogEntry) => {

    if (log.action === 'auto_approved' || log.action === 'flagged_for_review') {
      return (
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground">Status</span>
              <p className="font-mono mt-0.5">{log.approval?.status}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Conditions</span>
              <p className="font-mono text-emerald-600 mt-0.5">{log.approval?.passed}/{log.approval?.total}</p>
            </div>
          </div>
          {!!log.approval?.failed_count && (
            <div>
              <span className="text-muted-foreground">Failed</span>
              <p className="font-mono text-red-600 mt-0.5">{log.approval.failed_count} conditions</p>
            </div>
          )}
          {log.details.failed_conditions && (
            <div className="pt-2 border-t">
              <p className="text-muted-foreground text-xs mb-1">Failed Conditions</p>
              <ul className="space-y-1">
                {log.details.failed_conditions.slice(0, 5).map((cond: string, i: number) => (
                  <li key={i} className="text-xs bg-red-500/10 text-red-700 px-2 py-1 rounded">
                    • {cond}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )
    }

    if (log.action === 'auto_rec_submit') {
      return (
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div>
              <span className="text-muted-foreground text-xs">Type</span>
              <p className="font-semibold capitalize mt-0.5">{log.submission?.type}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Status</span>
              <div className="mt-0.5">
                <Badge variant="outline" className="text-xs">{log.submission?.status}</Badge>
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <span className="text-muted-foreground text-xs">Source</span>
              <p className="font-mono text-xs mt-0.5 truncate">{log.details.source}</p>
            </div>
          </div>

          {log.submission?.author && (
            <div>
              <span className="text-muted-foreground text-xs">Author</span>
              <p className="mt-0.5">{log.submission.author}</p>
            </div>
          )}

          {log.submission?.genres && log.submission.genres.length > 0 && (
            <div>
              <span className="text-muted-foreground text-xs">Genres</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {log.submission.genres.map((g: string) => (
                  <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>
                ))}
              </div>
            </div>
          )}

          {log.submission?.platforms && log.submission.platforms.length > 0 && (
            <div>
              <span className="text-muted-foreground text-xs">Platforms</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {log.submission.platforms.map((p: string) => (
                  <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                ))}
              </div>
            </div>
          )}

          {log.submission?.ids && Object.values(log.submission.ids).some(Boolean) && (
            <div className="pt-2 border-t">
              <span className="text-muted-foreground text-xs">External IDs</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mt-1 text-xs">
                {log.submission.ids.mu  && <div className="bg-muted px-2 py-1 rounded"><span className="text-muted-foreground">MU:</span> {log.submission.ids.mu}</div>}
                {log.submission.ids.al  && <div className="bg-muted px-2 py-1 rounded"><span className="text-muted-foreground">AL:</span> {log.submission.ids.al}</div>}
                {log.submission.ids.mal && <div className="bg-muted px-2 py-1 rounded"><span className="text-muted-foreground">MAL:</span> {log.submission.ids.mal}</div>}
              </div>
            </div>
          )}

          {log.summary.reason && (
            <div className="pt-2 border-t bg-amber-500/10 px-2 py-1 rounded text-xs text-amber-700">
              {log.summary.reason}
            </div>
          )}
        </div>
      )
    }

    if (log.action === 'chapter_check') {
      return (
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <span className="text-muted-foreground text-xs">Database</span>
              <p className="font-semibold mt-0.5">{log.chapter_check?.database}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Old</span>
              <p className="font-mono mt-0.5">{log.chapter_check?.old_chapters ?? 'N/A'}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">New</span>
              <p className="font-mono text-emerald-600 font-bold mt-0.5">{log.chapter_check?.new_chapters ?? 'N/A'}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Status</span>
              <div className="mt-0.5">
                <Badge variant="outline" className="text-xs">{log.details.status}</Badge>
              </div>
            </div>
          </div>

          {log.chapter_check?.platforms && log.chapter_check.platforms.length > 0 && (
            <div>
              <span className="text-muted-foreground text-xs">Platforms Found</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {log.chapter_check.platforms.map((p: string) => (
                  <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }

    if (log.action === 'id_check') {
      return (
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground text-xs">IDs Found</span>
              <p className="font-bold text-emerald-600 mt-0.5">{log.id_check?.total}/5</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Status</span>
              <div className="mt-0.5">
                <Badge variant="outline" className="text-xs">{log.details.status}</Badge>
              </div>
            </div>
          </div>

          {log.id_check?.found && Object.keys(log.id_check.found).length > 0 && (
            <div className="pt-2 border-t">
              <span className="text-muted-foreground text-xs">Found</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1 text-xs">
                {Object.entries(log.id_check.found).map(([key, val]) =>
                  val ? (
                    <div key={key} className="bg-emerald-500/10 px-2 py-1 rounded text-emerald-700 flex gap-1 min-w-0">
                      <span className="font-semibold uppercase shrink-0">{key}:</span>
                      <span className="truncate">{val}</span>
                    </div>
                  ) : null
                )}
              </div>
            </div>
          )}
        </div>
      )
    }

    if (log.action.includes('summary')) {
      return (
        <div className="space-y-2 text-sm">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <span className="text-muted-foreground text-xs">Submitted</span>
              <p className="font-bold text-emerald-600 mt-0.5">{log.details.submitted_count}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Skipped</span>
              <p className="font-bold text-amber-600 mt-0.5">{log.details.skipped_count}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Failed</span>
              <p className="font-bold text-red-600 mt-0.5">{log.details.failed_count}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Total</span>
              <p className="font-mono mt-0.5">{log.details.total_processed}</p>
            </div>
          </div>

          {log.details.sources && (
            <div className="pt-2 border-t">
              <span className="text-muted-foreground text-xs">Sources Used</span>
              <div className="space-y-1 mt-1 text-xs">
                {Object.entries(log.details.sources).map(([type, source]: [string, any]) => (
                  <div key={type} className="bg-muted px-2 py-1 rounded capitalize">
                    <span className="font-semibold">{type}:</span> {source}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="text-sm text-muted-foreground">
        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-48">
          {JSON.stringify(log.details, null, 2)}
        </pre>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* ── Search + Refresh row ── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={searchInput}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search by title, username, action…"
            className="h-9 pl-8 pr-8 text-sm rounded-xl"
          />
          {searchInput && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setPage(1); fetchLogs(1, false) }}
          className="gap-1.5 shrink-0 h-9"
        >
          <RefreshCw size={13} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* ── Results count ── */}
      <p className="text-sm text-muted-foreground">
        {loading ? 'Loading…' : (
          <>
            <span className="font-black text-foreground">{logs.length}</span> log{logs.length !== 1 ? 's' : ''}
            {search && <span className="ml-1">matching <span className="text-primary font-semibold">"{search}"</span></span>}
          </>
        )}
      </p>

      {/* ── Filter chips ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <button
          onClick={() => setFilter('')}
          className={cn(
            'shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-colors',
            filter === ''
              ? 'bg-primary text-primary-foreground border-primary'
              : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
          )}
        >
          All
        </button>
        {ACTION_TYPES.map(type => (
          <button
            key={type}
            onClick={() => setFilter(filter === type ? '' : type)}
            className={cn(
              'shrink-0 px-3 py-1 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap',
              filter === type
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
            )}
          >
            {ACTION_LABELS[type] ?? type}
          </button>
        ))}
      </div>

      {/* ── Log list ── */}
      {loading && logs.length === 0 ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? (
            <div className="space-y-2">
              <p className="text-sm">No logs matching <span className="font-semibold text-foreground">"{search}"</span></p>
              <button onClick={clearSearch} className="text-xs text-primary hover:underline">
                Clear search
              </button>
            </div>
          ) : (
            <p>No logs found</p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden divide-y divide-border">
          {logs.map((log) => {
            const isExpanded = expandedId === log.id
            const style      = getActionStyle(log.action)
            const initials   = (log.profile?.username || 'A').slice(0, 2).toUpperCase()

            return (
              <div key={log.id} className="bg-card hover:bg-muted/20 transition-colors">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                  className="w-full text-left px-3 py-3 flex items-start gap-2.5"
                >
                  <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                    <AvatarImage src={log.profile?.avatar_url} />
                    <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-violet-500 text-white font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold">@{log.profile?.username || 'System'}</span>
                      <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0', style.color, style.bg)}>
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                        {timeAgo(log.created_at)}
                      </span>
                      {isExpanded
                        ? <ChevronUp size={13} className="shrink-0 text-muted-foreground" />
                        : <ChevronDown size={13} className="shrink-0 text-muted-foreground" />
                      }
                    </div>

                    <p className="text-xs text-foreground mt-0.5 line-clamp-2 leading-snug">
                      {log.summary.title}
                    </p>

                    {log.summary.reason && (
                      <p className="text-[10px] text-amber-600 mt-0.5 line-clamp-1">⚠️ {log.summary.reason}</p>
                    )}
                    {log.summary.error && (
                      <p className="text-[10px] text-red-600 mt-0.5 line-clamp-1">❌ {log.summary.error}</p>
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-3 py-3 bg-muted/30 border-t border-border">
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