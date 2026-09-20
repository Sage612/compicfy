'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  BookOpen, Croissant, Check, X, Loader2, ExternalLink,
  Sparkles, ArrowRight, Search,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { ActionSheet, type ActionSheetAction } from '@/components/ui/ActionSheet'

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
  progress_chapter?: number | null
  status: 'active' | 'fulfilled'
  recommendations?: { title: string; cover_url: string | null; chapter_count: number }
}

interface Props {
  initialUpdates: ChapterUpdate[]
  initialBakes:   BakeItem[]
}

const THEME_GRAD: Record<number, string> = {
  0: 'from-primary/60 via-primary/20 to-primary/5',
  1: 'from-violet-500/60 via-violet-500/20 to-violet-500/5',
  2: 'from-rose-500/60 via-rose-500/20 to-rose-500/5',
  3: 'from-amber-500/60 via-amber-500/20 to-amber-500/5',
  4: 'from-emerald-500/60 via-emerald-500/20 to-emerald-500/5',
  5: 'from-indigo-500/60 via-indigo-500/20 to-indigo-500/5',
}
const THEME_BORDER: Record<number, string> = {
  0: 'border-primary/30',     1: 'border-violet-500/30',
  2: 'border-rose-500/30',    3: 'border-amber-500/30',
  4: 'border-emerald-500/30', 5: 'border-indigo-500/30',
}
const THEME_ACCENT: Record<number, string> = {
  0: 'text-primary',      1: 'text-violet-400',
  2: 'text-rose-400',     3: 'text-amber-400',
  4: 'text-emerald-400',  5: 'text-indigo-400',
}

function themeIndex(id: string): number {
  return id.slice(-6).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 6
}

export function UpdatesClient({ initialUpdates, initialBakes }: Props) {
  const [updates, setUpdates] = useState<ChapterUpdate[]>(initialUpdates)
  const [bakes,   setBakes]   = useState<BakeItem[]>(initialBakes)

  const [pickerOpenFor, setPickerOpenFor] = useState<string | null>(null)
  const [pendingChapter, setPendingChapter] = useState<number>(0)
  const [savingId, setSavingId] = useState<string | null>(null)

  const [actionSheetUpdate, setActionSheetUpdate] = useState<ChapterUpdate | null>(null)
  const [actionSheetBake,   setActionSheetBake]   = useState<BakeItem | null>(null)
  const [busyBakeId, setBusyBakeId] = useState<number | null>(null)

  // ── Tabs + search — added after a real usability issue was flagged:
  // with hundreds of chapter updates, bakes could sit buried at the
  // bottom of the page with no way to jump to them directly, and no way
  // to find one specific title without scrolling through everything. ──
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
        body: JSON.stringify({
          list_id:          update.list_id,
          status:           update.status,
          progress_chapter: pendingChapter,
        }),
      })
      if (!res.ok) throw new Error()
      if (pendingChapter >= update.chapter_count) {
        setUpdates(prev => prev.filter(u => u.recommendation_id !== update.recommendation_id))
      } else {
        setUpdates(prev => prev.map(u =>
          u.recommendation_id === update.recommendation_id
            ? { ...u, progress_chapter: pendingChapter }
            : u
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
      label: 'Read now',
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

  // Search filters by title, case-insensitive, across whichever tab is
  // active. Tab filtering happens first (which lists to even consider),
  // then search narrows within that - so switching to "Bakes" + typing a
  // title searches only bakes, not chapter updates that happen to match.
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
  const updates_    = filteredUpdates
  const hasNothing  = updates.length === 0 && bakes.length === 0
  const hasNoFilteredResults = !hasNothing && filteredUpdates.length === 0 && filteredBakes.length === 0

  // Real counts (unfiltered) for the tab badges, so switching tabs shows
  // stable numbers rather than numbers that shift based on the current
  // search query.
  const totalUpdatesCount = updates.length
  const totalBakesCount   = bakes.filter(b => b.status === 'fulfilled' || b.status === 'active').length

  return (
    <div className="space-y-6">

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

      <div className="space-y-2">
        <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
          <BookOpen size={16} className="text-primary" />
        </div>
          <h1 className="text-2xl font-black tracking-tight leading-none">Updates</h1>
        </div>
        <p className="text-muted-foreground text-sm pl-0.5">
          {totalUpdatesCount + bakes.filter(b => b.status === 'fulfilled').length === 0
            ? "You're all caught up"
            : `${totalUpdatesCount + bakes.filter(b => b.status === 'fulfilled').length} thing${totalUpdatesCount + bakes.filter(b => b.status === 'fulfilled').length !== 1 ? 's' : ''} need your attention`}
        </p>
      </div>

      {/* ── Tabs + search — real fix for the "500 comics, bakes buried at
          the bottom" problem. Tab badges show true unfiltered counts so
          switching tabs doesn't feel like numbers are moving around. ── */}
      {!hasNothing && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {([
              { key: 'all',      label: 'All',      count: totalUpdatesCount + totalBakesCount },
              { key: 'chapters', label: 'Chapters',  count: totalUpdatesCount },
              { key: 'bakes',    label: 'Bakes',     count: totalBakesCount },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 whitespace-nowrap',
                  activeTab === tab.key
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20'
                    : 'bg-background/80 border-border/60 text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                {tab.label}
                <span className={cn(
                  'inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[9px] font-black',
                  activeTab === tab.key ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by title…"
              className="h-9 pl-8 text-sm rounded-xl"
            />
          </div>
        </div>
      )}

      {hasNoFilteredResults && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">
            No {activeTab === 'all' ? 'results' : activeTab} matching
            {searchLower && <span className="font-semibold text-foreground"> "{searchQuery}"</span>}
          </p>
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-xs text-primary hover:underline mt-1">
              Clear search
            </button>
          )}
        </div>
      )}

      {hasNothing && (
        <div className="relative overflow-hidden text-center py-20 rounded-2xl border border-dashed border-border bg-card">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-primary/5 blur-2xl pointer-events-none" />
          <div className="relative w-28 h-28 mx-auto mb-6">
            <div className="absolute top-0 left-2 w-16 h-22 rounded-xl border-2 border-border bg-muted/60 rotate-[-8deg]" />
            <div className="absolute top-2 left-5 w-16 h-22 rounded-xl border-2 border-border bg-muted/80 rotate-[-3deg]" />
            <div className="absolute top-4 left-8 w-16 h-22 rounded-xl border-2 border-primary/30 bg-card flex items-center justify-center shadow-lg">
              <BookOpen size={20} className="text-primary/50" />
            </div>
          </div>
          <h3 className="font-black text-xl mb-2">All caught up</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto leading-relaxed">
            New chapters and ready bakes will show up here as they come in.
          </p>
          <Link href="/browse">
            <Button variant="outline" size="sm" className="gap-2 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all duration-200">
              <Sparkles size={14} />Browse Comics
            </Button>
          </Link>
        </div>
      )}

      {readyBakes.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">
            Ready to binge
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {readyBakes.map(bake => {
              const ti = themeIndex(String(bake.id))
              return (
                <div key={bake.id} className="group relative rounded-2xl border border-orange-500/30 bg-card overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
                  <div className={cn('h-16 relative overflow-hidden bg-gradient-to-br to-transparent', THEME_GRAD[ti])}>
                    {bake.recommendations?.cover_url && (
                      <img
                        src={`/api/image-proxy?url=${encodeURIComponent(bake.recommendations.cover_url)}`}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-60"
                      />
                    )}
                    <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent" />
                    <div className="absolute top-2 left-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-orange-500/20 text-orange-600 border border-orange-500/20 backdrop-blur-sm">
                        <Croissant size={8} /> Ready
                      </span>
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    <p className="font-black text-sm line-clamp-1">{bake.recommendations?.title}</p>
                    <p className="text-xs text-muted-foreground">{bake.target_chapter_count} chapters waiting</p>
                    <div className="flex items-center gap-1.5">
                      <Link href={`/comic/${bake.recommendation_id}`} className="flex-1">
                        <Button size="sm" className="w-full h-7 text-xs gap-1.5">
                          <BookOpen size={11} />Read now
                        </Button>
                      </Link>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => setActionSheetBake(bake)}
                      >
                        <X size={13} />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {updates_.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">
            New chapters
          </p>
          <div className="space-y-2">
            {updates_.map(update => {
              const isPickerOpen = pickerOpenFor === update.recommendation_id
              const isSaving     = savingId === update.recommendation_id
              const currentProgress = update.progress_chapter ?? 0
              const ti = themeIndex(update.recommendation_id)

              return (
                <div key={update.recommendation_id} className={cn('rounded-2xl border bg-card overflow-hidden transition-all duration-200', THEME_BORDER[ti])}>
                  <div className="flex items-center gap-3 p-3">
                    <Link href={`/comic/${update.recommendation_id}`} className="w-10 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                      {update.cover_url ? (
                        <img
                          src={`/api/image-proxy?url=${encodeURIComponent(update.cover_url)}`}
                          alt={update.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen size={14} className="text-muted-foreground/40" />
                        </div>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`/comic/${update.recommendation_id}`} className="font-black text-sm hover:text-primary transition-colors line-clamp-1 block">
                        {update.title}
                      </Link>
                      <p className={cn('text-xs mt-0.5', THEME_ACCENT[ti])}>
                        Ch. {currentProgress} → {update.chapter_count} available
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!isPickerOpen && (
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 hover:border-primary/40 hover:text-primary" onClick={() => openPicker(update)}>
                          <Check size={11} />Update
                        </Button>
                      )}
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => setActionSheetUpdate(update)}
                      >
                        <ArrowRight size={13} />
                      </Button>
                    </div>
                  </div>

                  {isPickerOpen && (
                    <div className="px-3 pb-3 pt-1 border-t border-border/50 space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Ch. {currentProgress}</span>
                        <span className={cn('font-semibold', THEME_ACCENT[ti])}>Reading up to ch. {pendingChapter}</span>
                        <span>Ch. {update.chapter_count}</span>
                      </div>
                      <input
                        type="range"
                        min={currentProgress}
                        max={update.chapter_count}
                        value={pendingChapter}
                        onChange={e => setPendingChapter(Number(e.target.value))}
                        className="w-full accent-primary"
                      />
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="flex-1 h-8 text-xs" onClick={() => setPickerOpenFor(null)}>
                          Cancel
                        </Button>
                        <Button size="sm" className="flex-1 h-8 text-xs gap-1.5" disabled={isSaving} onClick={() => confirmChapter(update)}>
                          {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                          Confirm
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
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground px-1">
            Still baking
          </p>
          <div className="space-y-2">
            {activeBakes.map(bake => {
              const baseline = bake.chapter_count_at_bake_start
              const currentCount = bake.counting_mode === 'from_read'
                ? (bake.progress_chapter ?? baseline)
                : (bake.recommendations?.chapter_count ?? baseline)
              const chaptersSoFar = Math.max(0, currentCount - baseline)
              const progressPct = Math.min(100, Math.round((chaptersSoFar / bake.target_chapter_count) * 100))
              const ti = themeIndex(String(bake.id))

              return (
                <div key={bake.id} className={cn('flex items-center gap-3 p-3 rounded-2xl border bg-card', THEME_BORDER[ti])}>
                  <div className="w-10 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                    {bake.recommendations?.cover_url ? (
                      <img
                        src={`/api/image-proxy?url=${encodeURIComponent(bake.recommendations.cover_url)}`}
                        alt={bake.recommendations.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Croissant size={14} className="text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="font-black text-sm line-clamp-1">{bake.recommendations?.title}</p>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all bg-gradient-to-r', THEME_GRAD[ti])} style={{ width: `${progressPct}%` }} />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {chaptersSoFar}/{bake.target_chapter_count} chapters
                    </p>
                  </div>
                  <Button
                    variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setActionSheetBake(bake)}
                  >
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