'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Radar, ChevronLeft, ChevronRight, Loader2, BookOpen, Crown, Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { COMIC_TYPES, GENRES, STATUSES } from '@/lib/utils/constants'

interface RadarItem {
  list_id:                  string
  recommendation_id:        string
  title:                    string
  cover_url:                string | null
  type:                     string
  genres:                   string[]
  chapter_count:            number
  last_chapter_released_at: string
}

interface Props {
  isPro: boolean
}

function formatWeekLabel(startIso: string, endIso: string): string {
  const start = new Date(startIso)
  const end   = new Date(endIso)
  end.setUTCDate(end.getUTCDate() - 1) // end is exclusive from the API — show the inclusive last day
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

export function ReleaseRadar({ isPro }: Props) {
  const [items,       setItems]       = useState<RadarItem[]>([])
  const [loading,     setLoading]     = useState(true)
  const [weekOffset,  setWeekOffset]  = useState(0)
  const [weekLabel,   setWeekLabel]   = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [typeFilter,   setTypeFilter]   = useState('')
  const [genreFilter,  setGenreFilter]  = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchRadar = useCallback(async (offset: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ week_offset: String(offset) })
      if (isPro && typeFilter)   params.set('type', typeFilter)
      if (isPro && genreFilter)  params.set('genre', genreFilter)
      if (isPro && statusFilter) params.set('status', statusFilter)

      const res  = await fetch(`/api/release-radar?${params.toString()}`)
      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'locked') {
          toast.error(data.message ?? 'Pro feature')
          setWeekOffset(0)
          return
        }
        throw new Error()
      }

      setItems(data.results ?? [])
      setWeekLabel(formatWeekLabel(data.week_start, data.week_end))
    } catch {
      toast.error('Failed to load release radar')
    } finally {
      setLoading(false)
    }
  }, [isPro, typeFilter, genreFilter, statusFilter])

  useEffect(() => {
    fetchRadar(weekOffset)
  }, [weekOffset, fetchRadar])

  const goToPrevWeek = () => {
    if (!isPro) {
      toast.error('Browsing past weeks is a Pro feature')
      return
    }
    setWeekOffset(prev => prev - 1)
  }

  const goToNextWeek = () => {
    if (weekOffset >= 0) return // can't go past "this week" — no future data
    setWeekOffset(prev => prev + 1)
  }

  const clearFilters = () => {
    setTypeFilter('')
    setGenreFilter('')
    setStatusFilter('')
  }

  // Mirrors fetchRadar's query-building exactly, so the export always
  // reflects the same week/filters currently on screen — not a separate
  // "export everything" path that could drift from what the user is
  // actually looking at.
  const buildExportUrl = (format: 'csv' | 'pdf') => {
    const params = new URLSearchParams({ week_offset: String(weekOffset), format })
    if (typeFilter)   params.set('type', typeFilter)
    if (genreFilter)  params.set('genre', genreFilter)
    if (statusFilter) params.set('status', statusFilter)
    return `/api/release-radar?${params.toString()}`
  }

  const hasActiveFilters = !!(typeFilter || genreFilter || statusFilter)

  return (
    <div className="space-y-4">
      {/* Header — week nav + title */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Radar size={16} className="text-primary" />
          <h2 className="font-serif text-lg text-foreground">Release Radar</h2>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={goToPrevWeek}
            className={cn(
              'h-7 w-7 rounded-lg border border-border/60 flex items-center justify-center transition-colors',
              isPro ? 'text-muted-foreground hover:text-foreground hover:bg-muted/60' : 'text-muted-foreground/30 cursor-not-allowed'
            )}
            aria-label="Previous week"
          >
            <ChevronLeft size={13} />
          </button>
          <span className="text-xs text-muted-foreground min-w-[110px] text-center">
            {weekOffset === 0 ? 'This week' : weekLabel}
          </span>
          <button
            onClick={goToNextWeek}
            disabled={weekOffset >= 0}
            className="h-7 w-7 rounded-lg border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next week"
          >
            <ChevronRight size={13} />
          </button>
        </div>
      </div>

      {/* Pro upsell strip for free users */}
      {!isPro && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-dashed border-border/60 bg-muted/20">
          <p className="text-xs text-muted-foreground">
            Browse past weeks, filter by genre/type, and export — Pro feature.
          </p>
          <Link href="/pricing" className="shrink-0">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-500 hover:opacity-80 transition-opacity whitespace-nowrap">
              <Crown size={11} /> Upgrade
            </span>
          </Link>
        </div>
      )}

      {/* Filters — Pro only */}
      {isPro && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(f => !f)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showFilters ? 'Hide filters' : 'Filters'}
              {hasActiveFilters && !showFilters && <span className="ml-1 text-primary">•</span>}
            </button>
            <div className="flex items-center gap-2">
              <a
                href={buildExportUrl('csv')}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Download size={11} />
                CSV
              </a>
              <a
                href={buildExportUrl('pdf')}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Download size={11} />
                PDF
              </a>
            </div>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-2">
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="h-8 text-xs bg-muted border border-border rounded-lg px-2 outline-none text-foreground"
              >
                <option value="">All types</option>
                {COMIC_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <select
                value={genreFilter}
                onChange={e => setGenreFilter(e.target.value)}
                className="h-8 text-xs bg-muted border border-border rounded-lg px-2 outline-none text-foreground"
              >
                <option value="">All genres</option>
                {GENRES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="h-8 text-xs bg-muted border border-border rounded-lg px-2 outline-none text-foreground"
              >
                <option value="">All statuses</option>
                {STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-muted-foreground/60 hover:text-destructive transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={18} className="animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 space-y-1.5">
          <BookOpen size={18} className="text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground/60">
            No new chapters {weekOffset === 0 ? 'this week' : 'that week'} for your tracked comics.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/40">
          {items.map(item => (
            <Link
              key={item.recommendation_id}
              href={`/comic/${item.recommendation_id}`}
              className="flex items-center gap-3 py-3 group"
            >
              <div className="w-10 aspect-[2/3] rounded-md overflow-hidden bg-muted shrink-0">
                {item.cover_url ? (
                  <img
                    src={`/api/image-proxy?url=${encodeURIComponent(item.cover_url)}`}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen size={12} className="text-muted-foreground opacity-40" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate group-hover:opacity-70 transition-opacity">{item.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  Ch. {item.chapter_count} · {new Date(item.last_chapter_released_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}