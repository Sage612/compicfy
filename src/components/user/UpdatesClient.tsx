'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { BookOpen, Check, X, Loader2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { ActionSheet, type ActionSheetAction } from '@/components/ui/ActionSheet'
import { PageHeader } from '@/components/dashboard/PageHeader'

interface ChapterUpdate {
  list_id:           string
  recommendation_id: string
  status:            string
  title:             string
  cover_url:         string | null
  chapter_count:     number
  progress_chapter:  number | null
  source_url:        string | null
  source_label:      string | null
}

interface BakeItem {
  id: number
  recommendation_id: string
  target_chapter_count: number
  counting_mode: 'from_now' | 'from_read'
  chapter_count_at_bake_start: number
  status: 'active' | 'fulfilled'
  progress_chapter?: number | null
  recommendations?: { title: string; cover_url: string | null; chapter_count: number }
}

interface Props {
  initialUpdates: ChapterUpdate[]
  initialBakes:   BakeItem[]
  backHref?:      string
  isPro?:         boolean
}

const proxy = (url: string) => `/api/image-proxy?url=${encodeURIComponent(url)}`

function Cover({ url, alt }: { url: string | null | undefined; alt: string }) {
  return (
    <div className="w-10 h-14 rounded-md overflow-hidden bg-muted shrink-0">
      {url && <img src={proxy(url)} alt={alt} className="w-full h-full object-cover" />}
    </div>
  )
}

export function UpdatesClient({ initialUpdates, initialBakes, backHref = '/reader/dashboard', isPro = false }: Props) {
  const [updates, setUpdates] = useState<ChapterUpdate[]>(initialUpdates)
  const [bakes,   setBakes]   = useState<BakeItem[]>(initialBakes)

  const [pickerOpenFor, setPickerOpenFor] = useState<string | null>(null)
  const [pendingChapter, setPendingChapter] = useState<number>(0)
  const [savingId, setSavingId] = useState<string | null>(null)

  const [actionSheetUpdate, setActionSheetUpdate] = useState<ChapterUpdate | null>(null)
  const [actionSheetBake,   setActionSheetBake]   = useState<BakeItem | null>(null)
  const [busyBakeId, setBusyBakeId] = useState<number | null>(null)

  // Tabs + search: with hundreds of updates, bakes would otherwise sit buried
  // at the bottom with no way to jump to them or find one title.
  const [activeTab, setActiveTab] = useState<'all' | 'chapters' | 'bakes'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const openPicker = (update: ChapterUpdate) => {
    setPickerOpenFor(update.recommendation_id)
    setPendingChapter(update.progress_chapter ?? 0)
    setActionSheetUpdate(null)
  }

  const confirmChapter = async (update: ChapterUpdate) => {
    setSavingId(update.recommendation_id)
    try {
      const res = await fetch(`/api/reading-progress/${update.recommendation_id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list_id: update.list_id, status: update.status, progress_chapter: pendingChapter }),
      })
      if (!res.ok) throw new Error()
      if (pendingChapter >= update.chapter_count) {
        setUpdates(prev => prev.filter(u => u.recommendation_id !== update.recommendation_id))
      } else {
        setUpdates(prev => prev.map(u =>
          u.recommendation_id === update.recommendation_id ? { ...u, progress_chapter: pendingChapter } : u
        ))
      }
      toast.success(`Progress updated — ch. ${pendingChapter}`)
      setPickerOpenFor(null)
    } catch {
      toast.error('Failed to update progress')
    } finally {
      setSavingId(null)
    }
  }

  const clearBake = async (bake: BakeItem) => {
    setBusyBakeId(bake.id)
    try {
      const res = await fetch(`/api/bakes?id=${bake.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setBakes(prev => prev.filter(b => b.id !== bake.id))
      setActionSheetBake(null)
      toast.success('Bake cleared')
    } catch {
      toast.error('Failed to clear bake')
    } finally {
      setBusyBakeId(null)
    }
  }

  const buildUpdateActions = (update: ChapterUpdate): ActionSheetAction[] => [
    { label: 'Update progress', icon: <Check size={15} />, onClick: () => openPicker(update) },
    ...(update.source_url ? [{
      label: `Read on ${update.source_label ?? 'source'}`,
      icon: <ExternalLink size={15} />,
      onClick: () => window.open(update.source_url!, '_blank', 'noopener,noreferrer'),
    }] : []),
  ]

  const buildBakeActions = (bake: BakeItem): ActionSheetAction[] => [
    ...(bake.status === 'fulfilled' ? [{
      label: 'Open comic',
      icon: <BookOpen size={15} />,
      onClick: () => { window.location.href = `/comic/${bake.recommendation_id}` },
    }] : []),
    {
      label: bake.status === 'fulfilled' ? 'Dismiss' : 'Stop baking',
      icon: busyBakeId === bake.id ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />,
      onClick: () => clearBake(bake),
      destructive: true,
    },
  ]

  // Tab picks which lists to consider; search then narrows within that.
  const searchLower = searchQuery.trim().toLowerCase()

  const filteredUpdates = useMemo(() => {
    if (activeTab === 'bakes') return []
    if (!searchLower) return updates
    return updates.filter(u => u.title.toLowerCase().includes(searchLower))
  }, [updates, activeTab, searchLower])

  const filteredBakes = useMemo(() => {
    if (activeTab === 'chapters') return []
    if (!searchLower) return bakes
    return bakes.filter(b => (b.recommendations?.title ?? '').toLowerCase().includes(searchLower))
  }, [bakes, activeTab, searchLower])

  const readyBakes  = filteredBakes.filter(b => b.status === 'fulfilled')
  const activeBakes = filteredBakes.filter(b => b.status === 'active')
  const hasNothing  = updates.length === 0 && bakes.length === 0
  const hasNoFilteredResults = !hasNothing && filteredUpdates.length === 0 && filteredBakes.length === 0

  // True, unfiltered counts so tab badges stay stable while searching.
  const totalUpdatesCount = updates.length
  const totalBakesCount   = bakes.length
  const attention = totalUpdatesCount + bakes.filter(b => b.status === 'fulfilled').length

  return (
    <div className="space-y-8">

      <ActionSheet
        open={!!actionSheetUpdate}
        onClose={() => setActionSheetUpdate(null)}
        title={actionSheetUpdate?.title}
        actions={actionSheetUpdate ? buildUpdateActions(actionSheetUpdate) : []}
      />
      <ActionSheet
        open={!!actionSheetBake}
        onClose={() => setActionSheetBake(null)}
        title={actionSheetBake?.recommendations?.title}
        actions={actionSheetBake ? buildBakeActions(actionSheetBake) : []}
      />

      <PageHeader
        eyebrow="Library"
        title="Updates"
        subtitle={attention === 0 ? "You're all caught up" : `${attention} thing${attention !== 1 ? 's' : ''} need your attention`}
        backHref={backHref}
        backLabel="Dashboard"
        isPro={isPro}
      />

      {!hasNothing && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {([
              { key: 'all',      label: 'All',      count: totalUpdatesCount + totalBakesCount },
              { key: 'chapters', label: 'Chapters', count: totalUpdatesCount },
              { key: 'bakes',    label: 'Bakes',    count: totalBakesCount },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'shrink-0 px-3 py-1.5 rounded-full text-xs border transition-colors whitespace-nowrap',
                  activeTab === tab.key
                    ? 'bg-foreground text-background border-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/30'
                )}
              >
                {tab.label} <span className="opacity-60 tabular-nums">{tab.count}</span>
              </button>
            ))}
          </div>

          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by title…"
            className="h-9 text-sm bg-card"
          />
        </div>
      )}

      {hasNoFilteredResults && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">
            No {activeTab === 'all' ? 'results' : activeTab} matching
            {searchLower && <span className="text-foreground"> “{searchQuery}”</span>}
          </p>
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-xs text-foreground underline underline-offset-4 mt-1">
              Clear search
            </button>
          )}
        </div>
      )}

      {hasNothing && (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-border space-y-3 text-center">
          <div>
            <p className="font-dashboard-serif text-lg text-foreground">All caught up</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
              New chapters and ready bakes will show up here as they come in.
            </p>
          </div>
          <Link href="/browse" className="text-xs text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors">
            Browse comics
          </Link>
        </div>
      )}

      {readyBakes.length > 0 && (
        <section className="space-y-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Ready to binge</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {readyBakes.map(bake => (
              <div key={bake.id} className="flex items-center gap-3 p-3 rounded-xl border border-foreground/30 bg-card">
                <Cover url={bake.recommendations?.cover_url} alt={bake.recommendations?.title ?? ''} />
                <div className="min-w-0 flex-1">
                  <p className="font-dashboard-serif text-base text-foreground line-clamp-1">{bake.recommendations?.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{bake.target_chapter_count} chapters waiting</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Link href={`/comic/${bake.recommendation_id}`}>
                    <Button size="sm" className="h-7 text-xs">Open</Button>
                  </Link>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    aria-label="Bake options" onClick={() => setActionSheetBake(bake)}>
                    <X size={13} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {filteredUpdates.length > 0 && (
        <section className="space-y-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">New chapters</p>
          <div className="space-y-2">
            {filteredUpdates.map(update => {
              const isPickerOpen = pickerOpenFor === update.recommendation_id
              const isSaving     = savingId === update.recommendation_id
              const currentProgress = update.progress_chapter ?? 0

              return (
                <div key={update.recommendation_id} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center gap-3 p-3">
                    <Link href={`/comic/${update.recommendation_id}`} className="shrink-0">
                      <Cover url={update.cover_url} alt={update.title} />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`/comic/${update.recommendation_id}`} className="font-dashboard-serif text-base text-foreground hover:text-muted-foreground transition-colors line-clamp-1 block">
                        {update.title}
                      </Link>
                      <p className="text-xs text-muted-foreground mt-0.5 tabular-nums">
                        Ch. {currentProgress} of {update.chapter_count} · {update.chapter_count - currentProgress} new
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!isPickerOpen && (
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openPicker(update)}>Update</Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        aria-label="More" onClick={() => setActionSheetUpdate(update)}>
                        More
                      </Button>
                    </div>
                  </div>

                  {isPickerOpen && (
                    <div className="px-3 pb-3 pt-2 border-t border-border space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground tabular-nums">
                        <span>Ch. {currentProgress}</span>
                        <span className="text-foreground">Read up to ch. {pendingChapter}</span>
                        <span>Ch. {update.chapter_count}</span>
                      </div>
                      <input
                        type="range"
                        min={currentProgress}
                        max={update.chapter_count}
                        value={pendingChapter}
                        onChange={e => setPendingChapter(Number(e.target.value))}
                        className="w-full accent-foreground"
                      />
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs" onClick={() => setPickerOpenFor(null)}>Cancel</Button>
                        <Button size="sm" className="flex-1 h-8 text-xs" disabled={isSaving} onClick={() => confirmChapter(update)}>
                          {isSaving ? 'Saving…' : 'Confirm'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {activeBakes.length > 0 && (
        <section className="space-y-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Still baking</p>
          <div className="space-y-2">
            {activeBakes.map(bake => {
              // counting_mode-aware, same as the repo version and the dashboard:
              // from_read counts against the user's own progress, from_now against the comic's count.
              const baseline      = bake.chapter_count_at_bake_start
              const currentCount  = bake.counting_mode === 'from_read'
                ? (bake.progress_chapter ?? baseline)
                : (bake.recommendations?.chapter_count ?? baseline)
              const chaptersSoFar = Math.max(0, currentCount - baseline)
              const progressPct   = Math.min(100, Math.round((chaptersSoFar / bake.target_chapter_count) * 100))

              return (
                <div key={bake.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card">
                  <Cover url={bake.recommendations?.cover_url} alt={bake.recommendations?.title ?? ''} />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="font-dashboard-serif text-base text-foreground line-clamp-1">{bake.recommendations?.title}</p>
                    <div className="h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-foreground/70 transition-all" style={{ width: `${progressPct}%` }} />
                    </div>
                    <p className="text-[11px] text-muted-foreground tabular-nums">{chaptersSoFar}/{bake.target_chapter_count} chapters</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Bake options" onClick={() => setActionSheetBake(bake)}>
                    <X size={13} />
                  </Button>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}