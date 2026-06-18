'use client'

import { useState, useRef, useCallback } from 'react'
import { Search, BookOpen, Plus, X, Loader2, Check, Layers } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// Inline image proxy helper to route external covers safely
const proxyCover = (url: string | null): string => {
  if (!url) return ''
  if (url.startsWith('/') || url.startsWith('blob:')) return url
  return \/api/proxy/image?url=\\
}

interface SearchResult {
  id:            string
  title:         string
  type:          string
  cover_url:     string | null
  author:        string | null
  chapter_count: number | null
  status:        string
}

interface Props {
  collectionId: string
  onAdded?:     (comicId: string, title: string) => void
}

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500',
  manhwa:  'bg-teal-500/10   text-teal-500',
  manhua:  'bg-amber-500/10  text-amber-500',
  webtoon: 'bg-teal-500/10   text-teal-500',
  comic:   'bg-blue-500/10   text-blue-500',
}

export function AddToCollectionSearch({ collectionId, onAdded }: Props) {
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [adding,  setAdding]  = useState<string | null>(null)
  const [added,   setAdded]   = useState<Set<string>>(new Set())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return }
    setLoading(true)
    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=6`)
      const data = await res.json()
      setResults(data.results ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleInput = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(value), 300)
  }

  const handleAdd = async (comic: SearchResult) => {
    setAdding(comic.id)
    try {
      const res = await fetch(`/api/collections/${collectionId}/items`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ recommendation_id: comic.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 409) {
          toast.error(`"${comic.title}" is already in this collection`)
          return
        }
        throw new Error(data.error)
      }
      setAdded(prev => new Set([...prev, comic.id]))
      onAdded?.(comic.id, comic.title)
      toast.success(`Added "${comic.title}" to collection`)
    } catch {
      toast.error('Failed to add comic')
    } finally {
      setAdding(null)
    }
  }

  const close = () => {
    setOpen(false)
    setQuery('')
    setResults([])
    setAdded(new Set())
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 text-primary text-sm font-semibold hover:bg-primary/10 hover:border-primary/50 transition-all w-full justify-center"
      >
        <Plus size={14} />
        Add Comic to Collection
      </button>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-lg">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Layers size={13} className="text-primary" />
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Add to Collection</p>
        </div>
        <button onClick={close} className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="p-4 space-y-3">

        {/* Search input */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            autoFocus
            value={query}
            onChange={e => handleInput(e.target.value)}
            placeholder="Search by title, author…"
            className="w-full h-10 pl-9 pr-4 bg-muted border border-border rounded-xl text-sm outline-none focus:border-primary text-foreground placeholder:text-muted-foreground"
          />
          {loading && (
            <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {results.map(comic => {
              const isAdded   = added.has(comic.id)
              const typeColor = TYPE_COLORS[comic.type] ?? 'bg-muted text-muted-foreground'
              const isAdding  = adding === comic.id

              return (
                <div key={comic.id} className={cn(
                  'flex gap-3 p-3 rounded-xl border transition-all',
                  isAdded ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-muted/30'
                )}>
                  {/* Cover */}
                  <div className="w-10 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                    {comic.cover_url
                      ? <img src={`/api/image-proxy?url=${encodeURIComponent(comic.cover_url)}`} alt={comic.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><BookOpen size={12} className="text-muted-foreground opacity-40" /></div>
                    }
                  </div>

                  {/* Info + action */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black truncate">{comic.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize', typeColor)}>
                            {comic.type}
                          </span>
                          {comic.chapter_count && (
                            <span className="text-[10px] text-muted-foreground">{comic.chapter_count} ch.</span>
                          )}
                          {comic.author && (
                            <span className="text-[10px] text-muted-foreground truncate">{comic.author}</span>
                          )}
                        </div>
                      </div>

                      {isAdded ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold shrink-0">
                          <Check size={10} /> Added
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAdd(comic)}
                          disabled={isAdding}
                          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {isAdding ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} />}
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Hints */}
        {!loading && query.trim().length < 2 && (
          <p className="text-xs text-muted-foreground text-center py-2">Type at least 2 characters to search</p>
        )}
        {!loading && query.trim().length >= 2 && results.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">No results for "{query}"</p>
        )}
      </div>
    </div>
  )
}
