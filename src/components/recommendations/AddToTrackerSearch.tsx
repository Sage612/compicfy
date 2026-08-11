'use client'

import { useState, useRef, useCallback } from 'react'
import { Search, BookOpen, Plus, X, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface SearchResult {
  id:            string
  title:         string
  type:          string
  cover_url:     string | null
  author:        string | null
  chapter_count: number | null
  status:        string
}

interface ReadingList {
  id:   string
  name: string
}

interface Props {
  lists:     ReadingList[]
  onAdded?:  (comicId: string, title: string, listId: string, status: string) => void
}

const QUICK_STATUSES = [
  { value: 'reading',      label: 'Reading'      },
  { value: 'plan_to_read', label: 'Plan to read' },
  { value: 'completed',    label: 'Completed'    },
  { value: 'on_hold',      label: 'On hold'      },
  { value: 'dropped',      label: 'Dropped'      },
  { value: 'marinating',   label: 'Marinating'   },
]

export function AddToTrackerSearch({ lists, onAdded }: Props) {
  const [open,       setOpen]       = useState(false)
  const [query,      setQuery]      = useState('')
  const [results,    setResults]    = useState<SearchResult[]>([])
  const [loading,    setLoading]    = useState(false)
  const [adding,     setAdding]     = useState<string | null>(null) // comicId-status being added
  const [added,      setAdded]      = useState<Set<string>>(new Set())
  const [activeList, setActiveList] = useState(lists[0]?.id ?? '')
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

  const handleAdd = async (comic: SearchResult, status: string) => {
    if (!activeList) { toast.error('Select a list first'); return }
    setAdding(`${comic.id}-${status}`)
    try {
      const res = await fetch(`/api/reading-progress/${comic.id}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list_id: activeList, status }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      setAdded(prev => new Set([...prev, comic.id]))
      onAdded?.(comic.id, comic.title, activeList, status)

      const label = QUICK_STATUSES.find(s => s.value === status)?.label ?? 'Reading'
      toast.success(`Added "${comic.title}" · ${label}`)
    } catch {
      toast.error('Failed to add')
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
        className="flex items-center gap-2 py-2.5 text-sm text-muted-foreground hover:text-foreground border-b border-border/50 hover:border-foreground/40 w-full transition-colors group"
      >
        <Plus size={14} className="text-muted-foreground/60 group-hover:text-foreground transition-colors" />
        Add a comic
      </button>
    )
  }

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/70">Add to tracker</p>
        <button onClick={close} className="text-muted-foreground/60 hover:text-foreground transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* List selector */}
        {lists.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground/60 shrink-0">List</span>
            <select
              value={activeList}
              onChange={e => setActiveList(e.target.value)}
              className="flex-1 text-sm bg-transparent border-0 border-b border-border/50 px-0 py-1 outline-none text-foreground focus:border-foreground/60 transition-colors"
            >
              {lists.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Search input */}
        <div className="relative">
          <Search size={13} className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
          <input
            autoFocus
            value={query}
            onChange={e => handleInput(e.target.value)}
            placeholder="Search by title, author…"
            className="w-full h-9 pl-5 pr-6 bg-transparent border-0 border-b border-border/50 text-sm outline-none focus:border-foreground/60 text-foreground placeholder:text-muted-foreground/50 transition-colors"
          />
          {loading && (
            <Loader2 size={13} className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground/50 animate-spin" />
          )}
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="divide-y divide-border/40 max-h-72 overflow-y-auto -mx-4">
            {results.map(comic => {
              const isAdded = added.has(comic.id)

              return (
                <div key={comic.id} className={cn('flex gap-3 px-4 py-3', isAdded && 'opacity-60')}>
                  {/* Cover */}
                  <div className="w-10 h-14 rounded-md overflow-hidden bg-muted shrink-0">
                    {comic.cover_url ? (
                      <img src={`/api/image-proxy?url=${encodeURIComponent(comic.cover_url)}`} alt={comic.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={12} className="text-muted-foreground opacity-40" />
                      </div>
                    )}
                  </div>

                  {/* Info + actions */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{comic.title}</p>
                        <p className="text-[11px] text-muted-foreground/60 italic mt-0.5 truncate">
                          {comic.type}
                          {comic.chapter_count ? ` · ${comic.chapter_count} ch.` : ''}
                          {comic.author ? ` · ${comic.author}` : ''}
                        </p>
                      </div>
                      {isAdded && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-foreground shrink-0">
                          <Check size={10} />
                          Added
                        </span>
                      )}
                    </div>

                    {/* Quick add — plain text, dot-separated */}
                    {!isAdded && (
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {QUICK_STATUSES.map(s => (
                          <button
                            key={s.value}
                            onClick={() => handleAdd(comic, s.value)}
                            disabled={!!adding}
                            className="text-[11px] text-muted-foreground/70 hover:text-foreground transition-colors flex items-center gap-1"
                          >
                            {adding === `${comic.id}-${s.value}` && <Loader2 size={9} className="animate-spin" />}
                            {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Empty hint */}
        {!loading && query.trim().length < 2 && (
          <p className="text-xs text-muted-foreground/50 text-center py-2">
            Type at least 2 characters to search
          </p>
        )}
        {!loading && query.trim().length >= 2 && results.length === 0 && (
          <p className="text-xs text-muted-foreground/50 text-center py-2">
            No results for "{query}"
          </p>
        )}
      </div>
    </div>
  )
}