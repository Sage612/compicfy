'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation' // <-- Added usePathname
import { Search, BookOpen, X, ArrowRight, Loader2, Flame, Plus, CheckCircle2, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SearchResult } from '@/app/api/search/route'

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500',
  manhwa:  'bg-violet-500/10 text-violet-500',
  manhua:  'bg-amber-500/10  text-amber-500',
  webtoon: 'bg-teal-500/10   text-teal-500',
  comic:   'bg-blue-500/10   text-blue-500',
  other:   'bg-zinc-500/10   text-zinc-400',
}

const SOURCE_LABELS: Record<string, string> = {
  local:        'Compicfy',
  jikan:        'MAL',
  anilist:      'AniList',
  mangadex:     'MangaDex',
  mangaupdates: 'MU',
}

const QUICK_LINKS = [
  { label: '🔥 Trending',       href: '/browse?sort=trending' },
  { label: '🆕 New this week', href: '/browse?sort=recent'   },
  { label: '❤️ Top rated',     href: '/browse?sort=score'    },
  { label: '⚔️ Action',        href: '/browse?genre=Action'  },
  { label: '🌸 Romance',       href: '/browse?genre=Romance' },
  { label: '✨ Fantasy',       href: '/browse?genre=Fantasy' },
]

// Now accepts basePath
function buildPrefillUrl(result: SearchResult, basePath: string): string {
  if (!result.prefill) return `${basePath}/recommendations/new`
  const p = result.prefill
  const params = new URLSearchParams()
  if (p.title)          params.set('title',       p.title)
  if (p.type)           params.set('type',         p.type)
  if (p.status)         params.set('status',       p.status)
  if (p.description)    params.set('description', p.description.slice(0, 2000))
  if (p.author)         params.set('author',       p.author)
  if (p.artist)         params.set('artist',       p.artist)
  if (p.cover_url)      params.set('cover_url',   p.cover_url)
  if (p.year_released)  params.set('year',         String(p.year_released))
  if (p.chapter_count)  params.set('chapters',     String(p.chapter_count))
  if (p.genres?.length) params.set('genres',       p.genres.join(','))
  return `${basePath}/recommendations/new?${params.toString()}`
}

export function GlobalSearch() {
  const [open,     setOpen]     = useState(false)
  const [query,    setQuery]    = useState('')
  const [results,  setResults]  = useState<SearchResult[]>([])
  const [loading,  setLoading]  = useState(false)
  const [selected, setSelected] = useState(0)

  const router      = useRouter()
  const pathname    = usePathname() // <-- Added
  const inputRef    = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Determine if we are in /pro or /dashboard instantly
  const basePath = pathname.startsWith('/pro') ? '/pro' : '/dashboard'
  // Determine if full search should go to /pro/search or /dashboard/search or /search
  const searchPath = pathname.startsWith('/pro') ? '/pro/search' : pathname.startsWith('/dashboard') ? '/dashboard/search' : '/search'

  const close = useCallback(() => {
    setOpen(false)
    setQuery('')
    setResults([])
    setSelected(0)
  }, [])

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

  const goToLocal = (id: string) => {
    router.push(`/comic/${id}`)
    close()
  }

  const goToRecommend = (result: SearchResult) => {
    router.push(buildPrefillUrl(result, basePath)) // <-- Pass basePath
    close()
  }

  const goToSearchPage = () => {
    if (!query.trim()) return
    router.push(`${searchPath}?q=${encodeURIComponent(query.trim())}`) // <-- Use dynamic searchPath
    close()
  }

  const local    = results.filter(r => r.source === 'local')
  const external = results.filter(r => r.source !== 'local')
  const allItems = [...local, ...external]
  const totalNav = allItems.length + 1 

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelected(s => Math.min(s + 1, totalNav - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelected(s => Math.max(s - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selected === allItems.length) {
        goToSearchPage()
      } else if (allItems[selected]) {
        const item = allItems[selected]
        if (item.source === 'local') goToLocal(item.id)
        else goToRecommend(item)
      } else if (query.trim()) {
        goToSearchPage()
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
              placeholder="Search comics, authors, genres…"
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
            <ul className="py-1.5 max-h-[420px] overflow-y-auto">

              {local.length > 0 && (
                <>
                  <li className="px-4 py-1.5 flex items-center gap-1.5">
                    <CheckCircle2 size={10} className="text-primary" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">On Compicfy</span>
                  </li>
                  {local.map((r, i) => (
                    <li key={r.id}>
                      <button
                        onClick={() => goToLocal(r.id)}
                        onMouseEnter={() => setSelected(i)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                          selected === i ? 'bg-primary/8' : 'hover:bg-muted/40'
                        )}
                      >
                        <div className="w-8 h-11 rounded-lg overflow-hidden bg-muted shrink-0">
                          {r.cover_url
                            ? <img src={r.cover_url} alt={r.title} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center"><BookOpen size={11} className="text-muted-foreground opacity-40" /></div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{r.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize', TYPE_COLORS[r.type] ?? TYPE_COLORS.other)}>{r.type}</span>
                            {r.author && <span className="text-[9px] text-muted-foreground truncate">{r.author}</span>}
                          </div>
                        </div>
                        <ArrowRight size={12} className={cn('shrink-0 transition-opacity', selected === i ? 'opacity-100 text-primary' : 'opacity-0')} />
                      </button>
                    </li>
                  ))}
                </>
              )}

              {external.length > 0 && (
                <>
                  <li className="px-4 py-1.5 flex items-center gap-1.5 mt-1 border-t border-border">
                    <ExternalLink size={10} className="text-muted-foreground" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Not on Compicfy yet</span>
                  </li>
                  {external.map((r, i) => {
                    const globalIdx = local.length + i
                    const srcLabel  = SOURCE_LABELS[r.source] ?? r.source
                    return (
                      <li key={r.id}>
                        <button
                          onClick={() => goToRecommend(r)}
                          onMouseEnter={() => setSelected(globalIdx)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                            selected === globalIdx ? 'bg-primary/8' : 'hover:bg-muted/40'
                          )}
                        >
                          <div className="w-8 h-11 rounded-lg overflow-hidden bg-muted shrink-0">
                            {r.cover_url
                              ? <img src={r.cover_url} alt={r.title} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center"><BookOpen size={11} className="text-muted-foreground opacity-40" /></div>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate text-muted-foreground group-hover:text-foreground">{r.title}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize', TYPE_COLORS[r.type] ?? TYPE_COLORS.other)}>{r.type}</span>
                              <span className="text-[9px] text-muted-foreground/60 font-semibold">{srcLabel}</span>
                            </div>
                          </div>
                          <span className={cn(
                            'shrink-0 flex items-center gap-1 text-[9px] font-black px-2 py-1 rounded-full border transition-all',
                            selected === globalIdx
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-primary/10 text-primary border-primary/20'
                          )}>
                            <BookOpen size={9} />
                            Recommend
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </>
              )}

              {query.trim().length >= 2 && (
                <li>
                  <button
                    onClick={goToSearchPage}
                    onMouseEnter={() => setSelected(allItems.length)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-t border-border mt-1',
                      selected === allItems.length ? 'bg-primary/8' : 'hover:bg-muted/40'
                    )}
                  >
                    <div className="w-8 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Search size={12} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary">See all results for "{query}"</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">Full search page with more results</p>
                    </div>
                    <ArrowRight size={12} className={cn('shrink-0 text-primary transition-opacity', selected === allItems.length ? 'opacity-100' : 'opacity-0')} />
                  </button>
                </li>
              )}
            </ul>
          )}

          {!loading && query.trim().length >= 2 && results.length === 0 && (
            <div className="px-4 py-8 text-center space-y-1">
              <p className="text-sm font-semibold">Nothing found for "{query}"</p>
              <p className="text-xs text-muted-foreground">Try the full search page for more options</p>
              <button
                onClick={goToSearchPage}
                className="mt-2 text-xs text-primary hover:underline flex items-center gap-1 mx-auto"
              >
                <Search size={11} />
                Search full database
              </button>
            </div>
          )}

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

          <div className="hidden sm:flex px-4 py-2 border-t border-border items-center gap-3 text-[10px] text-muted-foreground/60">
            <span><kbd className="font-mono">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono">↵</kbd> select</span>
            <span><kbd className="font-mono">esc</kbd> close</span>
            <span className="ml-auto">Results from Compicfy · MAL · AniList · MangaDex · MU</span>
          </div>
        </div>
      </div>
    </>
  )
}