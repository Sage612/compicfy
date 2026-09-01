'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Pin, X, Loader2, Search, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const MAX_PINNED = 3

interface CandidateComic {
  id:        string
  title:     string
  cover_url: string | null
}

function proxyCover(url: string | null): string {
  if (!url) return ''
  if (url.startsWith('/') || url.startsWith('blob:')) return url
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

interface Props {
  initialPinnedIds: string[]
  // Full candidate pool — saves + own recommendations — resolved server-side
  // and passed in, so this component doesn't need its own data-fetching path.
  candidates:       CandidateComic[]
}

export function PinnedFavoritesEditor({ initialPinnedIds, candidates }: Props) {
  const [pinnedIds, setPinnedIds] = useState<string[]>(initialPinnedIds)
  const [saving,    setSaving]    = useState(false)
  const [isOpen,    setIsOpen]    = useState(false)
  const [query,     setQuery]     = useState('')
  const router = useRouter()

  const pinnedComics = pinnedIds
    .map(id => candidates.find(c => c.id === id))
    .filter((c): c is CandidateComic => !!c)

  const filteredCandidates = candidates.filter(c =>
    !pinnedIds.includes(c.id) &&
    c.title.toLowerCase().includes(query.toLowerCase())
  )

  async function persist(nextIds: string[]) {
    setSaving(true)
    try {
      const res = await fetch('/api/profile/pinned-favorites', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recommendation_ids: nextIds }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 403 && data?.error === 'pro_feature_required') {
          toast.error(data.message ?? 'Pinning favorites is a Pro feature.', {
            action: { label: 'Upgrade', onClick: () => router.push('/pricing') },
            duration: 6000,
          })
          return
        }
        throw new Error(data?.error ?? 'Failed to update pinned favorites')
      }

      setPinnedIds(nextIds)
      toast.success('Favorites updated')
      router.refresh()
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update pinned favorites')
    } finally {
      setSaving(false)
    }
  }

  function addPin(id: string) {
    if (pinnedIds.length >= MAX_PINNED) {
      toast.error(`You can pin up to ${MAX_PINNED} favorites`)
      return
    }
    persist([...pinnedIds, id])
  }

  function removePin(id: string) {
    persist(pinnedIds.filter(pid => pid !== id))
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map(slot => {
          const comic = pinnedComics[slot]
          return (
            <div
              key={slot}
              className="relative aspect-[2/3] rounded-xl overflow-hidden border border-border bg-muted group"
            >
              {comic ? (
                <>
                  <img
                    src={proxyCover(comic.cover_url)}
                    alt={comic.title}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removePin(comic.id)}
                    disabled={saving}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove pin"
                  >
                    <X size={12} className="text-white" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-white text-[10px] font-bold line-clamp-2">{comic.title}</p>
                  </div>
                </>
              ) : (
                <button
                  onClick={() => setIsOpen(true)}
                  className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  <Pin size={16} />
                  <span className="text-[9px] font-semibold">Pin a favorite</span>
                </button>
              )}
            </div>
          )
        })}
      </div>

      {isOpen && (
        <div className="rounded-xl border border-border bg-card p-3 space-y-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search your saved comics and recommendations…"
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-xs"
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filteredCandidates.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                {candidates.length === 0
                  ? 'Save or recommend some comics first'
                  : 'No matches'}
              </p>
            ) : (
              filteredCandidates.map(c => (
                <button
                  key={c.id}
                  onClick={() => { addPin(c.id); setIsOpen(false); setQuery('') }}
                  disabled={saving}
                  className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-left"
                >
                  <div className="w-6 h-8 rounded overflow-hidden bg-muted shrink-0">
                    {c.cover_url ? (
                      <img src={proxyCover(c.cover_url)} alt={c.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={9} className="text-muted-foreground opacity-40" />
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-medium truncate">{c.title}</span>
                </button>
              ))
            )}
          </div>
          <Button size="sm" variant="ghost" className="w-full h-7 text-xs" onClick={() => setIsOpen(false)}>
            Close
          </Button>
        </div>
      )}
    </div>
  )
}