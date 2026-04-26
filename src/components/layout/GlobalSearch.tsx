'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, BookOpen, X, ArrowRight, Loader2, TrendingUp, Flame } from 'lucide-react'
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
  id:        string
  title:     string
  type:      string
  cover_url: string | null
  author:    string | null
  genres:    string[]
  status:    string
}

// Curated quick links — specific destinations, not just raw genre names
// Feels like a real product made editorial choices, not an AI that defaulted to 5 obvious words
const QUICK_LINKS = [
  { label: '🔥 Trending',        href: '/browse?sort=trending'        },
  { label: '🆕 New this week',   href: '/browse?sort=recent'          },
  { label: '❤️ Top rated',       href: '/browse?sort=score'           },
  { label: '⚔️ Action',          href: '/browse?genre=Action'         },
  { label: '🌸 Romance',         href: '/browse?genre=Romance'        },
  { label: '✨ Fantasy',         href: '/browse?genre=Fantasy'        },
  { label: '👻 Horror',          href: '/browse?genre=Horror'         },
  { label: '🎭 Drama',           href: '/browse?genre=Drama'          },
  { label: '📖 Completed only',  href: '/browse?status=completed'     },
  { label: '🟣 Manhwa',          href: '/browse?type=manhwa'          },
  { label: '📱 Webtoon',         href: '/browse?type=webtoon'         },
  { label: '💎 Hidden Gems',     href: '/browse?sort=saves'           },
]

export function GlobalSearch() {
  const [open,     setOpen]     = useState(false)
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<SearchResult[]>([])
  const [loading,  setLoading]  = useState(false)
  const [selected, setSelected] = useState(0)

  const router      = useRouter()
  const inputRef    = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setResults([])
    setSelected(0)
  }, [])

  // Cmd+K / Ctrl+K + Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [close])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); return }
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
    close()
  }

  const handleBrowseSearch = () => {
    if (!query.trim()) return
    router.push(`/browse?q=${encodeURIComponent(query.trim())}`)
    close()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(s => Math.min(s + 1, results.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(s => Math.max(s - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selected === results.length) handleBrowseSearch()
      else if (results[selected]) goTo(results[selected].id)
      else if (query.trim()) handleBrowseSearch()
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
      <div
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
        onClick={close}
        onTouchEnd={(e) => { e.preventDefault(); close() }}
      />

      <div className="fixed inset-x-4 top-16 z-[70] max-w-xl mx-auto sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full">
        <div
          className="rounded-2xl border border-border bg-card shadow-2xl shadow-black/30 overflow-hidden"
          onTouchEnd={e => e.stopPropagation()}
        >

          {/* Input row */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
            <Search size={16} className="text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => handleInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search by title, author, genre…"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
            />
            {loading ? (
              <Loader2 size={14} className="animate-spin text-muted-foreground shrink-0" />
            ) : query ? (
              <button
                onClick={() => { setQuery(''); setResults([]) }}
                className="text-muted-foreground hover:text-foreground p-1"
              >
                <X size={14} />
              </button>
            ) : null}
            <button
              onClick={close}
              className="ml-1 flex items-center justify-center h-7 w-7 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label="Close search"
            >
              <X size={14} />
            </button>
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
                      <div className="w-8 h-11 rounded-lg overflow-hidden bg-muted shrink-0">
                        {r.cover_url ? (
                          <img src={r.cover_url} alt={r.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen size={12} className="text-muted-foreground opacity-40" />
                          </div>
                        )}
                      </div>
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
                        See all results for "{query}"
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Browse with filters</p>
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
              <p className="text-sm font-semibold">Nothing found for "{query}"</p>
              <p className="text-xs text-muted-foreground">Try the title, author name, or a genre</p>
            </div>
          )}

          {/* Quick links — editorial picks, not generic genre chips */}
          {query.trim().length < 2 && (
            <div className="px-4 py-4 space-y-3">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <Flame size={10} />
                Jump to
              </div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_LINKS.map(link => (
                  <button
                    key={link.href}
                    onClick={() => { router.push(link.href); close() }}
                    className="px-2.5 py-1.5 rounded-lg border border-border bg-muted/40 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer — hidden on mobile */}
          <div className="hidden sm:flex px-4 py-2 border-t border-border items-center gap-3 text-[10px] text-muted-foreground/60">
            <span><kbd className="font-mono">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono">↵</kbd> select</span>
            <span><kbd className="font-mono">esc</kbd> close</span>
          </div>
        </div>
      </div>
    </>
  )
}