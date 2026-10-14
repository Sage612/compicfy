'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COMIC_TYPES, GENRES, STATUSES } from '@/lib/utils/constants'
import { PageHeader } from '@/components/dashboard/PageHeader'

interface RadarItem {
  list_id:                  string
  recommendation_id:        string
  title:                    string
  cover_url:                string | null
  type:                     string
  genres:                   string[]
  chapter_count:            number
  progress_chapter:         number | null
  last_chapter_released_at: string
}

interface Props {
  isPro:     boolean
  backHref?: string
}

function formatWeekLabel(startIso: string, endIso: string): string {
  const start = new Date(startIso)
  const end   = new Date(endIso)
  end.setUTCDate(end.getUTCDate() - 1) // end is exclusive from the API — show the inclusive last day
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })
}

function dayKey(iso: string): string {
  return new Date(iso).toDateString()
}

export function ReleaseRadar({ isPro, backHref = '/reader/dashboard' }: Props) {
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

  const hasActiveFilters = !!(typeFilter || genreFilter || statusFilter)

  // Mirrors fetchRadar's query-building exactly, so the export always
  // reflects the same week/filters currently on screen.
  const buildExportUrl = (format: 'csv' | 'pdf') => {
    const params = new URLSearchParams({ week_offset: String(weekOffset), format })
    if (typeFilter)   params.set('type', typeFilter)
    if (genreFilter)  params.set('genre', genreFilter)
    if (statusFilter) params.set('status', statusFilter)
    return `/api/release-radar?${params.toString()}`
  }

  // Group into day sections, newest first — gives the list a sense of
  // rhythm across the week rather than one undifferentiated pile.
  const groups = items.reduce((acc: Record<string, RadarItem[]>, item) => {
    const key = dayKey(item.last_chapter_released_at)
    ;(acc[key] ??= []).push(item)
    return acc
  }, {})
  const orderedDayKeys = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Library"
        title="Release Radar"
        subtitle={[weekOffset === 0 ? 'This week' : weekLabel, items.length > 0 && `${items.length} comic${items.length !== 1 ? 's' : ''}`].filter(Boolean).join(' · ')}
        backHref={backHref}
        backLabel="Dashboard"
        isPro={isPro}
      />

      {/* Week nav + filters + export — one quiet control row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            onClick={goToPrevWeek}
            className={cn(
              'h-7 w-7 rounded-full border border-border/50 flex items-center justify-center transition-colors',
              isPro ? 'text-muted-foreground hover:text-foreground hover:border-foreground/40' : 'text-muted-foreground/30 cursor-not-allowed'
            )}
            aria-label="Previous week"
          >
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={goToNextWeek}
            disabled={weekOffset >= 0}
            className="h-7 w-7 rounded-full border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Next week"
          >
            <ChevronRight size={13} />
          </button>
        </div>

        {isPro && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(f => !f)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showFilters ? 'Hide filters' : 'Filters'}
              {hasActiveFilters && !showFilters && <span className="ml-1 text-foreground">•</span>}
            </button>
            <a href={buildExportUrl('csv')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              CSV
            </a>
            <a href={buildExportUrl('pdf')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              PDF
            </a>
          </div>
        )}
      </div>

      {/* Pro upsell — quiet, dashed border, no color noise */}
      {!isPro && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-dashed border-border/60">
          <p className="text-xs text-muted-foreground">
            Browse past weeks, filter, and export — Pro feature.
          </p>
          <Link href="/pricing" className="shrink-0">
            <span className="text-xs text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors whitespace-nowrap">
              Upgrade
            </span>
          </Link>
        </div>
      )}

      {isPro && showFilters && (
        <div className="flex flex-wrap gap-2">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="h-8 text-xs bg-transparent border border-border/60 rounded-lg px-2 outline-none text-foreground"
          >
            <option value="">All types</option>
            {COMIC_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <select
            value={genreFilter}
            onChange={e => setGenreFilter(e.target.value)}
            className="h-8 text-xs bg-transparent border border-border/60 rounded-lg px-2 outline-none text-foreground"
          >
            <option value="">All genres</option>
            {GENRES.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-8 text-xs bg-transparent border border-border/60 rounded-lg px-2 outline-none text-foreground"
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

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-14">
          <Loader2 size={18} className="animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-14 space-y-1.5">
          <p className="text-sm text-muted-foreground">
            No new chapters {weekOffset === 0 ? 'this week' : 'that week'} for your tracked comics.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {orderedDayKeys.map(key => (
            <div key={key} className="space-y-3">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">
                {dayLabel(groups[key][0].last_chapter_released_at)}
              </p>
              <div className="grid grid-cols-3 gap-x-3 gap-y-5">
                {groups[key].map(item => {
                  const behind = item.progress_chapter != null
                    ? Math.max(0, item.chapter_count - item.progress_chapter)
                    : null

                  return (
                    <Link
                      key={item.recommendation_id}
                      href={`/comic/${item.recommendation_id}`}
                      className="group space-y-1.5"
                    >
                      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-muted">
                        {item.cover_url ? (
                          <img
                            src={`/api/image-proxy?url=${encodeURIComponent(item.cover_url)}`}
                            alt={item.title}
                            className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                          />
                        ) : null}
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-dashboard-serif text-sm leading-snug line-clamp-2 group-hover:opacity-70 transition-opacity">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground/70">
                          Ch. {item.chapter_count}
                        </p>
                        {behind !== null && behind > 0 && (
                          <p className="text-[10px] text-muted-foreground/50">
                            {behind} behind
                          </p>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}