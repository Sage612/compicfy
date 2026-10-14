'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { UpgradeBanner } from '@/components/pro/UpgradeBanner'
import { PageHeader } from '@/components/dashboard/PageHeader'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils/format'
import type { Recommendation } from '@/types/app.types'

export interface SavedItem {
  saved_at: string
  rec:      Recommendation
}

interface Props {
  initialItems: SavedItem[]
  userId:       string
  isPro:        boolean
  saveLimit:    number
  backHref:     string
}

type ViewMode = 'grid' | 'list'
const VIEW_KEY = 'compicfy_saved_view'

function proxyCover(url: string | null | undefined): string {
  if (!url) return ''
  if (url.startsWith('data:') || url.startsWith('/')) return url
  if (url.includes('/api/image-proxy')) return url
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

export function SavedComicsClient({ initialItems, userId, isPro, saveLimit, backHref }: Props) {
  const [items,      setItems]      = useState<SavedItem[]>(initialItems)
  const [view,       setView]       = useState<ViewMode>('grid')
  const [removingId, setRemovingId] = useState<string | null>(null)

  // Remembered per-browser; the page renders fine without it.
  useEffect(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY)
      if (v === 'grid' || v === 'list') setView(v)
    } catch { /* ignore */ }
  }, [])

  const changeView = (v: ViewMode) => {
    setView(v)
    try { localStorage.setItem(VIEW_KEY, v) } catch { /* ignore */ }
  }

  // Goes through /api/saves — the same route SaveButton uses — so limits and
  // the total_saves trigger behave identically everywhere.
  const undo = async (item: SavedItem) => {
    try {
      const res = await fetch('/api/saves', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recommendation_id: item.rec.id }),
      })
      if (!res.ok) throw new Error()
      setItems(prev => [{ ...item, saved_at: new Date().toISOString() }, ...prev])
    } catch {
      toast.error('Could not restore')
    }
  }

  const remove = async (item: SavedItem) => {
    if (removingId) return
    setRemovingId(item.rec.id)
    try {
      const res = await fetch('/api/saves', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recommendation_id: item.rec.id }),
      })
      if (!res.ok) throw new Error()
      setItems(prev => prev.filter(i => i.rec.id !== item.rec.id))
      toast(`Removed "${item.rec.title}"`, {
        action: { label: 'Undo', onClick: () => undo(item) },
      })
    } catch {
      toast.error('Could not remove this comic')
    } finally {
      setRemovingId(null)
    }
  }

  const count      = items.length
  const showBanner = !isPro && count >= Math.floor(saveLimit * 0.8)
  const atLimit    = !isPro && count >= saveLimit

  return (
    <>
      <PageHeader
        eyebrow="Library"
        title="Saved"
        subtitle={isPro ? `${count} saved` : `${count} of ${saveLimit} saved`}
        backHref={backHref}
        backLabel="Dashboard"
        isPro={isPro}
        actions={
          <>
            <div className="inline-flex rounded-full border border-border p-0.5 text-xs" role="group" aria-label="View">
              {(['grid', 'list'] as const).map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => changeView(v)}
                  aria-pressed={view === v}
                  className={cn(
                    'px-3 py-1 rounded-full capitalize transition-colors',
                    view === v ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {v}
                </button>
              ))}
            </div>
            <Link
              href="/browse"
              className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              Browse
            </Link>
          </>
        }
      />

      {showBanner && (
        <UpgradeBanner
          current={count}
          limit={saveLimit}
          feature="saved comics"
          message={atLimit ? `You've reached your save limit` : `You're approaching your save limit`}
          dismissible
        />
      )}

      {count === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-border space-y-3 text-center">
          <div>
            <p className="font-dashboard-serif text-lg text-foreground">Nothing saved yet</p>
            <p className="text-sm text-muted-foreground mt-1">Save comics you want to come back to.</p>
          </div>
          <Link href="/browse" className="text-xs text-foreground underline underline-offset-4 hover:text-muted-foreground transition-colors">
            Browse comics
          </Link>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {items.map(item => (
            <div key={item.rec.id} className="group relative">
              <ComicCard recommendation={item.rec} />
              <button
                type="button"
                onClick={() => remove(item)}
                disabled={removingId === item.rec.id}
                className="absolute top-2 right-2 z-10 text-[11px] px-2 py-1 rounded-full bg-background/90 backdrop-blur border border-border text-muted-foreground hover:text-foreground disabled:opacity-50 md:opacity-0 md:group-hover:opacity-100 focus:opacity-100 transition-opacity"
              >
                {removingId === item.rec.id ? 'Removing…' : 'Remove'}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {items.map(({ rec, saved_at }) => (
            <li key={rec.id} className="flex items-center gap-3 py-3">
              <Link href={`/comic/${rec.id}`} className="w-10 h-14 rounded-md overflow-hidden bg-muted shrink-0">
                {rec.cover_url && <img src={proxyCover(rec.cover_url)} alt={rec.title} className="w-full h-full object-cover" />}
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/comic/${rec.id}`} className="font-dashboard-serif text-base text-foreground hover:text-muted-foreground transition-colors line-clamp-1">
                  {rec.title}
                </Link>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                  {[rec.type, rec.chapter_count ? `${rec.chapter_count} ch.` : null, `Saved ${formatDate(saved_at)}`].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove({ rec, saved_at })}
                disabled={removingId === rec.id}
                className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors shrink-0"
              >
                {removingId === rec.id ? 'Removing…' : 'Remove'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}