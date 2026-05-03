'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Search, Loader2, BookOpen, X, ArrowRight,
  Database, Globe, Plus, ExternalLink,
  TrendingUp, Sparkles, Star, Radar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── Types ─────────────────────────────────────────────────────────

interface DBResult {
  source: 'compicfy'
  id: string
  title: string
  type: string
  cover_url: string | null
  author: string | null
  genres: string[]
  status: string
  upvotes: number
  score: number
}

interface ExternalResult {
  source: 'jikan' | 'mangadex' | 'anilist' | 'mangaupdates'
  id: string
  title: string
  type: string
  coverUrl: string
  author: string
  genres: string[]
  status: string
  year: number | null
  chapters: number | null
  score: number | null
  description: string
  alternativeTitles: string[]
  artist: string
}

type AnyResult = DBResult | ExternalResult

// ── Constants ─────────────────────────────────────────────────────

const QUICK_LINKS = [
  { label: '🔥 Trending',      href: '/browse?sort=trending' },
  { label: '🆕 New this week', href: '/browse?sort=recent'   },
  { label: '❤️ Top rated',     href: '/browse?sort=score'    },
  { label: '⚔️ Action',        href: '/browse?genre=Action'  },
  { label: '🌸 Romance',       href: '/browse?genre=Romance' },
  { label: '✨ Fantasy',       href: '/browse?genre=Fantasy' },
  { label: '👻 Horror',        href: '/browse?genre=Horror'  },
  { label: '🎭 Drama',         href: '/browse?genre=Drama'   },
  { label: '🚀 Sci-Fi',        href: '/browse?genre=Sci-Fi'  },
  { label: '😂 Comedy',        href: '/browse?genre=Comedy'  },
]

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500   border-rose-500/20',
  manhwa:  'bg-violet-500/10 text-violet-500 border-violet-500/20',
  manhua:  'bg-amber-500/10  text-amber-500  border-amber-500/20',
  webtoon: 'bg-teal-500/10   text-teal-500   border-teal-500/20',
  comic:   'bg-blue-500/10   text-blue-500   border-blue-500/20',
  other:   'bg-zinc-500/10   text-zinc-400   border-zinc-500/20',
}

const SOURCE_META: Record<string, { label: string; color: string }> = {
  compicfy:     { label: 'Compicfy',    color: 'bg-primary/10   text-primary   border-primary/20'   },
  jikan:        { label: 'MAL',         color: 'bg-blue-500/10  text-blue-600  border-blue-500/20'  },
  mangadex:     { label: 'MangaDex',    color: 'bg-orange-500/10 text-orange-600 border-orange-500/20' },
  anilist:      { label: 'AniList',     color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' },
  mangaupdates: { label: 'MangaUpdates', color: 'bg-teal-500/10 text-teal-600  border-teal-500/20'  },
}

// ── Pre-fill URL builder for external results ─────────────────────

function buildPrefillUrl(result: ExternalResult, isPro: boolean): string {
  const base = isPro ? '/pro/recommendations/new' : '/dashboard/recommendations/new'
  const params = new URLSearchParams({
    title:       result.title       ?? '',
    author:      result.author      ?? '',
    artist:      result.artist      ?? '',
    description: result.description?.slice(0, 2000) ?? '',
    type:        result.type        ?? 'manga',
    status:      result.status      ?? 'ongoing',
    cover_url:   result.coverUrl    ?? '',
    ...(result.year     ? { year_released: String(result.year)     } : {}),
    ...(result.chapters ? { chapter_count: String(result.chapters) } : {}),
    genres:      (result.genres ?? []).slice(0, 5).join(','),
  })
  return `${base}?${params.toString()}`
}

// ── Result Card ───────────────────────────────────────────────────

function DBCard({ result }: { result: DBResult }) {
  const typeColor  = TYPE_COLORS[result.type] ?? TYPE_COLORS.other

  return (
    <Link
      href={`/comic/${result.id}`}
      className="group flex gap-4 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200"
    >
      {/* Cover */}
      <div className="w-14 h-20 rounded-xl overflow-hidden bg-muted shrink-0 shadow-sm">
        {result.cover_url ? (
          <img
            src={result.cover_url}
            alt={result.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen size={16} className="text-muted-foreground opacity-40" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1.5 py-0.5">
        <div className="flex items-start justify-between gap-2">
          <p className="font-black text-sm line-clamp-1 group-hover:text-primary transition-colors">
            {result.title}
          </p>
          <ArrowRight size={13} className="text-muted-foreground/30 group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border', SOURCE_META.compicfy.color)}>
            <Database size={8} />
            Compicfy
          </span>
          <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize', typeColor)}>
            {result.type}
          </span>
          <span className="text-[10px] text-muted-foreground capitalize">{result.status}</span>
        </div>

        {result.author && (
          <p className="text-xs text-muted-foreground truncate">by {result.author}</p>
        )}

        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          {result.upvotes > 0 && (
            <span className="flex items-center gap-1">
              <TrendingUp size={9} className="text-emerald-500" />
              {result.upvotes} upvotes
            </span>
          )}
          {result.genres?.slice(0, 3).map(g => (
            <span key={g} className="opacity-60">{g}</span>
          ))}
        </div>
      </div>
    </Link>
  )
}

function ExternalCard({
  result,
  isPro,
}: {
  result: ExternalResult
  isPro: boolean
}) {
  const typeColor   = TYPE_COLORS[result.type]  ?? TYPE_COLORS.other
  const sourceMeta  = SOURCE_META[result.source] ?? { label: result.source, color: 'bg-muted text-muted-foreground border-border' }
  const prefillHref = buildPrefillUrl(result, isPro)

  return (
    <div className="group flex gap-4 p-4 rounded-2xl border border-border bg-card/60 hover:border-violet-500/30 hover:shadow-md transition-all duration-200">
      {/* Cover */}
      <div className="w-14 h-20 rounded-xl overflow-hidden bg-muted shrink-0 shadow-sm">
        {result.coverUrl ? (
          <img
            src={result.coverUrl}
            alt={result.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen size={16} className="text-muted-foreground opacity-40" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 space-y-1.5 py-0.5">
        <p className="font-black text-sm line-clamp-1">{result.title}</p>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border', sourceMeta.color)}>
            <Globe size={8} />
            {sourceMeta.label}
          </span>
          <span className={cn('inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize', typeColor)}>
            {result.type}
          </span>
          <span className="text-[10px] text-muted-foreground capitalize">{result.status}</span>
          {result.score != null && result.score > 0 && (
            <span className="flex items-center gap-0.5 text-[10px] text-amber-500 font-bold">
              <Star size={9} className="fill-amber-400" />
              {result.score.toFixed(1)}
            </span>
          )}
        </div>

        {result.author && (
          <p className="text-xs text-muted-foreground truncate">by {result.author}</p>
        )}

        {result.description && (
          <p className="text-[11px] text-muted-foreground/70 line-clamp-2 leading-relaxed">
            {result.description}
          </p>
        )}

        {/* Not in Compicfy — recommend CTA */}
        <div className="pt-1">
          <Link href={prefillHref}>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-[11px] border-violet-500/30 text-violet-600 hover:bg-violet-500/10 hover:border-violet-500/50 transition-all"
            >
              <Plus size={10} />
              Recommend this to Compicfy
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────

interface Props {
  initialQuery: string
  isPro:        boolean
}

export function SearchPageClient({ initialQuery, isPro }: Props) {
  const router = useRouter()

  const [query,           setQuery]           = useState(initialQuery)
  const [inputValue,      setInputValue]      = useState(initialQuery)
  const [dbResults,       setDbResults]       = useState<DBResult[]>([])
  const [externalResults, setExternalResults] = useState<ExternalResult[]>([])
  const [loadingDB,       setLoadingDB]       = useState(false)
  const [loadingExternal, setLoadingExternal] = useState(false)
  const [hasSearched,     setHasSearched]     = useState(!!initialQuery)
  const [suggestions,     setSuggestions]     = useState<DBResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeTab,       setActiveTab]       = useState<'all' | 'compicfy' | 'web'>('all')

  const inputRef        = useRef<HTMLInputElement>(null)
  const debounceRef     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suggDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef    = useRef<HTMLDivElement>(null)

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Run search on initial query
  useEffect(() => {
    if (initialQuery.trim().length >= 2) runSearch(initialQuery)
  }, [])

  // Live suggestions (DB only, fast)
  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return }
    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=5`)
      const data = await res.json()
      setSuggestions(data.results ?? [])
      setShowSuggestions(true)
    } catch {
      setSuggestions([])
    }
  }, [])

  // Full search (DB + external)
  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (trimmed.length < 2) return

    setShowSuggestions(false)
    setHasSearched(true)
    setQuery(trimmed)

    // Update URL without navigation
    const url = new URL(window.location.href)
    url.searchParams.set('q', trimmed)
    window.history.replaceState({}, '', url.toString())

    // DB search — fast
    setLoadingDB(true)
    fetch(`/api/search?q=${encodeURIComponent(trimmed)}&limit=20`)
      .then(r => r.json())
      .then(d => setDbResults(d.results ?? []))
      .catch(() => setDbResults([]))
      .finally(() => setLoadingDB(false))

    // External search — slower
    setLoadingExternal(true)
    fetch(`/api/manga-search?q=${encodeURIComponent(trimmed)}`)
      .then(r => r.json())
      .then(d => setExternalResults(d.results ?? []))
      .catch(() => setExternalResults([]))
      .finally(() => setLoadingExternal(false))
  }, [])

  const handleInputChange = (value: string) => {
    setInputValue(value)
    // Live suggestions
    if (suggDebounceRef.current) clearTimeout(suggDebounceRef.current)
    suggDebounceRef.current = setTimeout(() => fetchSuggestions(value), 200)
  }

  const handleSearch = () => {
    if (inputValue.trim().length < 2) return
    runSearch(inputValue)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
    if (e.key === 'Escape') setShowSuggestions(false)
  }

  const handleSuggestionClick = (result: DBResult) => {
    setShowSuggestions(false)
    router.push(`/comic/${result.id}`)
  }

  const handleClear = () => {
    setInputValue('')
    setQuery('')
    setDbResults([])
    setExternalResults([])
    setHasSearched(false)
    setSuggestions([])
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  // Deduplicate external results against DB results
  const dbTitles = new Set(dbResults.map(r => r.title.toLowerCase().trim()))
  const filteredExternal = externalResults.filter(
    r => !dbTitles.has(r.title.toLowerCase().trim())
  )

  const totalResults = dbResults.length + filteredExternal.length
  const isLoading    = loadingDB || loadingExternal

  return (
    <div className="min-h-[calc(100vh-56px)] bg-background">

      {/* ── Search hero — only shown before first search ── */}
      {!hasSearched && (
        <div className="flex flex-col items-center justify-center pt-24 pb-12 px-4 text-center space-y-4">
          <div className="space-y-2">
           
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight">
              Find your next obsession...
            </h1>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Search across Compicfy, MyAnimeList, MangaDex, AniList and MangaUpdates in one go.
            </p>
          </div>
        </div>
      )}

      {/* ── Search bar ── */}
      <div className={cn(
        'sticky top-14 z-30 px-3 sm:px-4 py-3 bg-background/95 backdrop-blur-sm border-b border-border transition-all',
        !hasSearched && 'static border-0 bg-transparent backdrop-blur-none pb-8'
      )}>
        <div className="max-w-2xl mx-auto w-full" ref={containerRef}>
          <div className="relative w-full">
            <div className={cn(
              'flex items-center gap-2 sm:gap-3 rounded-2xl border bg-card transition-all w-full min-w-0',
              hasSearched
                ? 'px-3 sm:px-4 py-2.5 border-border shadow-sm'
                : 'px-4 sm:px-5 py-4 border-primary/20 shadow-xl shadow-primary/10'
            )}>
              <Search
                size={hasSearched ? 15 : 18}
                className="text-muted-foreground shrink-0 transition-all"
              />
              <input
                ref={inputRef}
                value={inputValue}
                onChange={e => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Search manga, manhwa…"
                className={cn(
                  'flex-1 bg-transparent outline-none placeholder:text-muted-foreground text-foreground min-w-0 w-0',
                  hasSearched ? 'text-sm' : 'text-base'
                )}
                autoFocus={!initialQuery}
              />
              {isLoading && (
                <Loader2 size={14} className="animate-spin text-muted-foreground shrink-0" />
              )}
              {inputValue && !isLoading && (
                <button onClick={handleClear} className="text-muted-foreground hover:text-foreground transition-colors p-1 shrink-0">
                  <X size={14} />
                </button>
              )}
              <Button
                onClick={handleSearch}
                disabled={inputValue.trim().length < 2}
                size="sm"
                className="shrink-0 h-8 px-4 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0 font-bold"
              >
                Search
              </Button>
            </div>

            {/* Live suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl border border-border bg-card shadow-2xl shadow-black/20 overflow-hidden z-50">
                <div className="py-1.5">
                  {suggestions.map((s, i) => {
                    const typeColor = TYPE_COLORS[s.type] ?? TYPE_COLORS.other
                    return (
                      <button
                        key={s.id}
                        onClick={() => handleSuggestionClick(s)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors text-left"
                      >
                        <div className="w-7 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                          {s.cover_url ? (
                            <img src={s.cover_url} alt={s.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <BookOpen size={10} className="text-muted-foreground opacity-40" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{s.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize border', typeColor)}>
                              {s.type}
                            </span>
                            {s.author && (
                              <span className="text-[10px] text-muted-foreground truncate">{s.author}</span>
                            )}
                          </div>
                        </div>
                        <ArrowRight size={11} className="text-muted-foreground/30 shrink-0" />
                      </button>
                    )
                  })}
                  {/* Search all option */}
                  <button
                    onClick={handleSearch}
                    className="w-full flex items-center gap-3 px-4 py-2.5 border-t border-border hover:bg-primary/5 transition-colors text-left mt-1"
                  >
                    <div className="w-7 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Search size={10} className="text-primary" />
                    </div>
                    <p className="text-sm font-semibold text-primary">
                      Search all sources for "{inputValue}"
                    </p>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick links — only before first search */}
          {!hasSearched && (
            <div className="mt-6 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">
                Quick browse
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_LINKS.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Results ── */}
      {hasSearched && (
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

          {/* Result count + tabs */}
          {!isLoading && totalResults > 0 && (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-black text-foreground">{totalResults}</span> results for{' '}
                <span className="font-semibold">"{query}"</span>
              </p>
              <div className="flex gap-1">
                {[
                  { key: 'all',      label: 'All',      count: totalResults          },
                  { key: 'compicfy', label: 'Compicfy', count: dbResults.length      },
                  { key: 'web',      label: 'Web',      count: filteredExternal.length },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as typeof activeTab)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-bold border transition-all',
                      activeTab === tab.key
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    )}
                  >
                    {tab.label} {tab.count > 0 && `(${tab.count})`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* DB results */}
          {(activeTab === 'all' || activeTab === 'compicfy') && (
            <div className="space-y-3">
              {(activeTab === 'all' || activeTab === 'compicfy') && dbResults.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center">
                    <Database size={10} className="text-primary" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    In Compicfy
                  </p>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}
              {loadingDB ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-28 rounded-2xl bg-muted/40 animate-pulse" />
                  ))}
                </div>
              ) : dbResults.length > 0 ? (
                <div className="space-y-2">
                  {dbResults.map(r => <DBCard key={r.id} result={r} />)}
                </div>
              ) : hasSearched && !loadingDB && activeTab === 'compicfy' ? (
                <div className="text-center py-10 rounded-2xl border border-dashed border-border space-y-2">
                  <Database size={24} className="text-muted-foreground/30 mx-auto" />
                  <p className="text-sm font-semibold">Not in Compicfy yet</p>
                  <p className="text-xs text-muted-foreground">Check the Web tab to find it and add it</p>
                </div>
              ) : null}
            </div>
          )}

          {/* External results */}
          {(activeTab === 'all' || activeTab === 'web') && (
            <div className="space-y-3">
              {filteredExternal.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-violet-500/10 flex items-center justify-center">
                    <Globe size={10} className="text-violet-500" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                    From the web
                  </p>
                  <div className="flex-1 h-px bg-border" />
                  {loadingExternal && (
                    <Loader2 size={11} className="animate-spin text-muted-foreground" />
                  )}
                </div>
              )}

              {loadingExternal && filteredExternal.length === 0 ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-28 rounded-2xl bg-muted/40 animate-pulse" />
                  ))}
                </div>
              ) : filteredExternal.length > 0 ? (
                <div className="space-y-2">
                  {filteredExternal.map(r => (
                    <ExternalCard key={r.id} result={r} isPro={isPro} />
                  ))}
                </div>
              ) : !loadingExternal && activeTab === 'web' ? (
                <div className="text-center py-10 rounded-2xl border border-dashed border-border space-y-2">
                  <Globe size={24} className="text-muted-foreground/30 mx-auto" />
                  <p className="text-sm font-semibold">Nothing found on the web either</p>
                  <p className="text-xs text-muted-foreground">Try a different title or spelling</p>
                </div>
              ) : null}
            </div>
          )}

          {/* Zero results state */}
          {!isLoading && totalResults === 0 && (
            <div className="text-center py-20 space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
                <Search size={24} className="text-muted-foreground opacity-30" />
              </div>
              <div>
                <p className="font-black text-lg">Nothing found for "{query}"</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try a different spelling, or check the original title
                </p>
              </div>
              <div className="flex gap-3 justify-center flex-wrap pt-2">
                <Link href="/browse">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Radar size={13} />
                    Browse all comics
                  </Button>
                </Link>
                <Link href={isPro ? '/pro/recommendations/new' : '/dashboard/recommendations/new'}>
                  <Button size="sm" className="gap-1.5 bg-gradient-to-r from-primary to-violet-500 border-0 hover:opacity-90">
                    <BookOpen size={13} />
                    Add it yourself
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}