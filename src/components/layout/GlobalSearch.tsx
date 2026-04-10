'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, BookOpen, X, ArrowRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500',
  manhwa:  'bg-violet-500/10 text-violet-500',
  manhua:  'bg-amber-500/10  text-amber-500',
  webtoon: 'bg-teal-500/10   text-teal-500',
  comic:   'bg-blue-500/10   text-blue-500',
  other:   'bg-zinc-500/10   text-zinc-400',
}

interface SearchResult {
  id: string
  title: string
  type: string
  cover_url: string | null
  author: string | null
  genres: string[]
  status: string
}

export function GlobalSearch() {
  const [open,    setOpen]    = useState(false)
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(0)

  const router     = useRouter()
  const inputRef   = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Open on Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') {
        setOpen(false)
        setQuery('')
        setResults([])
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
      setResults([])
      setSelected(0)
    }
  }, [open])

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`)
      const data = await res.json()
      setResults(data.results ?? [])
      setSelected(0)
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

  const goTo = (id: string) => {
    router.push(`/comic/${id}`)
    setOpen(false)
  }

  const handleBrowseSearch = () => {
    if (!query.trim()) return
    router.push(`/browse?q=${encodeURIComponent(query.trim())}`)
    setOpen(false)
  }

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(s => Math.min(s + 1, results.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(s => Math.max(s - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selected === results.length) {
        handleBrowseSearch()
      } else if (results[selected]) {
        goTo(results[selected].id)
      } else if (query.trim()) {
        handleBrowseSearch()
      }
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-8 px-3 rounded-xl border border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-muted/60 transition-all text-sm"
        aria-label="Search comics"
      >
        <Search size={13} />
        <span className="hidden sm:inline text-xs">Search…</span>
        <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-background border border-border text-[10px] font-mono text-muted-foreground/60 ml-1">
          ⌘K
        </kbd>
      </button>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-16 z-[70] max-w-xl mx-auto sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full">
        <div className="rounded-2xl border border-border bg-card shadow-2xl shadow-black/30 overflow-hidden">

          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
            <Search size={16} className="text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => handleInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search comics, manhwa, webtoons…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
            />
            {loading
              ? <Loader2 size={14} className="animate-spin text-muted-foreground shrink-0" />
              : query && (
                  <button onClick={() => { setQuery(''); setResults([]) }} className="text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
                )
            }
          </div>

          {/* Results */}
          {results.length > 0 && (
            <ul className="py-1.5 max-h-[360px] overflow-y-auto">
              {results.map((r, i) => {
                const typeColor = TYPE_COLORS[r.type] ?? TYPE_COLORS.other
                return (
                  <li key={r.id}>
                    <button
                      onClick={() => goTo(r.id)}
                      onMouseEnter={() => setSelected(i)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                        selected === i ? 'bg-primary/8' : 'hover:bg-muted/40'
                      )}
                    >
                      {/* Cover thumbnail */}
                      <div className="w-8 h-11 rounded-lg overflow-hidden bg-muted shrink-0">
                        {r.cover_url ? (
                          <img src={r.cover_url} alt={r.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen size={12} className="text-muted-foreground opacity-40" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{r.title}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full capitalize', typeColor)}>
                            {r.type}
                          </span>
                          {r.author && (
                            <span className="text-[10px] text-muted-foreground truncate">{r.author}</span>
                          )}
                        </div>
                      </div>

                      <ArrowRight size={12} className={cn('shrink-0 transition-opacity', selected === i ? 'opacity-100 text-primary' : 'opacity-0')} />
                    </button>
                  </li>
                )
              })}

              {/* Browse all results */}
              {query.trim().length >= 2 && (
                <li>
                  <button
                    onClick={handleBrowseSearch}
                    onMouseEnter={() => setSelected(results.length)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-t border-border mt-1',
                      selected === results.length ? 'bg-primary/8' : 'hover:bg-muted/40'
                    )}
                  >
                    <div className="w-8 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Search size={12} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary">
                        Browse all results for "{query}"
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">See full results with filters</p>
                    </div>
                    <ArrowRight size={12} className={cn('shrink-0 text-primary transition-opacity', selected === results.length ? 'opacity-100' : 'opacity-0')} />
                  </button>
                </li>
              )}
            </ul>
          )}

          {/* Empty state */}
          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="px-4 py-8 text-center space-y-1">
              <p className="text-sm font-semibold">No results for "{query}"</p>
              <p className="text-xs text-muted-foreground">Try a different title or author name</p>
            </div>
          )}

          {/* Hint when empty */}
          {query.trim().length < 2 && (
            <div className="px-4 py-5 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Quick links</p>
              <div className="flex flex-wrap gap-2">
                {['Action', 'Romance', 'Fantasy', 'Horror', 'Sci-Fi'].map(genre => (
                  <button
                    key={genre}
                    onClick={() => { router.push(`/browse?genre=${genre}`); setOpen(false) }}
                    className="px-3 py-1.5 rounded-full border border-border bg-muted/40 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer hint */}
          <div className="px-4 py-2 border-t border-border flex items-center gap-3 text-[10px] text-muted-foreground/60">
            <span><kbd className="font-mono">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono">↵</kbd> select</span>
            <span><kbd className="font-mono">esc</kbd> close</span>
          </div>
        </div>
      </div>
    </>
  )
}